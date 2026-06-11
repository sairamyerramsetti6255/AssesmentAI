import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { logAudit, createNotification } from '../lib/audit.js';
import { generateResearchNotes } from '../lib/assessmentAi.js';
import { isGeminiConfigured } from '../lib/gemini.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { buildDemoPackage } from '../lib/demoPackage.js';
const router = Router();
router.use(authMiddleware);
function parseBusinessDomains(client) {
    if (client.business_domains?.length)
        return client.business_domains;
    if (!client.domain)
        return [];
    try {
        const parsed = JSON.parse(client.domain);
        if (Array.isArray(parsed))
            return parsed;
    }
    catch { /* legacy string */ }
    return client.domain.split(',').map((s) => s.trim()).filter(Boolean);
}
function enrichAssessment(assessment) {
    const client = demoStore.clients.find((c) => c.id === assessment.client_id);
    const rep = demoStore.users.find((u) => u.id === assessment.assigned_rep_id);
    const creator = demoStore.users.find((u) => u.id === assessment.created_by);
    const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);
    return {
        ...assessment,
        current_step: assessment.current_step ?? 1,
        completed_steps: assessment.completed_steps ?? [],
        client: client ? {
            ...client,
            business_domains: parseBusinessDomains(client),
            industry_name: industry?.name,
        } : null,
        assigned_rep: rep ? { id: rep.id, full_name: rep.full_name, email: rep.email } : null,
        created_by_user: creator ? { id: creator.id, full_name: creator.full_name } : null,
    };
}
router.get('/', async (req, res) => {
    const { status, industry_id } = req.query;
    let list = [...demoStore.assessments];
    if (req.user.role_name === 'sales_rep') {
        list = list.filter((a) => a.assigned_rep_id === req.user.id);
    }
    if (status)
        list = list.filter((a) => a.status === status);
    if (industry_id) {
        list = list.filter((a) => {
            const client = demoStore.clients.find((c) => c.id === a.client_id);
            return client?.industry_id === industry_id;
        });
    }
    res.json(list.map(enrichAssessment));
});
router.get('/:id', async (req, res) => {
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (!assessment)
        return res.status(404).json({ error: 'Not found' });
    if (req.user.role_name === 'sales_rep' && assessment.assigned_rep_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(enrichAssessment(assessment));
});
router.post('/', requireRole('super_admin', 'sales_manager'), async (req, res) => {
    const { company_name, industry_id, contact_name, contact_email, contact_phone, domain, website_url, website_details, business_domains, pre_assessment_notes, pain_point_ids, research_notes, } = req.body;
    const domains = business_domains || (domain ? [domain] : []);
    const client = {
        id: uuidv4(),
        company_name,
        industry_id: industry_id || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        domain: domains.length ? domains.join(', ') : null,
        business_domains: domains,
        website_url: website_url || null,
        website_details: website_details || null,
        country_of_operation: req.body.country_of_operation || null,
    };
    demoStore.clients.push(client);
    const benchmark = demoStore.masters.benchmarks.find((b) => b.industry_id === industry_id);
    const assessment = {
        id: uuidv4(),
        client_id: client.id,
        status: 'draft',
        assigned_rep_id: null,
        created_by: req.user.id,
        pre_assessment_notes: pre_assessment_notes || research_notes || null,
        pain_point_ids: pain_point_ids || [],
        industry_benchmark_snapshot: benchmark ? { percentage: benchmark.percentage, avg_driver_scores: benchmark.avg_driver_scores } : null,
        current_step: 1,
        completed_steps: company_name ? [1] : [],
        portal_token: null,
        approved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    demoStore.assessments.push(assessment);
    await logAudit(req.user.id, 'create_assessment', 'assessment', assessment.id);
    res.status(201).json(enrichAssessment(assessment));
});
function applyClientFields(assessment, fields) {
    const client = demoStore.clients.find((c) => c.id === assessment.client_id);
    if (!client)
        return;
    const clientFields = ['company_name', 'industry_id', 'contact_name', 'contact_email', 'contact_phone', 'domain', 'website_url', 'website_details', 'business_domains', 'country_of_operation'];
    for (const field of clientFields) {
        if (fields[field] !== undefined) {
            Object.assign(client, { [field]: fields[field] });
        }
    }
    if (fields.business_domains !== undefined) {
        client.business_domains = fields.business_domains;
        client.domain = fields.business_domains.join(', ');
    }
}
router.post('/:id/generate-research', requireRole('super_admin', 'sales_manager'), async (req, res) => {
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (!assessment)
        return res.status(404).json({ error: 'Not found' });
    if (req.body && typeof req.body === 'object') {
        applyClientFields(assessment, req.body);
        assessment.updated_at = new Date().toISOString();
    }
    try {
        const result = await generateResearchNotes(assessment.id);
        assessment.pre_assessment_notes = result.research_notes;
        assessment.pain_point_ids = result.suggested_pain_points
            .map((name) => demoStore.masters.painPoints.find((p) => p.category_name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id) => Boolean(id));
        if (assessment.status === 'draft')
            assessment.status = 'pre_assessment';
        assessment.updated_at = new Date().toISOString();
        await logAudit(req.user.id, 'generate_research', 'assessment', assessment.id, { ai: isGeminiConfigured() });
        res.json({
            research_notes: result.research_notes,
            pain_point_ids: assessment.pain_point_ids,
            pre_assessment_notes: result.research_notes,
        });
    }
    catch (err) {
        console.error('Research generation failed:', err);
        const msg = err instanceof Error ? err.message : 'Failed to generate research';
        if (msg.includes('Complete Step 1'))
            return res.status(400).json({ error: msg });
        if (!isGeminiConfigured()) {
            return res.status(503).json({ error: 'Gemini API key not configured' });
        }
        return res.status(502).json({ error: msg });
    }
});
router.put('/:id', requireRole('super_admin', 'sales_manager'), async (req, res) => {
    const updates = req.body;
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (!assessment)
        return res.status(404).json({ error: 'Not found' });
    Object.assign(assessment, updates, { updated_at: new Date().toISOString() });
    const client = demoStore.clients.find((c) => c.id === assessment.client_id);
    if (client) {
        const clientFields = ['company_name', 'industry_id', 'contact_name', 'contact_email', 'contact_phone', 'domain', 'website_url', 'website_details', 'business_domains', 'country_of_operation'];
        for (const field of clientFields) {
            if (updates[field] !== undefined) {
                Object.assign(client, { [field]: updates[field] });
            }
        }
        if (updates.business_domains !== undefined) {
            client.business_domains = updates.business_domains;
            client.domain = updates.business_domains.join(', ');
        }
    }
    if (updates.pre_assessment_notes !== undefined || updates.pain_point_ids !== undefined || updates.research_notes !== undefined) {
        if (updates.research_notes)
            assessment.pre_assessment_notes = updates.research_notes;
    }
    if (updates.current_step !== undefined)
        assessment.current_step = updates.current_step;
    if (updates.completed_steps !== undefined)
        assessment.completed_steps = updates.completed_steps;
    if (updates.mark_step_complete !== undefined) {
        const step = updates.mark_step_complete;
        if (!assessment.completed_steps.includes(step)) {
            assessment.completed_steps = [...assessment.completed_steps, step].sort((a, b) => a - b);
        }
        if (assessment.status === 'draft' || assessment.status === 'client_info') {
            assessment.status = step >= 2 ? 'pre_assessment' : 'draft';
        }
    }
    if (updates.status === 'draft')
        assessment.status = 'draft';
    await logAudit(req.user.id, 'update_assessment', 'assessment', assessment.id);
    res.json(enrichAssessment(assessment));
});
router.post('/:id/approve', requireRole('super_admin', 'sales_manager'), async (req, res) => {
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (!assessment)
        return res.status(404).json({ error: 'Not found' });
    const questions = demoStore.questions.filter((q) => q.assessment_id === assessment.id && q.session_status !== 'deleted');
    const missing = questions.filter((q) => q.is_required && !q.expected_answer?.trim());
    if (questions.length === 0)
        return res.status(400).json({ error: 'Generate questions before approving' });
    if (missing.length > 0) {
        return res.status(400).json({ error: `Set benchmark answers for ${missing.length} required question(s) first` });
    }
    assessment.status = 'approved';
    assessment.approved_at = new Date().toISOString();
    assessment.portal_token = assessment.portal_token || uuidv4();
    assessment.updated_at = new Date().toISOString();
    await logAudit(req.user.id, 'approve_assessment', 'assessment', assessment.id);
    res.json({
        ...enrichAssessment(assessment),
        portal_url: `/client/${assessment.portal_token}`,
    });
});
router.post('/:id/demo-package', requireRole('super_admin', 'sales_manager'), async (req, res) => {
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (!assessment)
        return res.status(404).json({ error: 'Not found' });
    if (!['approved', 'assigned', 'in_session', 'scored', 'completed'].includes(assessment.status)) {
        return res.status(400).json({ error: 'Approve the assessment first (Step 5)' });
    }
    const pkg = buildDemoPackage(assessment.id);
    await logAudit(req.user.id, 'demo_package', 'assessment', assessment.id);
    res.json(pkg);
});
router.post('/:id/assign', requireRole('super_admin', 'sales_manager'), async (req, res) => {
    const { rep_id } = req.body;
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (!assessment)
        return res.status(404).json({ error: 'Not found' });
    if (assessment.status !== 'approved' && assessment.status !== 'assigned') {
        return res.status(400).json({ error: 'Approve the assessment (Step 5) before assigning to a rep' });
    }
    assessment.assigned_rep_id = rep_id;
    assessment.status = 'assigned';
    assessment.updated_at = new Date().toISOString();
    await createNotification(rep_id, 'Assessment Assigned', `You have been assigned a new assessment`, 'info', `/assessments/${assessment.id}`);
    await logAudit(req.user.id, 'assign_assessment', 'assessment', assessment.id, { rep_id });
    res.json(enrichAssessment(assessment));
});
export default router;
