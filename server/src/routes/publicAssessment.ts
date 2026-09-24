/**
 * Public free-assessment enrollment. No staff login.
 * Creates a Neon lead, mixes admin mandatory questions with gap-filling AI questions
 * (10 total), and emails the client after submit.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { requireDb } from '../lib/db.js';
import { syncClientResponseRows } from '../lib/clientResponses.js';
import {
  createOpenRouterClient,
  getOpenRouterConfigFromEnv,
} from '../lib/openrouter/openrouterClient.js';
import {
  generateAssessmentQuestions,
  runResearchPipeline,
  type LeadPayload,
  type ResearchResult,
} from '../lib/openrouter/aiRun.js';
import { notifyAssessmentReceived } from '../lib/zeptomail.js';
import { checkSarvamHealth, transcribeWithSarvam } from '../lib/sarvam.js';
import { mergeCrawlStatus, parseCrawlStatus, researchMessage } from '../lib/researchStatus.js';
import { buildClientIntroSummary } from '../lib/researchSummary.js';
import { scrapeWebsite } from '../lib/openrouter/scrape.js';

const router = Router();
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});
const MAX_QUESTIONS = 10;
export const CLIENT_VOICE_INTRO_ID = 'client-voice-intro';
const CLIENT_VOICE_INTRO_TEXT =
  'Tell us about your business and day-to-day activities, and the technical and growth challenges you want to solve. Speak for up to about a minute — we will not ask again for what you cover here.';

function db() {
  return requireDb();
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function domainOf(raw: string): string {
  return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase();
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

/** True when the question mostly restates something the client already said. */
function alreadyCovered(question: string, brief: string): boolean {
  const qWords = words(question);
  if (qWords.length < 4) return false;
  const briefWords = new Set(words(brief));
  const hits = qWords.filter((word) => briefWords.has(word)).length;
  return hits / qWords.length >= 0.55;
}

router.post('/enroll', async (req: Request, res: Response) => {
  try {
    const companyName = clean(req.body.companyName);
    const industry = clean(req.body.industry);
    const domain = domainOf(clean(req.body.domain));
    const contactName = clean(req.body.contactName);
    const email = clean(req.body.email).toLowerCase();
    const phone = clean(req.body.phone);
    const brief = clean(req.body.brief);

    if (!companyName || !industry || !contactName || !email || !phone) {
      return res.status(400).json({
        error: 'Company, industry, and contact name, email, and phone are required.',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const id = randomUUID();
    const token = randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await db()
      .from('leads')
      .insert({
        id,
        company_name: companyName,
        industry,
        domain: domain || '',
        country: '',
        assigned_executive: '',
        client_email: email,
        client_phone: phone,
        available_time: '',
        intake_remarks: `Contact: ${contactName}${brief ? `\n\n${brief}` : ''}`,
        lead_status: 'new',
        lead_type: 'inbound',
        funnel_status: 'client_portal',
        assessment_status: 'approved',
        portal_token: token,
        research_progress: 0,
        client_progress: 0,
        documents: [],
        document_records: [],
        remarks: [`Contact: ${contactName} · ${email} · ${phone}`],
        last_interaction: today,
      })
      .select('id,portal_token,company_name')
      .single();

    if (error) throw error;
    res.status(201).json({
      leadId: data.id,
      token: data.portal_token,
      companyName: data.company_name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not start the assessment';
    console.error('[public/enroll]', e);
    res.status(500).json({ error: message });
  }
});

function leadPayloadFromRow(lead: Record<string, unknown>): LeadPayload {
  return {
    companyName: String(lead.company_name ?? ''),
    industry: String(lead.industry ?? ''),
    domain: String(lead.domain ?? ''),
    country: String(lead.country ?? ''),
    documents: [],
  };
}

function parseStoredResearch(raw: unknown): ResearchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const brief = typeof row.executiveBrief === 'string' ? row.executiveBrief : '';
  if (!brief.trim()) return null;
  return {
    webScrapeUrl: String(row.webScrapeUrl ?? ''),
    webScrapeExcerpt: String(row.webScrapeExcerpt ?? ''),
    webScrapeError: typeof row.webScrapeError === 'string' ? row.webScrapeError : undefined,
    webInsights: Array.isArray(row.webInsights) ? row.webInsights.map(String) : [],
    competitors: Array.isArray(row.competitors) ? row.competitors.map(String) : [],
    documentInsights: Array.isArray(row.documentInsights) ? row.documentInsights.map(String) : [],
    executiveBrief: brief,
  };
}

async function updateResearchProgress(
  leadId: string,
  progress: number,
  statusPatch: { phase: string; message?: string; pagesCrawled?: number; maxPages?: number; currentPath?: string; engine?: 'playwright' | 'fetch' },
  aiResearch?: unknown,
) {
  const base = mergeCrawlStatus(aiResearch ?? {}, {
    phase: statusPatch.phase as 'crawl' | 'analyze' | 'brief' | 'done',
    message: statusPatch.message ?? researchMessage(progress, statusPatch as Parameters<typeof researchMessage>[1]),
    pagesCrawled: statusPatch.pagesCrawled,
    maxPages: statusPatch.maxPages,
    currentPath: statusPatch.currentPath,
    engine: statusPatch.engine,
  });
  await db()
    .from('leads')
    .update({
      research_progress: progress,
      ai_research: base,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);
}

router.get('/assessment/research/:token/status', async (req: Request, res: Response) => {
  try {
    const { data: lead, error } = await db()
      .from('leads')
      .select('research_progress,ai_research,domain')
      .eq('portal_token', req.params.token)
      .single();
    if (error || !lead) return res.status(404).json({ error: 'Assessment not found' });

    const progress = Number(lead.research_progress ?? 0);
    const status = parseCrawlStatus(lead.ai_research);
    const done = progress >= 100;
    const research = parseStoredResearch(lead.ai_research);
    const introSummary = research && done ? buildClientIntroSummary(research) : '';

    res.json({
      progress,
      done,
      hasWebsite: Boolean(String(lead.domain ?? '').trim()),
      phase: status?.phase ?? (done ? 'done' : progress > 0 ? 'crawl' : 'idle'),
      message: researchMessage(progress, status),
      pagesCrawled: status?.pagesCrawled ?? 0,
      maxPages: status?.maxPages ?? 6,
      currentPath: status?.currentPath,
      engine: status?.engine,
      introSummary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not load research status';
    res.status(500).json({ error: message });
  }
});

router.post('/assessment/research', async (req: Request, res: Response) => {
  try {
    const token = clean(req.body.token);
    if (!token) return res.status(400).json({ error: 'token required' });

    const { data: lead, error: leadError } = await db()
      .from('leads')
      .select('id,company_name,industry,domain,country,intake_remarks,ai_research,research_progress')
      .eq('portal_token', token)
      .single();
    if (leadError || !lead) return res.status(404).json({ error: 'Assessment not found' });

    const cached = parseStoredResearch(lead.ai_research);
    if (cached && Number(lead.research_progress) >= 100) {
      return res.json({ research: cached, cached: true, introSummary: buildClientIntroSummary(cached) });
    }

    const domain = String(lead.domain ?? '').trim();
    if (!domain) {
      const skipped: ResearchResult = {
        webScrapeUrl: '',
        webScrapeExcerpt: '',
        webInsights: [
          `No public website was provided for ${lead.company_name}.`,
          `Industry context: ${lead.industry}.`,
        ],
        competitors: [],
        documentInsights: [],
        executiveBrief:
          `${lead.company_name} operates in ${lead.industry}. ` +
          `Discovery will rely on the client's first spoken answer about their business, activities, and goals.`,
      };
      await db()
        .from('leads')
        .update({
          ai_research: skipped as unknown as Record<string, unknown>,
          research_progress: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      return res.json({ research: skipped, cached: false, skipped: true });
    }

    const config = getOpenRouterConfigFromEnv();
    if (!config) {
      return res.status(503).json({ error: 'AI research is not configured on the server.' });
    }

    let crawlMeta = lead.ai_research;
    await updateResearchProgress(lead.id as string, 8, { phase: 'crawl', message: 'Opening your website…' }, crawlMeta);
    crawlMeta = mergeCrawlStatus(crawlMeta, { phase: 'crawl', message: 'Opening your website…' });

    const payload = leadPayloadFromRow(lead as Record<string, unknown>);
    const preScrape = await scrapeWebsite(String(lead.domain), async (event) => {
      const progress = event.progress;
      await updateResearchProgress(
        lead.id as string,
        progress,
        {
          phase: 'crawl',
          pagesCrawled: event.page,
          maxPages: event.maxPages,
          currentPath: event.path,
          engine: event.engine,
        },
        crawlMeta,
      );
      crawlMeta = mergeCrawlStatus(crawlMeta, {
        phase: 'crawl',
        pagesCrawled: event.page,
        maxPages: event.maxPages,
        currentPath: event.path,
        engine: event.engine,
      });
    });

    const client = createOpenRouterClient(config);
    const research = await runResearchPipeline(client, config, payload, {
      preScrape,
      onProgress: async (progress, phase) => {
        await updateResearchProgress(
          lead.id as string,
          progress,
          {
            phase,
            engine: preScrape.engine,
            pagesCrawled: preScrape.pages.length,
            maxPages: 6,
          },
          crawlMeta,
        );
      },
    });

    await db()
      .from('leads')
      .update({
        ai_research: research as unknown as Record<string, unknown>,
        research_progress: 100,
        funnel_status: 'research',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    res.json({ research, cached: false, introSummary: buildClientIntroSummary(research) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Research failed';
    console.error('[public/research]', e);
    res.status(500).json({ error: message });
  }
});

router.post('/assessment/generate', async (req: Request, res: Response) => {
  try {
    const token = clean(req.body.token);
    const brief = clean(req.body.brief);
    if (!token) return res.status(400).json({ error: 'token required' });
    if (brief.length < 15) {
      return res.status(400).json({
        error: 'Please share more about your business, activities, and the challenges you want to solve.',
      });
    }

    const { data: lead, error: leadError } = await db()
      .from('leads')
      .select('id,company_name,industry,domain,country,intake_remarks,ai_research,research_progress')
      .eq('portal_token', token)
      .single();
    if (leadError || !lead) return res.status(404).json({ error: 'Assessment not found' });

    const contactBlock = String(lead.intake_remarks ?? '').split('\n\n')[0] ?? '';
    const clientBrief = brief;
    if (clientBrief) {
      const base = String(lead.intake_remarks ?? '').trim();
      const withoutOldBrief = base.includes('\n\n')
        ? `${contactBlock}\n\n${clientBrief}`
        : `${base}\n\n${clientBrief}`;
      await db()
        .from('leads')
        .update({ intake_remarks: withoutOldBrief, updated_at: new Date().toISOString() })
        .eq('id', lead.id);
    }

    const { data: mandatoryRows, error: mandatoryError } = await db()
      .from('mandatory_questions')
      .select('id,text,type,options,sort_order')
      .order('sort_order');
    if (mandatoryError) throw mandatoryError;

    const mandatory = (mandatoryRows ?? []) as Array<{
      id: string;
      text: string;
      type: string;
      options: string[] | null;
      sort_order: number;
    }>;

    const context = clientBrief || String(lead.intake_remarks ?? '');
    const aiSlots = Math.max(0, MAX_QUESTIONS - mandatory.length);
    let warning: string | undefined;
    let generated: Array<{
      text: string;
      type: string;
      options?: string[];
      taxonomyPillar: string;
      domainContext: string;
      category?: string;
    }> = [];

    const config = getOpenRouterConfigFromEnv();
    if (aiSlots > 0 && config) {
      try {
        let research = parseStoredResearch(lead.ai_research);
        const client = createOpenRouterClient(config);
        const payload = leadPayloadFromRow(lead as Record<string, unknown>);
        if (!research) {
          const domain = String(lead.domain ?? '').trim();
          if (!domain) {
            research = {
              webScrapeUrl: '',
              webScrapeExcerpt: '',
              webInsights: [`Industry: ${lead.industry}`],
              competitors: [],
              documentInsights: [],
              executiveBrief: `${lead.company_name} (${lead.industry}). No website on file.`,
            };
          } else {
            research = await runResearchPipeline(client, config, payload);
          }
          await db()
            .from('leads')
            .update({
              ai_research: research as unknown as Record<string, unknown>,
              research_progress: 100,
              updated_at: new Date().toISOString(),
            })
            .eq('id', lead.id);
        }
        const voiceNote = clientBrief
          ? `\n\nClient voice briefing (problems, expectations, gaps — do not re-ask):\n${clientBrief}`
          : '';
        const enrichedResearch: ResearchResult = {
          ...research,
          executiveBrief:
            `${research.executiveBrief}${voiceNote}\n\n` +
            `Generate questions that reflect web research and regional competitors. ` +
            `Skip topics the client voice briefing already covers.`,
        };
        const result = await generateAssessmentQuestions(client, config, payload, enrichedResearch);
        const mandatoryText = new Set(mandatory.map((row) => row.text.trim().toLowerCase()));
        generated = result.questions
          .filter((question) => question.text?.trim())
          .filter((question) => !mandatoryText.has(question.text.trim().toLowerCase()))
          .filter((question) => !alreadyCovered(question.text, context))
          .slice(0, aiSlots);
      } catch (err) {
        warning = err instanceof Error ? err.message : 'Question generation failed';
        console.error('[public/generate]', err);
      }
    } else if (aiSlots > 0 && !config) {
      warning = 'AI questions are unavailable. The required questions are ready.';
    }

    const introRow = {
      id: randomUUID(),
      lead_id: lead.id,
      sort_order: 0,
      taxonomy_pillar: 'Non-Technical / Operational Pain Areas',
      domain_context: 'Client narrative',
      category: 'Discovery',
      text: CLIENT_VOICE_INTRO_TEXT,
      type: 'text',
      options: [] as string[],
      suggested_options: [] as string[],
      is_mandatory: true,
    };

    const bodyRows = [
      ...mandatory.map((row, index) => ({
        id: randomUUID(),
        lead_id: lead.id,
        sort_order: index + 1,
        taxonomy_pillar: 'Non-Technical / Operational Pain Areas',
        domain_context: 'Mandatory baseline',
        category: 'Governance & Compliance',
        text: row.text,
        type: row.type || 'singlechoice',
        options: Array.isArray(row.options) ? row.options : [],
        suggested_options: [],
        is_mandatory: true,
      })),
      ...generated.map((question, index) => ({
        id: randomUUID(),
        lead_id: lead.id,
        sort_order: mandatory.length + index + 1,
        taxonomy_pillar: question.taxonomyPillar || 'Technical Pain Points',
        domain_context: question.domainContext || '',
        category: question.category || 'Technology Stack',
        text: question.text,
        type: question.type || 'singlechoice',
        options: question.options ?? [],
        suggested_options: [],
        is_mandatory: false,
      })),
    ].slice(0, MAX_QUESTIONS);

    const rows = [introRow, ...bodyRows];

    await db().from('prototype_questions').delete().eq('lead_id', lead.id);
    if (rows.length) {
      const { error } = await db().from('prototype_questions').insert(rows);
      if (error) throw error;
    }

    res.json({ questions: rows, warning });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not generate questions';
    console.error('[public/generate]', e);
    res.status(500).json({ error: message });
  }
});

router.get('/assessment/:token', async (req: Request, res: Response) => {
  try {
    const { data: lead, error } = await db()
      .from('leads')
      .select('id,company_name,industry,domain,client_email,client_progress,client_assessment_submitted_at,client_answers,client_richtext,client_other_text')
      .eq('portal_token', req.params.token)
      .single();
    if (error || !lead) return res.status(404).json({ error: 'Assessment not found' });

    const { data: questions } = await db()
      .from('prototype_questions')
      .select('id,text,type,options,sort_order,is_mandatory')
      .eq('lead_id', lead.id)
      .order('sort_order');

    res.json({
      companyName: lead.company_name,
      industry: lead.industry,
      domain: lead.domain,
      email: lead.client_email,
      submitted: Boolean(lead.client_assessment_submitted_at),
      answers: lead.client_answers ?? {},
      richtext: lead.client_richtext ?? {},
      otherText: lead.client_other_text ?? {},
      questions: questions ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not load assessment';
    res.status(500).json({ error: message });
  }
});

router.put('/assessment/:token', async (req: Request, res: Response) => {
  try {
    const { data: lead, error: leadError } = await db()
      .from('leads')
      .select('id,company_name,client_email,intake_remarks,client_assessment_started_at,client_assessment_submitted_at')
      .eq('portal_token', req.params.token)
      .single();
    if (leadError || !lead) return res.status(404).json({ error: 'Assessment not found' });

    const { answers, richtext, other_text, progress, submitted } = req.body as {
      answers?: Record<string, unknown>;
      richtext?: Record<string, string>;
      other_text?: Record<string, string>;
      progress?: number;
      submitted?: boolean;
    };

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_interaction: new Date().toISOString().slice(0, 10),
    };
    if (answers !== undefined) patch.client_answers = answers;
    if (richtext !== undefined) patch.client_richtext = richtext;
    if (other_text !== undefined) patch.client_other_text = other_text;
    if (progress !== undefined) patch.client_progress = submitted ? 100 : progress;

    const { error } = await db().from('leads').update(patch).eq('id', lead.id);
    if (error) throw error;

    await syncClientResponseRows({
      leadId: lead.id as string,
      answers,
      richtext,
      otherText: other_text,
      progress: submitted ? 100 : progress,
      submitted: submitted === true,
      existingStartedAt: lead.client_assessment_started_at as string | null,
    });

    let emailSent = false;
    let emailError: string | undefined;
    const alreadySubmitted = Boolean(lead.client_assessment_submitted_at);
    if (submitted === true && !alreadySubmitted) {
      const remarks = String(lead.intake_remarks ?? '');
      const contactName = remarks.match(/^Contact:\s*(.+)$/m)?.[1]?.trim() || 'there';
      const result = await notifyAssessmentReceived({
        toEmail: String(lead.client_email ?? ''),
        toName: contactName,
        companyName: String(lead.company_name),
      });
      emailSent = result.emailSent;
      emailError = result.emailError;
    }

    res.json({ ok: true, submitted: submitted === true, emailSent, emailError });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not save answers';
    console.error('[public/save]', e);
    res.status(500).json({ error: message });
  }
});

router.get('/sarvam/health', async (_req: Request, res: Response) => {
  try {
    const health = await checkSarvamHealth();
    res.json(health);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sarvam health check failed';
    res.status(500).json({ error: message });
  }
});

router.post('/voice/clean', async (req: Request, res: Response) => {
  try {
    const transcript = clean(req.body.transcript);
    if (transcript.length < 8) {
      return res.status(400).json({ error: 'Not enough speech to summarise.' });
    }
    const config = getOpenRouterConfigFromEnv();
    if (!config) return res.status(503).json({ error: 'AI is not configured on the server.' });
    const client = createOpenRouterClient(config);
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content:
            `Clean this English spoken answer for an IT assessment. ` +
            `Keep only the company, the person, the work, and the problems. ` +
            `Remove greetings, repeats, and filler. Write 2 to 4 first-person sentences. ` +
            `Do not add facts. Plain text only.\n\n${transcript.slice(0, 6000)}`,
        },
      ],
    });
    const summary = completion.choices[0]?.message?.content ?? '';
    const text = summary.replace(/^["']|["']$/g, '').trim();
    res.json({ text: text || transcript });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not summarise the voice';
    console.error('[public/voice/clean]', e);
    res.status(502).json({ error: message });
  }
});

router.post('/sarvam/transcribe', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'Upload an audio file as multipart field "audio".' });
    }
    const languageCode = clean(req.body.language_code) || 'en-IN';
    const result = await transcribeWithSarvam(file.buffer, file.mimetype || 'audio/webm', languageCode);
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Transcription failed';
    console.error('[public/sarvam/transcribe]', e);
    res.status(502).json({ error: message });
  }
});

export default router;
