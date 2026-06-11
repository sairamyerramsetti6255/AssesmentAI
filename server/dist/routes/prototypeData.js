/**
 * Prototype data routes — Supabase-backed CRUD for:
 *   leads, platform_users, prototype_questions,
 *   mandatory_questions, master_data, activity_log
 *
 * All mounted under /api/proto/* in index.ts
 */
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireSupabase } from '../lib/supabase.js';
import { demoDocumentContent, readLeadDocumentFile, saveLeadDocumentFile } from '../lib/documentStore.js';
import { getClientResponseRows, syncClientResponseRows } from '../lib/clientResponses.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
// ── helpers ──────────────────────────────────────────────────────────────────
function sb() { return requireSupabase(); }
const OPTIONAL_LEAD_COLUMNS = [
    'document_records',
    'client_document_records',
    'proposal_use_cases',
    'proposal_architecture',
    'proposal_summary',
    'proposal_next_steps',
    'proposal_document',
    'client_assessment_started_at',
    'client_assessment_submitted_at',
    'client_assessment_updated_at',
    'client_email',
    'client_phone',
    'available_time',
    'intake_remarks',
    'lead_status',
    'lead_type',
];
function formatError(e) {
    if (e instanceof Error)
        return e.message;
    if (e && typeof e === 'object' && 'message' in e) {
        return String(e.message);
    }
    return String(e);
}
function err(res, e, status = 500) {
    const msg = formatError(e);
    console.error('[prototypeData]', e);
    return res.status(status).json({ error: msg });
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(id) {
    return typeof id === 'string' && UUID_RE.test(id);
}
/** Insert lead — retries without optional JSONB columns if migrations 004/005 not applied yet */
async function insertLeadRow(row) {
    let payload = { ...row };
    for (let attempt = 0; attempt < OPTIONAL_LEAD_COLUMNS.length + 1; attempt++) {
        const { data, error } = await sb().from('leads').insert(payload).select().single();
        if (!error)
            return data;
        if (error.code === 'PGRST204') {
            const missing = OPTIONAL_LEAD_COLUMNS.find((col) => error.message.includes(col));
            if (missing && missing in payload) {
                const next = { ...payload };
                delete next[missing];
                payload = next;
                continue;
            }
        }
        throw error;
    }
    throw new Error('Failed to insert lead');
}
async function updateLeadRow(id, patch) {
    let payload = { ...patch };
    for (let attempt = 0; attempt < OPTIONAL_LEAD_COLUMNS.length + 1; attempt++) {
        const { data, error } = await sb().from('leads').update(payload).eq('id', id).select().single();
        if (!error)
            return data;
        if (error.code === 'PGRST204') {
            const missing = OPTIONAL_LEAD_COLUMNS.find((col) => error.message.includes(col));
            if (missing && missing in payload) {
                const next = { ...payload };
                delete next[missing];
                payload = next;
                continue;
            }
        }
        throw error;
    }
    throw new Error('Failed to update lead');
}
// ═══════════════════════════════════════════════════════════════════════════
// AUTH (simple password check against platform_users — no Supabase auth)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password required' });
        const { data, error } = await sb()
            .from('platform_users')
            .select('*')
            .eq('email', email.trim().toLowerCase())
            .eq('password', password)
            .single();
        if (error) {
            console.error('[auth/login] Supabase error:', error.message);
            if (error.code === 'PGRST116') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            return res.status(503).json({
                error: 'Database unavailable. Run Supabase migrations (003_prototype_schema.sql) and check SUPABASE_* env vars.',
            });
        }
        if (!data)
            return res.status(401).json({ error: 'Invalid credentials' });
        // Update last_login
        await sb().from('platform_users').update({ last_login: new Date().toISOString() }).eq('id', data.id);
        // Simple token = base64(userId:timestamp)
        const token = Buffer.from(`${data.id}:${Date.now()}`).toString('base64');
        res.json({
            token,
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                lastLogin: new Date().toISOString(),
            },
        });
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/auth/me', async (req, res) => {
    try {
        const userId = decodeToken(req);
        if (!userId)
            return res.status(401).json({ error: 'Missing or invalid token' });
        const { data, error } = await sb()
            .from('platform_users')
            .select('id,name,email,role,last_login')
            .eq('id', userId)
            .single();
        if (error || !data)
            return res.status(401).json({ error: 'User not found' });
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
function decodeToken(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return null;
    try {
        const decoded = Buffer.from(auth.slice(7), 'base64').toString('utf-8');
        return decoded.split(':')[0] || null;
    }
    catch {
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM USERS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/users', async (_req, res) => {
    try {
        const { data, error } = await sb()
            .from('platform_users')
            .select('id,name,email,role,last_login,created_at')
            .order('created_at');
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (e) {
        err(res, e);
    }
});
router.post('/users', async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        if (!name || !email)
            return res.status(400).json({ error: 'name and email required' });
        const { data, error } = await sb()
            .from('platform_users')
            .insert({ id: uuidv4(), name, email: email.trim().toLowerCase(), role: role ?? 'account_executive', password: password ?? 'changeme123' })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const patch = {};
        if (name)
            patch.name = name;
        if (email)
            patch.email = email.trim().toLowerCase();
        if (role)
            patch.role = role;
        if (password)
            patch.password = password;
        const { data, error } = await sb()
            .from('platform_users')
            .update(patch)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.delete('/users/:id', async (req, res) => {
    try {
        const { error } = await sb().from('platform_users').delete().eq('id', req.params.id);
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (e) {
        err(res, e);
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/leads', async (_req, res) => {
    try {
        const { data, error } = await sb()
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/leads/:id', async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('leads')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error)
            throw error;
        if (!data)
            return res.status(404).json({ error: 'Not found' });
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.post('/leads', async (req, res) => {
    try {
        const { company_name, industry, domain, country, assigned_executive, documents, document_records, client_email, client_phone, available_time, intake_remarks, lead_status, lead_type, } = req.body;
        if (!company_name || !industry || !domain) {
            return res.status(400).json({ error: 'company_name, industry, domain required' });
        }
        const today = new Date().toISOString().slice(0, 10);
        const initialRemarks = intake_remarks?.trim()
            ? [intake_remarks.trim()]
            : [];
        const data = await insertLeadRow({
            id: uuidv4(),
            company_name,
            industry,
            domain,
            country: country ?? '',
            assigned_executive: assigned_executive ?? '',
            client_email: client_email ?? '',
            client_phone: client_phone ?? '',
            available_time: available_time ?? '',
            intake_remarks: intake_remarks ?? '',
            lead_status: lead_status ?? 'new',
            lead_type: lead_type ?? 'inbound',
            funnel_status: 'intake',
            assessment_status: 'draft',
            research_progress: 0,
            documents: documents ?? [],
            document_records: document_records ?? [],
            remarks: initialRemarks,
            last_interaction: today,
        });
        res.status(201).json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.put('/leads/:id', async (req, res) => {
    try {
        const patch = {
            ...req.body,
            updated_at: new Date().toISOString(),
            last_interaction: new Date().toISOString().slice(0, 10),
        };
        const { data, error } = await sb()
            .from('leads')
            .update(patch)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.delete('/leads/:id', async (req, res) => {
    try {
        const { error } = await sb().from('leads').delete().eq('id', req.params.id);
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (e) {
        err(res, e);
    }
});
// ── approve lead → generate portal token ─────────────────────────────────
router.post('/leads/:id/approve', async (req, res) => {
    try {
        const lead = await getLead(String(req.params.id));
        if (!lead)
            return res.status(404).json({ error: 'Not found' });
        const token = lead.portal_token
            ?? `${lead.domain.split('.')[0]}-${uuidv4().slice(0, 6)}`;
        const { data, error } = await sb()
            .from('leads')
            .update({
            assessment_status: 'approved',
            funnel_status: 'client_portal',
            portal_token: token,
            updated_at: new Date().toISOString(),
        })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
// ── reset assessment (delete questions + client responses, back to draft) ─
router.post('/leads/:id/reset-assessment', async (req, res) => {
    try {
        const leadId = String(req.params.id);
        const lead = await getLead(leadId);
        if (!lead)
            return res.status(404).json({ error: 'Not found' });
        await sb().from('prototype_questions').delete().eq('lead_id', leadId);
        await sb().from('prototype_client_responses').delete().eq('lead_id', leadId);
        const { data, error } = await sb()
            .from('leads')
            .update({
            assessment_status: 'draft',
            portal_token: null,
            client_progress: 0,
            client_answers: null,
            client_richtext: null,
            client_other_text: null,
            client_uploaded_docs: null,
            client_document_records: null,
            client_assessment_started_at: null,
            client_assessment_submitted_at: null,
            client_assessment_updated_at: null,
            assessment_taxonomy: null,
            funnel_status: 'review',
            updated_at: new Date().toISOString(),
            last_interaction: new Date().toISOString().slice(0, 10),
        })
            .eq('id', leadId)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
// ── save client answers ───────────────────────────────────────────────────
router.put('/leads/:id/proposal', async (req, res) => {
    try {
        const { use_cases, architecture, summary, next_steps, proposal_document } = req.body;
        const patch = {
            updated_at: new Date().toISOString(),
            last_interaction: new Date().toISOString().slice(0, 10),
        };
        if (use_cases !== undefined)
            patch.proposal_use_cases = use_cases;
        if (architecture !== undefined)
            patch.proposal_architecture = architecture;
        if (summary !== undefined)
            patch.proposal_summary = summary;
        if (next_steps !== undefined)
            patch.proposal_next_steps = next_steps;
        if (proposal_document !== undefined)
            patch.proposal_document = proposal_document;
        const { data, error } = await sb()
            .from('leads')
            .update(patch)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.put('/leads/:id/client-responses', async (req, res) => {
    try {
        const lead = await getLead(String(req.params.id));
        if (!lead)
            return res.status(404).json({ error: 'Not found' });
        const { answers, richtext, other_text, uploaded_docs, progress, submitted } = req.body;
        const patch = {
            updated_at: new Date().toISOString(),
            last_interaction: new Date().toISOString().slice(0, 10),
        };
        if (answers !== undefined)
            patch.client_answers = answers;
        if (richtext !== undefined)
            patch.client_richtext = richtext;
        if (other_text !== undefined)
            patch.client_other_text = other_text;
        if (uploaded_docs !== undefined) {
            patch.client_uploaded_docs = Array.isArray(uploaded_docs)
                ? uploaded_docs.map((d) => (typeof d === 'string' ? d : d.name))
                : uploaded_docs;
        }
        if (req.body.client_document_records !== undefined) {
            patch.client_document_records = req.body.client_document_records;
        }
        if (progress !== undefined)
            patch.client_progress = progress;
        const { data, error } = await sb()
            .from('leads')
            .update(patch)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        await syncClientResponseRows({
            leadId: String(req.params.id),
            answers,
            richtext,
            otherText: other_text,
            progress,
            submitted: submitted === true,
            existingStartedAt: lead.client_assessment_started_at,
        });
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/leads/:leadId/client-responses', async (req, res) => {
    try {
        const lead = await getLead(String(req.params.leadId));
        if (!lead)
            return res.status(404).json({ error: 'Not found' });
        const rows = await getClientResponseRows(String(req.params.leadId));
        res.json({
            lead_id: req.params.leadId,
            company_name: lead.company_name,
            client_progress: lead.client_progress,
            assessment_started_at: lead.client_assessment_started_at ?? null,
            assessment_submitted_at: lead.client_assessment_submitted_at ?? null,
            assessment_updated_at: lead.client_assessment_updated_at ?? null,
            responses: rows,
        });
    }
    catch (e) {
        err(res, e);
    }
});
// ── remarks ───────────────────────────────────────────────────────────────
router.post('/leads/:id/remarks', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim())
            return res.status(400).json({ error: 'text required' });
        const lead = await getLead(String(req.params.id));
        if (!lead)
            return res.status(404).json({ error: 'Not found' });
        const remarks = [...(lead.remarks ?? []), text.trim()];
        const { data, error } = await sb()
            .from('leads')
            .update({ remarks, updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
// ── documents (upload / download) ─────────────────────────────────────────
router.post('/leads/:id/documents', upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'file required' });
        const lead = await getLead(String(req.params.id));
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        const meta = JSON.parse(String(req.body.meta ?? '{}'));
        const docId = uuidv4();
        const storagePath = saveLeadDocumentFile(String(req.params.id), docId, req.file.originalname, req.file.buffer);
        const record = {
            id: docId,
            name: req.file.originalname,
            match_status: meta.match_status ?? 'unmatched',
            transaction_date: meta.transaction_date ?? new Date().toISOString().slice(0, 10),
            uploaded_at: new Date().toISOString(),
            source: meta.source ?? 'intake',
            storage_path: storagePath,
            has_file: true,
        };
        const field = record.source === 'client' ? 'client_document_records' : 'document_records';
        const existing = (lead[field] ?? []);
        const names = [...(lead.documents ?? []), record.name];
        const clientNames = record.source === 'client'
            ? [...(lead.client_uploaded_docs ?? []), record.name]
            : lead.client_uploaded_docs ?? [];
        const patch = {
            [field]: [...existing, record],
            documents: names,
            updated_at: new Date().toISOString(),
            last_interaction: new Date().toISOString().slice(0, 10),
        };
        if (record.source === 'client')
            patch.client_uploaded_docs = clientNames;
        const { data, error } = await sb()
            .from('leads')
            .update(patch)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ document: record, lead: data });
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/leads/:leadId/documents/:docId/file', async (req, res) => {
    try {
        const lead = await getLead(String(req.params.leadId));
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        const doc = findDocumentRecord(lead, String(req.params.docId));
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        const buffer = doc.storage_path
            ? readLeadDocumentFile(doc.storage_path)
            : null;
        res.setHeader('Content-Disposition', `attachment; filename="${doc.name.replace(/"/g, '')}"`);
        if (buffer) {
            res.setHeader('Content-Type', 'application/octet-stream');
            return res.send(buffer);
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(demoDocumentContent(doc.name, doc.transaction_date));
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/portal/:token/documents/:docId/file', async (req, res) => {
    try {
        const { data: lead, error } = await sb()
            .from('leads')
            .select('*')
            .eq('portal_token', req.params.token)
            .single();
        if (error || !lead)
            return res.status(404).json({ error: 'Invalid portal link' });
        const doc = findDocumentRecord(lead, String(req.params.docId));
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        const buffer = doc.storage_path ? readLeadDocumentFile(doc.storage_path) : null;
        res.setHeader('Content-Disposition', `attachment; filename="${doc.name.replace(/"/g, '')}"`);
        if (buffer) {
            res.setHeader('Content-Type', 'application/octet-stream');
            return res.send(buffer);
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(demoDocumentContent(doc.name, doc.transaction_date));
    }
    catch (e) {
        err(res, e);
    }
});
// ── portal ────────────────────────────────────────────────────────────────
router.put('/portal/:token/client-responses', async (req, res) => {
    try {
        const lead = await getLeadByPortalToken(String(req.params.token));
        if (!lead)
            return res.status(404).json({ error: 'Invalid or expired link' });
        const { answers, richtext, other_text, uploaded_docs, client_document_records, progress, submitted } = req.body;
        const patch = {
            updated_at: new Date().toISOString(),
            last_interaction: new Date().toISOString().slice(0, 10),
        };
        if (answers !== undefined)
            patch.client_answers = answers;
        if (richtext !== undefined)
            patch.client_richtext = richtext;
        if (other_text !== undefined)
            patch.client_other_text = other_text;
        if (uploaded_docs !== undefined)
            patch.client_uploaded_docs = uploaded_docs;
        if (client_document_records !== undefined)
            patch.client_document_records = client_document_records;
        if (progress !== undefined)
            patch.client_progress = progress;
        const { data, error } = await sb()
            .from('leads')
            .update(patch)
            .eq('id', lead.id)
            .select()
            .single();
        if (error)
            throw error;
        await syncClientResponseRows({
            leadId: lead.id,
            answers,
            richtext,
            otherText: other_text,
            progress,
            submitted: submitted === true,
            existingStartedAt: lead.client_assessment_started_at,
        });
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/portal/:token', async (req, res) => {
    try {
        const lead = await getLeadByPortalToken(String(req.params.token));
        if (!lead)
            return res.status(404).json({ error: 'Invalid or expired link' });
        const { data: questions } = await sb()
            .from('prototype_questions')
            .select('*')
            .eq('lead_id', lead.id)
            .order('sort_order');
        res.json({ lead, questions: questions ?? [] });
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/analytics/driver-heatmap', async (_req, res) => {
    try {
        const { data, error } = await sb().from('prototype_questions').select('category');
        if (error)
            throw error;
        const counts = {};
        for (const row of data ?? []) {
            const cat = String(row.category ?? 'Unknown');
            counts[cat] = (counts[cat] ?? 0) + 1;
        }
        const heatmap = Object.entries(counts)
            .map(([driver, count]) => ({ driver, count }))
            .sort((a, b) => b.count - a.count);
        res.json(heatmap);
    }
    catch (e) {
        err(res, e);
    }
});
router.get('/analytics/summary', async (_req, res) => {
    try {
        const { data: leads, error } = await sb().from('leads').select('created_at,last_interaction,client_progress,funnel_status');
        if (error)
            throw error;
        const rows = leads ?? [];
        const completed = rows.filter((l) => l.client_progress === 100);
        let avgVelocityDays = 0;
        if (completed.length > 0) {
            const total = completed.reduce((sum, l) => {
                const created = new Date(String(l.created_at)).getTime();
                const last = new Date(String(l.last_interaction)).getTime();
                return sum + Math.max(1, Math.round((last - created) / 86_400_000));
            }, 0);
            avgVelocityDays = Math.round(total / completed.length);
        }
        res.json({
            avg_velocity_days: avgVelocityDays,
            active_pipeline: rows.filter((l) => !['converted', 'lost'].includes(String(l.funnel_status))).length,
            portal_live: rows.filter((l) => l.funnel_status === 'client_portal').length,
        });
    }
    catch (e) {
        err(res, e);
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// PROTOTYPE QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/leads/:leadId/questions', async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('prototype_questions')
            .select('*')
            .eq('lead_id', req.params.leadId)
            .order('sort_order');
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (e) {
        err(res, e);
    }
});
router.put('/leads/:leadId/questions', async (req, res) => {
    /** Full replace — delete existing, insert all */
    try {
        const questions = req.body;
        if (!Array.isArray(questions))
            return res.status(400).json({ error: 'array expected' });
        await sb().from('prototype_questions').delete().eq('lead_id', req.params.leadId);
        if (questions.length > 0) {
            const rows = questions.map((q, i) => ({
                id: isValidUuid(q.id) ? q.id : uuidv4(),
                lead_id: req.params.leadId,
                sort_order: typeof q.sort_order === 'number' ? q.sort_order : i,
                taxonomy_pillar: q.taxonomy_pillar ?? q.taxonomyPillar ?? 'Technical Pain Points',
                domain_context: q.domain_context ?? q.domainContext ?? '',
                category: q.category ?? 'Technology Stack',
                text: q.text ?? '',
                type: q.type ?? 'singlechoice',
                options: q.options ?? [],
                suggested_options: q.suggested_options ?? q.suggestedOptions ?? [],
                is_mandatory: q.is_mandatory ?? q.isMandatory ?? false,
            }));
            const { error } = await sb().from('prototype_questions').insert(rows);
            if (error)
                throw error;
        }
        const { data } = await sb()
            .from('prototype_questions')
            .select('*')
            .eq('lead_id', req.params.leadId)
            .order('sort_order');
        res.json(data ?? []);
    }
    catch (e) {
        err(res, e);
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// MANDATORY QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════
router.get('/mandatory-questions', async (_req, res) => {
    try {
        const { data, error } = await sb()
            .from('mandatory_questions')
            .select('*')
            .order('sort_order');
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (e) {
        err(res, e);
    }
});
router.post('/mandatory-questions', async (req, res) => {
    try {
        const { text, type, options } = req.body;
        if (!text?.trim())
            return res.status(400).json({ error: 'text required' });
        const { data: existing } = await sb()
            .from('mandatory_questions').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
        const { data, error } = await sb()
            .from('mandatory_questions')
            .insert({ id: uuidv4(), text: text.trim(), type: type ?? 'singlechoice', options: options ?? [], sort_order: nextOrder })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.put('/mandatory-questions/:id', async (req, res) => {
    try {
        const { text, type, options } = req.body;
        const patch = {};
        if (text)
            patch.text = text;
        if (type)
            patch.type = type;
        if (options)
            patch.options = options;
        const { data, error } = await sb()
            .from('mandatory_questions')
            .update(patch)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.delete('/mandatory-questions/:id', async (req, res) => {
    try {
        const { error } = await sb().from('mandatory_questions').delete().eq('id', req.params.id);
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (e) {
        err(res, e);
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════════════════
router.get('/master-data', async (_req, res) => {
    try {
        const { data, error } = await sb()
            .from('master_data')
            .select('category,name')
            .order('category')
            .order('name');
        if (error)
            throw error;
        // Group by category
        const grouped = {};
        for (const row of data ?? []) {
            if (!grouped[row.category])
                grouped[row.category] = [];
            grouped[row.category].push(row.name);
        }
        res.json(grouped);
    }
    catch (e) {
        err(res, e);
    }
});
router.post('/master-data/:category', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'name required' });
        const { data, error } = await sb()
            .from('master_data')
            .insert({ id: uuidv4(), category: req.params.category, name: name.trim() })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.put('/master-data/:category/:oldName', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'name required' });
        const { data, error } = await sb()
            .from('master_data')
            .update({ name: name.trim() })
            .eq('category', req.params.category)
            .eq('name', decodeURIComponent(String(req.params.oldName)))
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        err(res, e);
    }
});
router.delete('/master-data/:category/:name', async (req, res) => {
    try {
        const { error } = await sb()
            .from('master_data')
            .delete()
            .eq('category', req.params.category)
            .eq('name', decodeURIComponent(String(req.params.name)));
        if (error)
            throw error;
        res.json({ ok: true });
    }
    catch (e) {
        err(res, e);
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════════════════
router.get('/activity-log', async (req, res) => {
    try {
        let q = sb()
            .from('activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (req.query.lead_id)
            q = q.eq('lead_id', req.query.lead_id);
        const { data, error } = await q;
        if (error)
            throw error;
        res.json(data ?? []);
    }
    catch (e) {
        err(res, e);
    }
});
router.post('/activity-log', async (req, res) => {
    try {
        const { kind, actor_name, actor_role, summary, lead_id, company_name } = req.body;
        if (!kind || !summary)
            return res.status(400).json({ error: 'kind and summary required' });
        const { data, error } = await sb()
            .from('activity_log')
            .insert({
            id: uuidv4(),
            kind,
            actor_name: actor_name ?? 'System',
            actor_role: actor_role ?? 'account_executive',
            summary,
            lead_id: lead_id ?? null,
            company_name: company_name ?? null,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (e) {
        err(res, e);
    }
});
// ── internal helper ───────────────────────────────────────────────────────
async function getLead(id) {
    const { data } = await sb().from('leads').select('*').eq('id', id).single();
    return data;
}
async function getLeadByPortalToken(token) {
    const { data } = await sb().from('leads').select('*').eq('portal_token', token).single();
    return data;
}
function findDocumentRecord(lead, docId) {
    const intake = lead.document_records ?? [];
    const client = lead.client_document_records ?? [];
    const all = [...intake, ...client];
    if (all.length)
        return all.find((d) => d.id === docId) ?? null;
    const legacy = [
        ...(lead.documents ?? []).map((name, i) => ({
            id: `demo-doc-intake-${i}-${String(name).replace(/\W+/g, '-')}`,
            name,
            match_status: (i % 2 === 0 ? 'matched' : 'unmatched'),
            transaction_date: new Date().toISOString().slice(0, 10),
            uploaded_at: new Date().toISOString(),
            source: 'intake',
        })),
        ...(lead.client_uploaded_docs ?? []).map((name, i) => ({
            id: `demo-doc-client-${i}-${String(name).replace(/\W+/g, '-')}`,
            name,
            match_status: (i % 2 === 1 ? 'matched' : 'unmatched'),
            transaction_date: new Date().toISOString().slice(0, 10),
            uploaded_at: new Date().toISOString(),
            source: 'client',
        })),
    ];
    return legacy.find((d) => d.id === docId) ?? null;
}
export default router;
