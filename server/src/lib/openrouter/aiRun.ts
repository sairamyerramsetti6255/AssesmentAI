import type OpenAI from 'openai'
import type { OpenRouterConfig } from './openrouterClient.js';
import { handleChatCompletion } from './chatHandlers.js';
import { extractFirstJsonBlock, parseJsonFromLlm } from './parseJson.js';
import { scrapeWebsite } from './scrape.js';
import { ASSESSMENT_ARCHITECT_SYSTEM } from './assessmentSchema.js';

export interface LeadPayload {
  companyName: string
  industry: string
  domain: string
  country: string
  documents: string[]
}

export interface ResearchResult {
  webScrapeUrl: string
  webScrapeExcerpt: string
  webScrapeError?: string
  webInsights: string[]
  competitors: string[]
  documentInsights: string[]
  executiveBrief: string
}

function reasoningDetailsText(details: unknown): string {
  if (!Array.isArray(details)) return ''
  return details
    .map((detail) => {
      if (typeof detail !== 'object' || detail === null || !('text' in detail)) return ''
      const text = (detail as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
    .join('\n')
}

/** Pull JSON from content and/or reasoning (OpenRouter reasoning models). */
function extractAssistantText(res: { content: string | null; reasoning_details?: unknown }): string {
  const parts: string[] = []
  if (res.content?.trim()) parts.push(res.content.trim())
  const reasoning = reasoningDetailsText(res.reasoning_details)
  if (reasoning) parts.push(reasoning)

  const combined = parts.join('\n\n')
  if (!combined) return ''

  const jsonBlock = extractFirstJsonBlock(combined)
  if (jsonBlock) return jsonBlock

  if (res.content?.trim()) return res.content.trim()
  return reasoning
}

async function complete(
  client: OpenAI,
  config: OpenRouterConfig,
  system: string,
  user: string,
  options?: { reasoning?: boolean; max_tokens?: number },
): Promise<string> {
  const res = await handleChatCompletion(client, config, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    reasoning: options?.reasoning ?? false,
    max_tokens: options?.max_tokens,
  })
  return extractAssistantText(res)
}

/** OpenRouter JSON completion with larger token budget + retry on parse failure. */
async function completeJson<T>(
  client: OpenAI,
  config: OpenRouterConfig,
  system: string,
  user: string,
  options?: { max_tokens?: number; concisePrompt?: string },
): Promise<T> {
  const jsonSystem = `${system}\n\nRespond with valid JSON only — no markdown fences, no prose. Start with {`
  const maxTokens = options?.max_tokens ?? 12000

  const run = async (prompt: string) => {
    const raw = await complete(client, config, jsonSystem, prompt, { max_tokens: maxTokens })
    return parseJsonFromLlm<T>(raw)
  }

  try {
    return await run(user)
  } catch (firstErr) {
    const concise =
      options?.concisePrompt ??
      `${user}\n\nCRITICAL: Previous response was invalid. Return one complete JSON object. Keep arrays short and strings under 120 characters.`
    try {
      return await run(concise)
    } catch {
      throw firstErr instanceof Error ? firstErr : new SyntaxError(String(firstErr))
    }
  }
}

export async function runResearchPipeline(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
): Promise<ResearchResult> {
  const scrape = await scrapeWebsite(lead.domain)

  const docUser = `Company: ${lead.companyName}
Uploaded document filenames (metadata only): ${lead.documents.length ? lead.documents.join(', ') : 'none'}

Return JSON only:
{"documentInsights":["..."]}
Infer likely discovery themes from filenames (3-5 bullets).`

  const webUser = `Company: ${lead.companyName}
Industry: ${lead.industry}
Country: ${lead.country}
Website URL: ${scrape.url}
${scrape.error ? `Scrape note: ${scrape.error}` : ''}

Website text excerpt:
${scrape.excerpt || '(empty)'}

Return JSON only:
{"webInsights":["..."],"competitors":["..."]}
Provide 4-6 webInsights bullets and 3-5 competitor names/programs relevant to AI readiness in this vertical.`

  const [webRaw, docRaw] = await Promise.all([
    complete(
      client,
      config,
      'You analyze company websites for B2B AI discovery. Respond with valid JSON only, no markdown.',
      webUser,
      { max_tokens: 4096 },
    ),
    complete(
      client,
      config,
      'You infer document discovery themes from filenames for enterprise AI assessments. JSON only.',
      docUser,
      { max_tokens: 2048 },
    ),
  ])
  let webInsights: string[] = []
  let competitors: string[] = []
  try {
    const parsed = parseJsonFromLlm<{ webInsights: string[]; competitors: string[] }>(webRaw)
    webInsights = parsed.webInsights ?? []
    competitors = parsed.competitors ?? []
  } catch {
    webInsights = [webRaw.slice(0, 500)]
  }
  let documentInsights: string[] = []
  try {
    const parsed = parseJsonFromLlm<{ documentInsights: string[] }>(docRaw)
    documentInsights = parsed.documentInsights ?? []
  } catch {
    documentInsights = [docRaw.slice(0, 400)]
  }

  const briefUser = `Company: ${lead.companyName}
Industry: ${lead.industry}
Country: ${lead.country}
Domain: ${lead.domain}

Web insights: ${webInsights.join(' | ')}
Competitors: ${competitors.join(' | ')}
Documents: ${documentInsights.join(' | ')}

Write an executive discovery brief (8-10 bullet points, plain text, no JSON).`

  const executiveBrief = await complete(
    client,
    config,
    'You are a senior AI readiness consultant writing an executive discovery brief.',
    briefUser,
  )

  return {
    webScrapeUrl: scrape.url,
    webScrapeExcerpt: scrape.excerpt.slice(0, 2000),
    webScrapeError: scrape.error,
    webInsights,
    competitors,
    documentInsights,
    executiveBrief,
  }
}

export interface GeneratedQuestionPayload {
  taxonomyPillar: string
  domainContext: string
  category?: string
  text: string
  type: string
  options?: string[]
  suggestedOptions?: string[]
  sortOrder: number
}

const OTHER = 'Other'

function normalizeGeneratedQuestion(q: GeneratedQuestionPayload): GeneratedQuestionPayload {
  let type = q.type
  if (type === 'multiselect') type = 'multichoice'
  if (type === 'slider' || type === 'rating') type = 'scale'
  if (type === 'richtext') type = 'text'
  if (!['singlechoice', 'multichoice', 'scale', 'text'].includes(type)) {
    type = q.options?.length ? 'multichoice' : 'text'
  }

  let options = q.options
  if (type === 'singlechoice' || type === 'multichoice') {
    const base = (options ?? []).filter((o) => o && o !== OTHER)
    options = [...base, OTHER]
  } else {
    options = undefined
  }

  return { ...q, type, options }
}

export interface AssessmentGenerationResult {
  userDomain: string
  taxonomy: {
    technicalPainPoints: string[]
    operationalPainAreas: string[]
    processImprovements: string[]
  }
  questions: GeneratedQuestionPayload[]
}

export async function generateAssessmentQuestions(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
  research: ResearchResult,
): Promise<AssessmentGenerationResult> {
  const userDomain = `${lead.industry} — ${lead.companyName} (${lead.country})`

  const user = `[User Domain]: ${userDomain}

Company domain/URL: ${lead.domain}
Research brief:
${research.executiveBrief}

Web insights: ${research.webInsights.join('; ')}
Competitors: ${research.competitors.join('; ')}
Document themes: ${research.documentInsights.join('; ')}

Populate the modular assessment configuration for this domain. Generate 12 ordered questions.
"options" = choices shown to the CLIENT in the portal (specific, selectable).
"suggestedOptions" = extra choices executives may inject later (not default client-facing).
Keep option labels short (under 8 words). Return one complete JSON object.`

  const parsed = await completeJson<AssessmentGenerationResult>(
    client,
    config,
    ASSESSMENT_ARCHITECT_SYSTEM,
    user,
    {
      max_tokens: 16000,
      concisePrompt: `${user}\n\nCRITICAL: Return complete valid JSON with exactly 10 questions. Max 5 options per question. No markdown.`,
    },
  )
  const questions = (parsed.questions ?? []).map((q, i) => normalizeGeneratedQuestion({
    ...q,
    sortOrder: q.sortOrder ?? i,
  }))
  return {
    userDomain: parsed.userDomain ?? userDomain,
    taxonomy: parsed.taxonomy ?? {
      technicalPainPoints: [],
      operationalPainAreas: [],
      processImprovements: [],
    },
    questions,
  }
}

const REWRITE_QUESTION_SYSTEM = `You rewrite a single enterprise AI readiness assessment question.

Given company context and the current question, produce ONE replacement question with fresh wording and new answer options when applicable.

AUTO-SELECT input type:
- "singlechoice" — 4–6 concrete "options" (do NOT include "Other")
- "multichoice" — 5–7 concrete "options" (do NOT include "Other")
- "scale" — maturity 1–10 (no options)
- "text" — open narrative only when discrete answers are unreasonable

Keep the same taxonomyPillar as requested. domainContext should stay on-theme but may be refined.
suggestedOptions: 2–3 executive-only extras (not client-facing).

Return valid JSON only:
{
  "taxonomyPillar": "Technical Pain Points|Non-Technical / Operational Pain Areas|Process Improvements",
  "domainContext": "string",
  "text": "string",
  "type": "singlechoice|multichoice|scale|text",
  "options": [],
  "suggestedOptions": [],
  "sortOrder": 0
}`

export async function rewriteAssessmentQuestion(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
  research: ResearchResult,
  question: GeneratedQuestionPayload,
  taxonomy: AssessmentGenerationResult['taxonomy'] | undefined,
  peerSummaries: string[],
): Promise<GeneratedQuestionPayload> {
  const user = `Company: ${lead.companyName}
Industry: ${lead.industry}
Country: ${lead.country}
Domain: ${lead.domain}

Research brief (excerpt):
${research.executiveBrief.slice(0, 1200)}

Taxonomy reference:
${taxonomy ? JSON.stringify(taxonomy) : '(use pillar themes from current question)'}

REWRITE this question — new wording and new options (do not copy prior options verbatim):
${JSON.stringify({
    taxonomyPillar: question.taxonomyPillar,
    domainContext: question.domainContext,
    text: question.text,
    type: question.type,
    options: question.options?.filter((o) => o !== OTHER),
  })}

Other questions in this assessment (avoid duplicate topics):
${peerSummaries.length ? peerSummaries.join('\n') : '(none)'}

sortOrder must be ${question.sortOrder}.`

  const parsed = await completeJson<GeneratedQuestionPayload>(
    client,
    config,
    REWRITE_QUESTION_SYSTEM,
    user,
    { max_tokens: 4096 },
  )
  return normalizeGeneratedQuestion({
    ...parsed,
    taxonomyPillar: parsed.taxonomyPillar ?? question.taxonomyPillar,
    sortOrder: question.sortOrder,
  })
}

export async function generateDemoClientAnswers(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
  questions: GeneratedQuestionPayload[],
  research: ResearchResult,
): Promise<{
  answers: Record<string, string | number | string[]>
  richtext: Record<string, string>
}> {
  const user = `Simulate realistic CLIENT answers for a mid-market company undergoing AI readiness assessment.

Company: ${lead.companyName} (${lead.industry})
Brief: ${research.executiveBrief.slice(0, 1500)}

Questions JSON (ordered; multiselect "options" are the only valid client picks):
${JSON.stringify(questions)}

Return JSON only:
{
  "answers": { "q-0": 7, "q-1": ["exact option from question"], "q-2": 4 },
  "richtext": { "q-3": "paragraph answer" }
}
Use keys q-0, q-1, ... in question order (matching array index).
For slider use 1-10, rating 1-5, multiselect MUST use exact strings from that question's "options" array only.`

  return completeJson<{ answers: Record<string, string | number | string[]>; richtext: Record<string, string> }>(
    client,
    config,
    'You simulate plausible enterprise assessment responses. JSON only.',
    user,
    { max_tokens: 8000 },
  )
}

export type ProposalCapability = {
  title: string
  intro: string
  bullets: string[]
}

export type ProposalPhase = {
  title: string
  period: string
  activities: string[]
}

export type ProposalDocumentPayload = {
  solutionName: string
  executiveSummary: string
  businessChallenge: string
  businessChallengePoints: string[]
  proposedSolution: string
  proposedSolutionPoints: string[]
  strategicObjectives: string[]
  mrpApproach: string
  mrpBenefits: string[]
  mrpWorkflowFocus: string
  functionalCapabilities: ProposalCapability[]
  securityPrinciples: string[]
  governancePrinciples: string[]
  implementationPhases: ProposalPhase[]
  expectedOutcomes: string[]
  successIndicators: string[]
  futureEnhancements: string[]
  discussionItems: string[]
  closingStatement: string
}

export async function generateProposalContent(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
  research: ResearchResult,
  clientAnswersSummary: string,
): Promise<{
  summary: string
  nextSteps: string[]
  useCases: { gap: string; solution: string; horizon: 'pilot' | 'long_term'; impact: 'high' | 'medium' }[]
  architecture: { hosting: string; pipelines: string; access: string; security: string }
  document: ProposalDocumentPayload
}> {
  const user = `Draft a PBS-style "Executive Solution Overview & Scope of Work" for ${lead.companyName} (${lead.industry}, ${lead.country}).

Prepared by Proficient Business Service Ltd. (PBS). Follow the Genesis Watch AI scope-of-work structure: executive summary, business challenge, proposed solution, MRP approach, functional capabilities, security/governance, 4-week implementation timeline, outcomes, and closing.

DISCOVERY BRIEF:
${research.executiveBrief.slice(0, 2000)}

WEB INSIGHTS: ${research.webInsights.join(' | ')}
COMPETITORS: ${research.competitors.join(' | ')}

FULL CLIENT ASSESSMENT RESPONSES (read every answer before proposing):
${clientAnswersSummary.slice(0, 12000)}

Return JSON only:
{
  "document": {
    "solutionName": "${lead.companyName} AI or similar branded solution name",
    "executiveSummary": "3-5 paragraphs referencing specific client answers",
    "businessChallenge": "2-3 sentences on operational context",
    "businessChallengePoints": ["5-8 specific pain points from client answers"],
    "proposedSolution": "2-3 sentences overview",
    "proposedSolutionPoints": ["5-7 capability bullets"],
    "strategicObjectives": ["5-6 objectives"],
    "mrpApproach": "2-3 sentences on Minimum Remarkable Product",
    "mrpBenefits": ["4-5 MRP benefits"],
    "mrpWorkflowFocus": "Detect → Prioritize → Escalate → Validate → Track (adapt to client)",
    "functionalCapabilities": [
      {"title":"Capability name","intro":"1-2 sentences","bullets":["3-5 feature bullets"]}
    ],
    "securityPrinciples": ["5-7 security principles"],
    "governancePrinciples": ["4-6 governance principles"],
    "implementationPhases": [
      {"title":"Phase 1 — Discovery & Workflow Alignment","period":"Week 1","activities":["4 activities"]},
      {"title":"Phase 2 — Core Platform Development","period":"Week 2","activities":["4 activities"]},
      {"title":"Phase 3 — Escalation & Validation Workflows","period":"Week 3","activities":["4 activities"]},
      {"title":"Phase 4 — Testing, Pilot & Validation","period":"Week 4","activities":["4 activities"]}
    ],
    "expectedOutcomes": ["5-7 outcomes after MRP"],
    "successIndicators": ["6-8 measurable KPIs"],
    "futureEnhancements": ["4-6 future options"],
    "discussionItems": ["6-8 executive alignment topics"],
    "closingStatement": "Professional closing referencing PBS collaboration with ${lead.companyName}"
  },
  "summary": "same as document.executiveSummary first paragraph",
  "nextSteps": ["from discussionItems or implementation kickoff steps"],
  "useCases": [
    {"gap":"specific pain","solution":"concrete AI capability","horizon":"pilot|long_term","impact":"high|medium"}
  ],
  "architecture": {
    "hosting": "2-3 sentences",
    "pipelines": "2-3 sentences",
    "access": "2-3 sentences",
    "security": "2-3 sentences"
  }
}
Provide exactly 4 useCases and 4 functionalCapabilities grounded in client responses. Keep each string under 2 sentences. Be specific — no generic filler. Return one complete JSON object — no markdown fences.`

  const system =
    'You are a senior AI strategy consultant at Proficient Business Service Ltd. (PBS) writing client-ready scope-of-work documents. Respond with valid JSON only — no prose, no code fences.'

  type ProposalParseResult = {
    summary?: string
    nextSteps?: string[]
    useCases: { gap: string; solution: string; horizon: 'pilot' | 'long_term'; impact: 'high' | 'medium' }[]
    architecture: { hosting: string; pipelines: string; access: string; security: string }
    document?: ProposalDocumentPayload
  }

  const parseProposalJson = async (prompt: string): Promise<ProposalParseResult> => {
    const raw = await complete(client, config, system, prompt, { max_tokens: 12000 })
    return parseJsonFromLlm<ProposalParseResult>(raw)
  }

  let parsed: ProposalParseResult
  try {
    parsed = await parseProposalJson(user)
  } catch {
    const concise = `${user}

CRITICAL: Previous response was truncated. Return valid complete JSON. Limit every array to 4 items max. Keep paragraphs to 1-2 sentences.`
    parsed = await parseProposalJson(concise)
  }

  const doc = parsed.document ?? buildFallbackProposalDocument(lead, parsed)

  return {
    summary: parsed.summary ?? doc.executiveSummary,
    nextSteps: parsed.nextSteps ?? doc.discussionItems?.slice(0, 6) ?? ['Schedule executive readout'],
    useCases: parsed.useCases ?? [],
    architecture: parsed.architecture ?? {
      hosting: doc.securityPrinciples?.[0] ?? 'Private deployment architecture',
      pipelines: 'Configured data ingestion and AI classification pipelines',
      access: doc.governancePrinciples?.[0] ?? 'Role-based access controls with human validation',
      security: doc.securityPrinciples?.join('; ') ?? 'Controlled data handling with full auditability',
    },
    document: doc,
  }
}

function buildFallbackProposalDocument(
  lead: LeadPayload,
  parsed: {
    summary?: string
    useCases?: { gap: string; solution: string }[]
    architecture?: { hosting?: string; security?: string; access?: string }
  },
): ProposalDocumentPayload {
  const useCases = parsed.useCases ?? []
  return {
    solutionName: `${lead.companyName} AI`,
    executiveSummary: parsed.summary ?? `AI readiness blueprint for ${lead.companyName}.`,
    businessChallenge: `${lead.companyName} operates in ${lead.industry} where manual processes create operational risk and limited visibility.`,
    businessChallengePoints: useCases.map((u) => u.gap),
    proposedSolution: `An AI-assisted platform for ${lead.companyName} focused on governed operational intelligence.`,
    proposedSolutionPoints: useCases.map((u) => u.solution),
    strategicObjectives: ['Improve operational visibility', 'Reduce manual triage', 'Maintain human oversight'],
    mrpApproach: 'Delivered as a Minimum Remarkable Product for rapid validation.',
    mrpBenefits: ['Rapid validation', 'Reduced complexity', 'Early governance'],
    mrpWorkflowFocus: 'Detect → Prioritize → Escalate → Validate → Track',
    functionalCapabilities: useCases.map((u) => ({
      title: u.gap,
      intro: u.solution,
      bullets: ['Configured for client environment', 'Human validation required'],
    })),
    securityPrinciples: [parsed.architecture?.security ?? 'Private deployment', 'Role-based access'],
    governancePrinciples: [parsed.architecture?.access ?? 'Human validation mandatory'],
    implementationPhases: [
      { title: 'Phase 1 — Discovery', period: 'Week 1', activities: ['Align workflows'] },
      { title: 'Phase 2 — Development', period: 'Week 2', activities: ['Build core platform'] },
      { title: 'Phase 3 — Workflows', period: 'Week 3', activities: ['Configure escalation'] },
      { title: 'Phase 4 — Pilot', period: 'Week 4', activities: ['Test and validate'] },
    ],
    expectedOutcomes: ['Functional AI-assisted platform', 'Improved visibility'],
    successIndicators: ['High classification accuracy', 'Positive user adoption'],
    futureEnhancements: ['Expanded integrations', 'Advanced analytics'],
    discussionItems: ['Workflow priorities', 'Security preferences'],
    closingStatement: `PBS looks forward to collaborating with ${lead.companyName} on implementation.`,
  }
}
