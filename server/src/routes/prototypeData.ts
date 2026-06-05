/**
 * Prototype data routes — Supabase-backed CRUD for:
 *   leads, platform_users, prototype_questions,
 *   mandatory_questions, master_data, activity_log
 *
 * All mounted under /api/proto/* in index.ts
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireSupabase } from '../lib/supabase.js';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function sb() { return requireSupabase(); }

function err(res: Response, e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('[prototypeData]', msg);
  return res.status(status).json({ error: msg });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH (simple password check against platform_users — no Supabase auth)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const { data, error } = await sb()
      .from('platform_users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .single();

    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last_login
    await sb().from('platform_users').update({ last_login: new Date().toISOString() }).eq('id', data.id);

    // Simple token = base64(userId:timestamp)
    const token = Buffer.from(`${data.id}:${Date.now()}`).toString('base64');

    res.json({ token, user: { id: data.id, name: data.name, email: data.email, role: data.role } });
  } catch (e) { err(res, e); }
});

router.get('/auth/me', async (req: Request, res: Response) => {
  try {
    const userId = decodeToken(req);
    if (!userId) return res.status(401).json({ error: 'Missing or invalid token' });

    const { data, error } = await sb()
      .from('platform_users')
      .select('id,name,email,role,last_login')
      .eq('id', userId)
      .single();
    if (error || !data) return res.status(401).json({ error: 'User not found' });
    res.json(data);
  } catch (e) { err(res, e); }
});

function decodeToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), 'base64').toString('utf-8');
    return decoded.split(':')[0] || null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM USERS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('platform_users')
      .select('id,name,email,role,last_login,created_at')
      .order('created_at');
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e); }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const { data, error } = await sb()
      .from('platform_users')
      .insert({ id: uuidv4(), name, email: email.trim().toLowerCase(), role: role ?? 'account_executive', password: password ?? 'changeme123' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { err(res, e); }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { name, email, role, password } = req.body;
    const patch: Record<string, unknown> = {};
    if (name)  patch.name  = name;
    if (email) patch.email = email.trim().toLowerCase();
    if (role)  patch.role  = role;
    if (password) patch.password = password;
    const { data, error } = await sb()
      .from('platform_users')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await sb().from('platform_users').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { err(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/leads', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e); }
});

router.get('/leads/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) { err(res, e); }
});

router.post('/leads', async (req: Request, res: Response) => {
  try {
    const {
      company_name, industry, domain, country,
      assigned_executive, documents,
    } = req.body;
    if (!company_name || !industry || !domain) {
      return res.status(400).json({ error: 'company_name, industry, domain required' });
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb()
      .from('leads')
      .insert({
        id: uuidv4(),
        company_name,
        industry,
        domain,
        country: country ?? '',
        assigned_executive: assigned_executive ?? '',
        funnel_status: 'intake',
        assessment_status: 'draft',
        research_progress: 0,
        documents: documents ?? [],
        remarks: [],
        last_interaction: today,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { err(res, e); }
});

router.put('/leads/:id', async (req: Request, res: Response) => {
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
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

router.delete('/leads/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await sb().from('leads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { err(res, e); }
});

// ── approve lead → generate portal token ─────────────────────────────────

router.post('/leads/:id/approve', async (req: Request, res: Response) => {
  try {
    const lead = await getLead(String(req.params.id));
    if (!lead) return res.status(404).json({ error: 'Not found' });
    const token = lead.portal_token
      ?? `${(lead.domain as string).split('.')[0]}-${uuidv4().slice(0, 6)}`;
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
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

// ── save client answers ───────────────────────────────────────────────────

router.put('/leads/:id/client-responses', async (req: Request, res: Response) => {
  try {
    const { answers, richtext, other_text, uploaded_docs, progress } = req.body;
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_interaction: new Date().toISOString().slice(0, 10),
    };
    if (answers !== undefined)      patch.client_answers         = answers;
    if (richtext !== undefined)     patch.client_richtext        = richtext;
    if (other_text !== undefined)   patch.client_other_text      = other_text;
    if (uploaded_docs !== undefined) patch.client_uploaded_docs  = uploaded_docs;
    if (progress !== undefined)     patch.client_progress        = progress;

    const { data, error } = await sb()
      .from('leads')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

// ── remarks ───────────────────────────────────────────────────────────────

router.post('/leads/:id/remarks', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });
    const lead = await getLead(String(req.params.id));
    if (!lead) return res.status(404).json({ error: 'Not found' });
    const remarks = [...((lead.remarks as string[]) ?? []), text.trim()];
    const { data, error } = await sb()
      .from('leads')
      .update({ remarks, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

// ── portal ────────────────────────────────────────────────────────────────

router.get('/portal/:token', async (req: Request, res: Response) => {
  try {
    const { data: lead, error } = await sb()
      .from('leads')
      .select('id,company_name,industry,assessment_status,portal_token')
      .eq('portal_token', req.params.token)
      .single();
    if (error || !lead) return res.status(404).json({ error: 'Invalid or expired link' });
    const { data: questions } = await sb()
      .from('prototype_questions')
      .select('*')
      .eq('lead_id', lead.id)
      .order('sort_order');
    res.json({ lead, questions: questions ?? [] });
  } catch (e) { err(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROTOTYPE QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/leads/:leadId/questions', async (req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('prototype_questions')
      .select('*')
      .eq('lead_id', req.params.leadId)
      .order('sort_order');
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e); }
});

router.put('/leads/:leadId/questions', async (req: Request, res: Response) => {
  /** Full replace — delete existing, insert all */
  try {
    const questions = req.body as Array<Record<string, unknown>>;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'array expected' });

    await sb().from('prototype_questions').delete().eq('lead_id', req.params.leadId);

    if (questions.length > 0) {
      const rows = questions.map((q, i) => ({
        id: (q.id as string) || uuidv4(),
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
      if (error) throw error;
    }

    const { data } = await sb()
      .from('prototype_questions')
      .select('*')
      .eq('lead_id', req.params.leadId)
      .order('sort_order');
    res.json(data ?? []);
  } catch (e) { err(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// MANDATORY QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/mandatory-questions', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('mandatory_questions')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e); }
});

router.post('/mandatory-questions', async (req: Request, res: Response) => {
  try {
    const { text, type, options } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });
    const { data: existing } = await sb()
      .from('mandatory_questions').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const nextOrder = ((existing?.[0]?.sort_order as number) ?? -1) + 1;
    const { data, error } = await sb()
      .from('mandatory_questions')
      .insert({ id: uuidv4(), text: text.trim(), type: type ?? 'singlechoice', options: options ?? [], sort_order: nextOrder })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { err(res, e); }
});

router.put('/mandatory-questions/:id', async (req: Request, res: Response) => {
  try {
    const { text, type, options } = req.body;
    const patch: Record<string, unknown> = {};
    if (text)    patch.text    = text;
    if (type)    patch.type    = type;
    if (options) patch.options = options;
    const { data, error } = await sb()
      .from('mandatory_questions')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

router.delete('/mandatory-questions/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await sb().from('mandatory_questions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { err(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════════════════

router.get('/master-data', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await sb()
      .from('master_data')
      .select('category,name')
      .order('category')
      .order('name');
    if (error) throw error;
    // Group by category
    const grouped: Record<string, string[]> = {};
    for (const row of data ?? []) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row.name);
    }
    res.json(grouped);
  } catch (e) { err(res, e); }
});

router.post('/master-data/:category', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const { data, error } = await sb()
      .from('master_data')
      .insert({ id: uuidv4(), category: req.params.category, name: name.trim() })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { err(res, e); }
});

router.put('/master-data/:category/:oldName', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const { data, error } = await sb()
      .from('master_data')
      .update({ name: name.trim() })
      .eq('category', req.params.category)
      .eq('name', decodeURIComponent(String(req.params.oldName)))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { err(res, e); }
});

router.delete('/master-data/:category/:name', async (req: Request, res: Response) => {
  try {
    const { error } = await sb()
      .from('master_data')
      .delete()
      .eq('category', req.params.category)
      .eq('name', decodeURIComponent(String(req.params.name)));
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { err(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════════════════

router.get('/activity-log', async (req: Request, res: Response) => {
  try {
    let q = sb()
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (req.query.lead_id) q = q.eq('lead_id', req.query.lead_id as string);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) { err(res, e); }
});

router.post('/activity-log', async (req: Request, res: Response) => {
  try {
    const { kind, actor_name, actor_role, summary, lead_id, company_name } = req.body;
    if (!kind || !summary) return res.status(400).json({ error: 'kind and summary required' });
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
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { err(res, e); }
});

// ── internal helper ───────────────────────────────────────────────────────

async function getLead(id: string) {
  const { data } = await sb().from('leads').select('*').eq('id', id).single();
  return data;
}

export default router;
