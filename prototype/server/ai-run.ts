import type OpenAI from 'openai'
import type { OpenRouterConfig } from './openrouter-client'
import { handleChatCompletion } from './handlers'
import { parseJsonFromLlm } from './parse-json'
import { scrapeWebsite } from './scrape'
import { ASSESSMENT_ARCHITECT_SYSTEM } from '../shared/assessment-schema'

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

async function complete(
  client: OpenAI,
  config: OpenRouterConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await handleChatCompletion(client, config, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    reasoning: true,
  })
  return res.content ?? ''
}

export async function runResearchPipeline(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
): Promise<ResearchResult> {
  const scrape = await scrapeWebsite(lead.domain)

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

  const webRaw = await complete(
    client,
    config,
    'You analyze company websites for B2B AI discovery. Respond with valid JSON only, no markdown.',
    webUser,
  )
  let webInsights: string[] = []
  let competitors: string[] = []
  try {
    const parsed = parseJsonFromLlm<{ webInsights: string[]; competitors: string[] }>(webRaw)
    webInsights = parsed.webInsights ?? []
    competitors = parsed.competitors ?? []
  } catch {
    webInsights = [webRaw.slice(0, 500)]
  }

  const docUser = `Company: ${lead.companyName}
Uploaded document filenames (metadata only): ${lead.documents.length ? lead.documents.join(', ') : 'none'}

Return JSON only:
{"documentInsights":["..."]}
Infer likely discovery themes from filenames (3-5 bullets).`

  const docRaw = await complete(
    client,
    config,
    'You infer document discovery themes from filenames for enterprise AI assessments. JSON only.',
    docUser,
  )
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

Populate the modular assessment configuration for this domain. Generate 12–15 ordered questions.
"options" = choices shown to the CLIENT in the portal (specific, selectable).
"suggestedOptions" = extra choices executives may inject later (not default client-facing).`

  const raw = await complete(client, config, ASSESSMENT_ARCHITECT_SYSTEM, user)

  const parsed = parseJsonFromLlm<AssessmentGenerationResult>(raw)
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

  const raw = await complete(client, config, REWRITE_QUESTION_SYSTEM, user)
  const parsed = parseJsonFromLlm<GeneratedQuestionPayload>(raw)
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

  const raw = await complete(
    client,
    config,
    'You simulate plausible enterprise assessment responses. JSON only.',
    user,
  )

  return parseJsonFromLlm<{ answers: Record<string, string | number | string[]>; richtext: Record<string, string> }>(raw)
}

export async function generateProposalContent(
  client: OpenAI,
  config: OpenRouterConfig,
  lead: LeadPayload,
  research: ResearchResult,
  clientAnswersSummary: string,
): Promise<{
  useCases: { gap: string; solution: string; horizon: 'pilot' | 'long_term'; impact: 'high' | 'medium' }[]
  architecture: { hosting: string; pipelines: string; access: string; security: string }
}> {
  const user = `Based on discovery for ${lead.companyName}:

Brief: ${research.executiveBrief.slice(0, 1200)}
Client answers summary: ${clientAnswersSummary}

Return JSON only:
{
  "useCases":[{"gap":"...","solution":"...","horizon":"pilot|long_term","impact":"high|medium"}],
  "architecture":{"hosting":"...","pipelines":"...","access":"...","security":"..."}
}
Provide 3 useCases.`

  const raw = await complete(
    client,
    config,
    'You draft AI deployment blueprints for enterprise clients. JSON only.',
    user,
  )

  return parseJsonFromLlm(raw)
}
