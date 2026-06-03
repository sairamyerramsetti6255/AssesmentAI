import { demoStore, type Client } from './demoStore.js';
import type { MasterDriver } from './demoStore.js';
import { geminiGenerateJSON, geminiTranscribeAudio, isGeminiConfigured } from './gemini.js';

export function parseBusinessDomains(client: { business_domains?: string[]; domain?: string | null }): string[] {
  if (client.business_domains?.length) return client.business_domains;
  if (!client.domain) return [];
  try {
    const parsed = JSON.parse(client.domain);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* legacy string */ }
  return client.domain.split(',').map((s) => s.trim()).filter(Boolean);
}

export function getAssessmentContext(assessmentId: string) {
  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  if (!assessment) return null;

  const client = demoStore.clients.find((c) => c.id === assessment.client_id);
  if (!client) return null;

  const industry = demoStore.masters.industries.find((i) => i.id === client.industry_id);
  const docs = demoStore.documents.filter((d) => d.assessment_id === assessmentId);
  const painPointNames = assessment.pain_point_ids
    .map((id) => demoStore.masters.painPoints.find((p) => p.id === id)?.category_name)
    .filter(Boolean);

  return {
    assessment,
    client,
    industryName: industry?.name || 'General',
    businessDomains: parseBusinessDomains(client),
    documents: docs,
    docSummaries: docs.map((d) => ({
      file_name: d.file_name,
      summary: d.extraction_summary,
    })),
    painPointNames,
    drivers: demoStore.masters.drivers,
    painPoints: demoStore.masters.painPoints,
  };
}

export interface GeneratedResearch {
  research_notes: string;
  suggested_pain_points: string[];
  executive_summary?: string;
  key_opportunities?: string[];
  assessment_focus?: string[];
}

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    executive_summary: { type: 'string', description: '2-3 sentence overview' },
    company_context: { type: 'string', description: 'Company background and market position' },
    industry_ai_landscape: { type: 'string', description: 'AI trends in their industry' },
    opportunities: { type: 'string', description: 'Specific AI opportunities for this client' },
    risks_and_gaps: { type: 'string', description: 'Likely blockers and gaps' },
    assessment_focus: {
      type: 'array',
      items: { type: 'string' },
      description: '3-5 focus areas for the live assessment',
    },
    suggested_pain_points: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['executive_summary', 'company_context', 'industry_ai_landscape', 'opportunities', 'risks_and_gaps', 'assessment_focus', 'suggested_pain_points'],
};

interface DeepResearchPayload {
  executive_summary: string;
  company_context: string;
  industry_ai_landscape: string;
  opportunities: string;
  risks_and_gaps: string;
  assessment_focus: string[];
  suggested_pain_points: string[];
}

function formatDeepResearchMarkdown(data: DeepResearchPayload, companyName: string): string {
  const focus = data.assessment_focus.map((f) => `- ${f}`).join('\n');
  return `## ${companyName} — Deep Pre-Assessment Research

### Executive Summary
${data.executive_summary}

### Company Context
${data.company_context}

### Industry AI Landscape
${data.industry_ai_landscape}

### AI Opportunities
${data.opportunities}

### Risks & Gaps
${data.risks_and_gaps}

### Recommended Assessment Focus
${focus}
`.trim();
}

function buildClientBrief(client: Client, industryName: string, businessDomains: string[]) {
  return `
Company Name: ${client.company_name || 'Unknown'}
Industry: ${industryName}
Business Domains: ${businessDomains.join(', ') || 'Not specified'}
Website URL: ${client.website_url || 'Not provided'}
Website / Business Details: ${client.website_details || 'Not provided'}
Contact Name: ${client.contact_name || 'N/A'}
Contact Email: ${client.contact_email || 'no email'}
Contact Phone: ${client.contact_phone || 'N/A'}
`.trim();
}

function fallbackResearch(companyName: string, industryName: string, businessDomains: string[]): GeneratedResearch {
  const notes = formatDeepResearchMarkdown({
    executive_summary: `${companyName} is positioned in ${industryName} with domains spanning ${businessDomains.join(', ') || 'general business operations'}. A structured AI readiness assessment will clarify maturity across strategy, data, culture, and infrastructure.`,
    company_context: `${companyName} appears to be exploring AI adoption. Based on available profile data, the organization likely faces typical ${industryName} challenges around data integration, governance, and scaling pilots to production.`,
    industry_ai_landscape: `${industryName} peers are increasingly adopting AI for automation, analytics, and customer experience. Leaders invest in data platforms, MLOps, and responsible AI governance.`,
    opportunities: `- Process automation in high-volume workflows\n- Predictive analytics on operational data\n- GenAI for knowledge work and customer support\n- Computer vision / NLP where unstructured data is abundant`,
    risks_and_gaps: `- Data silos and quality issues\n- Limited AI literacy outside IT\n- Legacy systems blocking real-time AI\n- Compliance and security concerns`,
    assessment_focus: [
      'Business strategy alignment with AI goals',
      'Data infrastructure and integration readiness',
      'AI governance and responsible use',
      'Workforce adoption and change management',
      'Infrastructure for production AI workloads',
    ],
    suggested_pain_points: ['Manual Processes', 'Data Silos'],
  }, companyName);
  return { research_notes: notes, suggested_pain_points: ['Manual Processes', 'Data Silos'] };
}

export async function generateResearchNotes(assessmentId: string): Promise<GeneratedResearch> {
  const ctx = getAssessmentContext(assessmentId);
  if (!ctx) throw new Error('Assessment not found');

  const { client, industryName, businessDomains } = ctx;
  const companyName = client.company_name?.trim() || 'Client';
  if (!client.company_name?.trim()) {
    throw new Error('Complete Step 1 (Company Name) before generating research');
  }

  const painPointOptions = ctx.painPoints.map((p) => p.category_name).join(', ');
  const clientBrief = buildClientBrief(client, industryName, businessDomains);

  if (!isGeminiConfigured()) {
    return fallbackResearch(companyName, industryName, businessDomains);
  }

  const prompt = `You are a senior AI readiness consultant performing DEEP pre-assessment research for a B2B sales team.

Use ONLY the client data below. Be specific to this company — cite their industry, domains, website details, and contact context. Do not use generic filler.

CLIENT DATA (Step 1):
${clientBrief}

Available pain point categories (pick 2-4 most relevant — use EXACT names): ${painPointOptions}

Produce thorough, actionable research the sales manager will use to run a live AI readiness assessment.
- executive_summary: crisp 2-3 sentences
- company_context: what we know + reasonable inference from their profile
- industry_ai_landscape: how peers in ${industryName} use AI today
- opportunities: bullet-style paragraph of 3-5 specific AI opportunities for ${companyName}
- risks_and_gaps: likely blockers based on profile
- assessment_focus: 4-6 concrete topics to probe in the live session
- suggested_pain_points: exact category names from the list`;

  const useTemplateFallback = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('TLS') || msg.includes('Could not reach Gemini') || msg.includes('fetch failed') || msg.includes('suspended');
  };

  try {
    const data = await geminiGenerateJSON<DeepResearchPayload>(prompt, RESEARCH_SCHEMA);
    const research_notes = formatDeepResearchMarkdown(data, companyName);
    return {
      research_notes,
      suggested_pain_points: data.suggested_pain_points || [],
      executive_summary: data.executive_summary,
      key_opportunities: data.assessment_focus,
    };
  } catch (err) {
    if (useTemplateFallback(err)) {
      console.warn('Gemini research fallback:', err);
      return fallbackResearch(companyName, industryName, businessDomains);
    }
    throw err;
  }
}

export interface GeneratedQuestion {
  driver_key: string;
  question_text: string;
  question_type: 'rating' | 'text' | 'voice' | 'multi_select';
  options?: string[];
  is_required?: boolean;
}

const VALID_TYPES = new Set(['rating', 'text', 'voice', 'multi_select']);

const QUESTIONS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          driver_key: {
            type: 'string',
            enum: ['business_strategy', 'technology_data', 'ai_strategy', 'org_culture', 'infrastructure'],
          },
          question_text: { type: 'string' },
          question_type: {
            type: 'string',
            enum: ['rating', 'text', 'voice', 'multi_select'],
          },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
          is_required: { type: 'boolean' },
        },
        required: ['driver_key', 'question_text', 'question_type'],
      },
    },
  },
  required: ['questions'],
};

function normalizeDriverKey(raw: string, drivers: MasterDriver[]): string {
  const key = raw.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const exact = drivers.find((d) => d.driver_key === key);
  if (exact) return exact.driver_key;
  const partial = drivers.find(
    (d) => key.includes(d.driver_key) || d.driver_key.includes(key.replace(/_/g, '')),
  );
  if (partial) return partial.driver_key;
  const byWord = drivers.find((d) => {
    const words = d.driver_name.toLowerCase().split(/\s+/);
    return words.some((w) => key.includes(w.slice(0, 4)));
  });
  return byWord?.driver_key || drivers[0]?.driver_key || 'business_strategy';
}

function normalizeQuestionType(raw: string): GeneratedQuestion['question_type'] {
  const t = raw.toLowerCase().replace(/[^a-z_]/g, '');
  if (t.includes('multi') || t === 'multiple_choice') return 'multi_select';
  if (t.includes('voice') || t.includes('audio')) return 'voice';
  if (t.includes('text') || t.includes('open')) return 'text';
  if (VALID_TYPES.has(t)) return t as GeneratedQuestion['question_type'];
  return 'rating';
}

function normalizeQuestion(q: GeneratedQuestion, drivers: MasterDriver[]): GeneratedQuestion | null {
  const text = q.question_text?.trim();
  if (!text || text.length < 10) return null;

  const question_type = normalizeQuestionType(q.question_type || 'rating');
  const driver_key = normalizeDriverKey(q.driver_key || '', drivers);

  let options = q.options?.filter((o) => typeof o === 'string' && o.trim()).map((o) => o.trim());
  if (question_type === 'multi_select') {
    if (!options || options.length < 2) {
      options = ['Not started', 'In progress', 'Mature / fully adopted'];
    }
  } else {
    options = undefined;
  }

  return {
    driver_key,
    question_text: text,
    question_type,
    options,
    is_required: q.is_required !== false,
  };
}

function fallbackQuestions(drivers: MasterDriver[]): GeneratedQuestion[] {
  return demoStore.masters.questions.slice(0, 12).map((mq) => {
    const driver = drivers.find((d) => d.id === mq.driver_id) || drivers[0];
    return {
      driver_key: driver.driver_key,
      question_text: mq.question_text,
      question_type: (VALID_TYPES.has(mq.question_type) ? mq.question_type : 'rating') as GeneratedQuestion['question_type'],
      is_required: mq.is_required,
    };
  });
}

export async function generateAssessmentQuestions(assessmentId: string): Promise<GeneratedQuestion[]> {
  const ctx = getAssessmentContext(assessmentId);
  if (!ctx) throw new Error('Assessment not found');

  const { assessment, client, industryName, businessDomains, drivers, docSummaries, painPointNames } = ctx;

  const contextBlock = `
Company: ${client.company_name}
Industry: ${industryName}
Business Domains: ${businessDomains.join(', ') || 'Not specified'}
Website: ${client.website_url || 'N/A'}
Business Details: ${client.website_details || 'N/A'}
Research Notes: ${(assessment.pre_assessment_notes || 'None').slice(0, 4000)}
Pain Points: ${painPointNames.join(', ') || 'None selected'}
Documents: ${docSummaries.length ? JSON.stringify(docSummaries).slice(0, 3000) : 'None uploaded'}
`.trim();

  if (!isGeminiConfigured()) {
    return fallbackQuestions(drivers);
  }

  const driverList = drivers.map((d) => `${d.driver_key} (${d.driver_name})`).join(', ');

  const prompt = `You are an expert AI readiness assessor. Generate assessment questions for a LIVE client discovery session.

CLIENT CONTEXT:
${contextBlock}

DRIVERS (use driver_key exactly as listed): ${driverList}

Generate exactly 12 to 15 questions tailored to this client. Requirements:
- At least 2 questions per driver (all 5 drivers must be covered)
- Mix: ~5 rating, ~3 text, ~2 voice, ~2 multi_select
- question_text: conversational, specific to ${client.company_name} and ${industryName} (never generic)
- rating: 1-5 scale questions about maturity/readiness
- voice: questions where spoken client context is valuable
- multi_select: include 3-5 distinct options in the options array
- Do NOT include expected answers — managers will set those separately
- Reference details from research notes when relevant`;

  const useTemplateFallback = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('TLS') || msg.includes('Could not reach Gemini') || msg.includes('fetch failed');
  };

  let raw: GeneratedQuestion[];
  try {
    const result = await geminiGenerateJSON<{ questions: GeneratedQuestion[] }>(
      prompt,
      QUESTIONS_RESPONSE_SCHEMA,
    );
    raw = Array.isArray(result.questions) ? result.questions : [];
  } catch (err) {
    if (useTemplateFallback(err)) {
      console.warn('Gemini unreachable — using template questions:', err);
      return fallbackQuestions(drivers);
    }
    console.error('Gemini question generation failed, retrying without schema:', err);
    try {
      const retryPrompt = `${prompt}\n\nReturn ONLY valid JSON: {"questions":[{"driver_key":"business_strategy","question_text":"...","question_type":"rating","is_required":true}]}`;
      const result = await geminiGenerateJSON<{ questions: GeneratedQuestion[] }>(retryPrompt);
      raw = Array.isArray(result.questions) ? result.questions : [];
    } catch (retryErr) {
      if (useTemplateFallback(retryErr)) {
        console.warn('Gemini retry failed — using template questions');
        return fallbackQuestions(drivers);
      }
      throw retryErr;
    }
  }

  const normalized = raw
    .map((q) => normalizeQuestion(q, drivers))
    .filter((q): q is GeneratedQuestion => q !== null);

  if (normalized.length < 8) {
    console.warn(`Only ${normalized.length} valid questions from Gemini; supplementing with templates`);
    const existing = new Set(normalized.map((q) => q.question_text));
    for (const fb of fallbackQuestions(drivers)) {
      if (normalized.length >= 12) break;
      if (!existing.has(fb.question_text)) normalized.push(fb);
    }
  }

  return normalized.slice(0, 18);
}

const EXPECTED_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    expected_answer: { type: 'string' },
  },
  required: ['expected_answer'],
};

export async function generateExpectedAnswer(assessmentId: string, questionId: string): Promise<string> {
  const ctx = getAssessmentContext(assessmentId);
  if (!ctx) throw new Error('Assessment not found');

  const question = demoStore.questions.find(
    (q) => q.id === questionId && q.assessment_id === assessmentId && q.session_status !== 'deleted',
  );
  if (!question) throw new Error('Question not found');

  const { assessment, client, industryName, businessDomains } = ctx;
  const driver = demoStore.masters.drivers.find((d) => d.id === question.driver_id);

  const optionsHint = question.options?.length
    ? `Available options: ${question.options.join(' | ')}`
    : '';

  if (!isGeminiConfigured()) {
    return `Based on ${client.company_name}'s profile in ${industryName}, a mature organization would demonstrate strong capability in ${driver?.driver_name || 'this area'} with documented processes and measurable outcomes.`;
  }

  const prompt = `You are an AI readiness consultant helping a sales manager set a BENCHMARK expected answer before a live client session.

CLIENT: ${client.company_name} (${industryName})
DOMAINS: ${businessDomains.join(', ') || 'General'}
RESEARCH SUMMARY: ${(assessment.pre_assessment_notes || '').slice(0, 2500)}

QUESTION TYPE: ${question.question_type}
DRIVER: ${driver?.driver_name || 'General'}
QUESTION: ${question.question_text}
${optionsHint}

Write a natural-language expected answer (2-4 sentences) the manager can use as a benchmark during prep.
- For rating questions: describe maturity level and evidence — do NOT reply with only a number like "3" or "4"
- For multi_select: name the best option and briefly explain why
- For text/voice: provide substantive talking points
- Be specific to this client and industry`;

  const useTemplateFallback = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('TLS') || msg.includes('Could not reach Gemini') || msg.includes('fetch failed') || msg.includes('suspended');
  };

  try {
    const result = await geminiGenerateJSON<{ expected_answer: string }>(prompt, EXPECTED_ANSWER_SCHEMA);
    return result.expected_answer?.trim() || '';
  } catch (err) {
    if (useTemplateFallback(err)) {
      return `Expected mature response for ${driver?.driver_name || 'this driver'}: documented strategy, accountable ownership, and measurable KPIs aligned to ${client.company_name}'s ${industryName} context.`;
    }
    throw err;
  }
}

export function formatClientAnswer(
  question: { question_type: string },
  answer: { rating_value: number | null; text_answer: string | null; transcript_answer: string | null } | undefined,
): string {
  if (!answer) return '';
  if (question.question_type === 'rating') {
    const parts = [answer.rating_value != null ? `Rating: ${answer.rating_value}/5` : ''];
    if (answer.text_answer?.trim()) parts.push(`Notes: ${answer.text_answer}`);
    if (answer.transcript_answer?.trim()) parts.push(`Voice: ${answer.transcript_answer}`);
    return parts.filter(Boolean).join('. ');
  }
  if (question.question_type === 'voice') return answer.transcript_answer?.trim() || answer.text_answer?.trim() || '';
  if (question.question_type === 'multi_select') return answer.text_answer?.trim() || '';
  return answer.text_answer?.trim() || answer.transcript_answer?.trim() || '';
}

function heuristicQuestionScore(
  question: { question_type: string; expected_answer?: string | null; rating_min: number; rating_max: number },
  answer: { rating_value: number | null; text_answer: string | null; transcript_answer: string | null } | undefined,
): { score: number; summary: string; analysis: string } {
  const clientText = formatClientAnswer(question, answer);
  if (question.question_type === 'rating' && answer?.rating_value != null) {
    return {
      score: answer.rating_value,
      summary: clientText,
      analysis: `Client self-rated ${answer.rating_value}/${question.rating_max} on this dimension.`,
    };
  }
  if (!clientText.trim()) {
    return { score: 1, summary: 'No answer provided', analysis: 'Question was not answered during the session.' };
  }

  let score = 3;
  const expected = question.expected_answer?.toLowerCase() || '';
  const actual = clientText.toLowerCase();
  if (expected) {
    const expectedWords = new Set(expected.split(/\W+/).filter((w) => w.length > 3));
    const actualWords = actual.split(/\W+/).filter((w) => w.length > 3);
    const overlap = actualWords.filter((w) => expectedWords.has(w)).length;
    const ratio = expectedWords.size ? overlap / expectedWords.size : 0;
    if (ratio >= 0.35) score = 4;
    else if (ratio >= 0.15) score = 3;
    else score = 2;
  } else {
    score = Math.min(5, Math.max(2, Math.round(clientText.length / 80) + 2));
  }

  return {
    score,
    summary: clientText.slice(0, 300),
    analysis: expected
      ? `Response compared to benchmark. ${score >= 4 ? 'Strong alignment with expected maturity.' : score <= 2 ? 'Notable gaps vs benchmark.' : 'Partial alignment with expected answer.'}`
      : `Scored from response depth and clarity (${clientText.length} chars captured).`,
  };
}

const SESSION_SCORE_SCHEMA = {
  type: 'object',
  properties: {
    executive_summary: { type: 'string' },
    key_findings: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    question_analyses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question_id: { type: 'string' },
          score: { type: 'number' },
          analysis: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          gaps: { type: 'array', items: { type: 'string' } },
          client_answer_summary: { type: 'string' },
        },
        required: ['question_id', 'score', 'analysis', 'client_answer_summary'],
      },
    },
  },
  required: ['executive_summary', 'question_analyses', 'key_findings', 'recommendations'],
};

export interface SessionScoreResult {
  driver_scores: Record<string, number>;
  overall_score: number;
  maturity_stage_id: string;
  maturity_stage_name: string;
  executive_summary: string;
  key_findings: string[];
  recommendations: string[];
  question_analyses: import('./demoStore.js').QuestionAnalysis[];
  benchmark_comparison: Record<string, unknown> | null;
}

function resolveMaturityStage(overall: number) {
  let stage = demoStore.masters.maturityStages[0];
  if (overall >= 4.5) stage = demoStore.masters.maturityStages[4];
  else if (overall >= 3.5) stage = demoStore.masters.maturityStages[3];
  else if (overall >= 2.5) stage = demoStore.masters.maturityStages[2];
  else if (overall >= 1.5) stage = demoStore.masters.maturityStages[1];
  return stage;
}

function buildBenchmarkComparison(
  assessmentId: string,
  driverScores: Record<string, number>,
): Record<string, unknown> | null {
  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const benchmark = demoStore.masters.benchmarks.find((b) => b.industry_id === client?.industry_id);
  if (!benchmark) return null;

  const industryAvg = benchmark.avg_driver_scores;
  const delta: Record<string, number> = {};
  for (const key of Object.keys(driverScores)) {
    delta[key] = Math.round((driverScores[key] - (industryAvg[key] ?? 0)) * 100) / 100;
  }

  return {
    industry_avg: industryAvg,
    client_scores: driverScores,
    your_scores: driverScores,
    delta,
    industry_maturity_pct: benchmark.percentage,
  };
}

function aggregateDriverScores(
  questions: Array<{ id: string; driver_id: string | null }>,
  analyses: Array<{ question_id: string; score: number }>,
): Record<string, number> {
  const driverScores: Record<string, number> = {};
  const driverCounts: Record<string, number> = {};

  for (const q of questions) {
    const driver = demoStore.masters.drivers.find((d) => d.id === q.driver_id);
    if (!driver) continue;
    const analysis = analyses.find((a) => a.question_id === q.id);
    if (!analysis) continue;
    driverScores[driver.driver_key] = (driverScores[driver.driver_key] || 0) + analysis.score;
    driverCounts[driver.driver_key] = (driverCounts[driver.driver_key] || 0) + 1;
  }

  for (const key of Object.keys(driverScores)) {
    driverScores[key] = Math.round((driverScores[key] / driverCounts[key]) * 100) / 100;
  }
  return driverScores;
}

export async function scoreSessionWithAI(assessmentId: string, sessionId: string): Promise<SessionScoreResult> {
  const ctx = getAssessmentContext(assessmentId);
  if (!ctx) throw new Error('Assessment not found');

  const session = demoStore.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('Session not found');

  const questions = demoStore.questions.filter(
    (q) => q.assessment_id === assessmentId && q.session_status === 'active',
  );
  const answers = demoStore.answers.filter((a) => a.session_id === sessionId);

  const qaPayload = questions.map((q, i) => {
    const driver = demoStore.masters.drivers.find((d) => d.id === q.driver_id);
    const answer = answers.find((a) => a.question_id === q.id);
    return {
      question_id: q.id,
      index: i + 1,
      driver: driver?.driver_name || 'General',
      driver_key: driver?.driver_key || 'general',
      type: q.question_type,
      question: q.question_text,
      expected_benchmark: q.expected_answer || '(not set)',
      client_response: formatClientAnswer(q, answer) || '(no answer)',
    };
  });

  const { client, industryName, businessDomains, assessment } = ctx;

  let questionAnalyses: import('./demoStore.js').QuestionAnalysis[] = [];
  let executive_summary = '';
  let key_findings: string[] = [];
  let recommendations: string[] = [];

  if (isGeminiConfigured() && qaPayload.length > 0) {
    const prompt = `You are a senior AI readiness assessor scoring a COMPLETED live client session.

CLIENT: ${client.company_name} (${industryName})
DOMAINS: ${businessDomains.join(', ') || 'General'}
RESEARCH CONTEXT: ${(assessment.pre_assessment_notes || '').slice(0, 3000)}

For EACH question below, compare the client's actual response against the manager's expected benchmark.
Score 1-5 (1=immature/no alignment, 3=partial, 5=exceeds benchmark).
Provide honest, specific analysis referencing their actual words.

QUESTIONS & RESPONSES:
${JSON.stringify(qaPayload, null, 2)}

Return JSON with:
- executive_summary: 3-4 sentence overall assessment for ${client.company_name}
- key_findings: 4-6 bullet insights from the session
- recommendations: 3-5 prioritized next steps
- question_analyses: one entry per question_id with score, analysis, strengths[], gaps[], client_answer_summary`;

    try {
      const result = await geminiGenerateJSON<{
        executive_summary: string;
        key_findings: string[];
        recommendations: string[];
        question_analyses: Array<{
          question_id: string;
          score: number;
          analysis: string;
          strengths?: string[];
          gaps?: string[];
          client_answer_summary: string;
        }>;
      }>(prompt, SESSION_SCORE_SCHEMA);

      executive_summary = result.executive_summary || '';
      key_findings = result.key_findings || [];
      recommendations = result.recommendations || [];

      questionAnalyses = (result.question_analyses || []).map((a) => {
        const q = questions.find((qq) => qq.id === a.question_id);
        const driver = q ? demoStore.masters.drivers.find((d) => d.id === q.driver_id) : null;
        return {
          question_id: a.question_id,
          question_text: q?.question_text,
          driver_key: driver?.driver_key,
          driver_name: driver?.driver_name,
          score: Math.min(5, Math.max(1, Math.round(a.score * 10) / 10)),
          analysis: a.analysis,
          strengths: a.strengths || [],
          gaps: a.gaps || [],
          client_answer_summary: a.client_answer_summary,
          expected_answer: q?.expected_answer ?? null,
        };
      });
    } catch {
      /* fall through to heuristic */
    }
  }

  if (questionAnalyses.length === 0) {
    questionAnalyses = questions.map((q) => {
      const answer = answers.find((a) => a.question_id === q.id);
      const driver = demoStore.masters.drivers.find((d) => d.id === q.driver_id);
      const h = heuristicQuestionScore(q, answer);
      return {
        question_id: q.id,
        question_text: q.question_text,
        driver_key: driver?.driver_key,
        driver_name: driver?.driver_name,
        score: h.score,
        analysis: h.analysis,
        strengths: h.score >= 4 ? ['Response aligns with expected benchmark'] : [],
        gaps: h.score <= 2 ? ['Gap vs expected benchmark or incomplete answer'] : [],
        client_answer_summary: h.summary,
        expected_answer: q.expected_answer ?? null,
      };
    });
    executive_summary = `${client.company_name} completed a live AI readiness session across ${questions.length} questions. Overall maturity reflects current responses vs manager benchmarks.`;
    key_findings = questionAnalyses.filter((a) => a.score <= 2).slice(0, 3).map((a) => `Gap identified: ${a.driver_name || 'area'} — ${a.analysis}`);
    if (key_findings.length === 0) key_findings = ['Session captured responses across all active assessment drivers.'];
    recommendations = ['Review driver scores below industry benchmark', 'Prioritize gap analysis and solution mapping', 'Schedule follow-up on lowest-scoring areas'];
  }

  const driver_scores = aggregateDriverScores(questions, questionAnalyses);
  const values = Object.values(driver_scores);
  const overall_score = values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
    : Math.round((questionAnalyses.reduce((s, a) => s + a.score, 0) / Math.max(questionAnalyses.length, 1)) * 100) / 100;

  const stage = resolveMaturityStage(overall_score);

  return {
    driver_scores,
    overall_score,
    maturity_stage_id: stage.id,
    maturity_stage_name: stage.stage_name,
    executive_summary,
    key_findings,
    recommendations,
    question_analyses: questionAnalyses,
    benchmark_comparison: buildBenchmarkComparison(assessmentId, driver_scores),
  };
}

export async function transcribeSessionAudio(
  audioBase64: string,
  mimeType: string,
  questionText: string,
  companyName: string,
): Promise<string> {
  const contextPrompt = `Transcribe this client spoken answer during an AI readiness live assessment for ${companyName}.
Question asked: "${questionText}"
Return ONLY the verbatim transcription of what the client said. No commentary.`;

  if (isGeminiConfigured()) {
    try {
      return await geminiTranscribeAudio(audioBase64, mimeType, contextPrompt);
    } catch { /* fallback below */ }
  }

  return `Client verbal response regarding: ${questionText.slice(0, 120)}... (Configure GEMINI_API_KEY for real transcription)`;
}
