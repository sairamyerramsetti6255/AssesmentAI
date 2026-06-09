import type { AssessmentQuestion, AssessmentTaxonomy, Lead } from '../types'
import { pillarToCategory } from './questions'
import { normalizeQuestion } from './question-types'
import type { TaxonomyPillar } from '../types'
import { documentNames } from './documents'
import { resolveApiUrl } from './apiBase'
import { OpenRouterApiError } from './openrouter'

export interface ResearchResult {
  webScrapeUrl: string
  webScrapeExcerpt: string
  webScrapeError?: string
  webInsights: string[]
  competitors: string[]
  documentInsights: string[]
  executiveBrief: string
}

export interface AssessmentGenerationResult {
  userDomain: string
  taxonomy: AssessmentTaxonomy
  questions: AssessmentQuestion[]
}

export interface ProposalAiResult {
  useCases: {
    gap: string
    solution: string
    horizon: 'pilot' | 'long_term'
    impact: 'high' | 'medium'
  }[]
  architecture: {
    hosting: string
    pipelines: string
    access: string
    security: string
  }
}

const AI_FETCH_TIMEOUT_MS = 300_000

async function post<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(resolveApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    wrapFetchError(err)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    let msg = res.statusText
    try {
      const err = (await res.json()) as { error?: string }
      msg = err.error ?? msg
    } catch {
      /* ignore */
    }
    throw new OpenRouterApiError(msg, res.status)
  }
  return res.json() as Promise<T>
}

function wrapFetchError(err: unknown): never {
  if (err instanceof DOMException && err.name === 'AbortError') {
    throw new OpenRouterApiError(
      'AI request timed out after 5 minutes. The free model may be busy — try again in a moment.',
      408,
    )
  }
  throw err
}

export function leadToPayload(lead: Lead) {
  return {
    companyName: lead.companyName,
    industry: lead.industry,
    domain: lead.domain,
    country: lead.country,
    documents: documentNames(lead.documents),
  }
}

function mapGeneratedQuestion(
  q: {
    taxonomyPillar: string
    domainContext: string
    category?: string
    text: string
    type: string
    options?: string[]
    suggestedOptions?: string[]
    sortOrder: number
  },
  id: string,
): AssessmentQuestion {
  const pillar = q.taxonomyPillar as TaxonomyPillar
  return normalizeQuestion({
    id,
    sortOrder: q.sortOrder,
    taxonomyPillar: pillar,
    domainContext: q.domainContext ?? '',
    category: (q.category as AssessmentQuestion['category']) ?? pillarToCategory(pillar),
    text: q.text,
    type: q.type as AssessmentQuestion['type'],
    options: q.options,
    suggestedOptions: q.suggestedOptions,
  })
}

export async function checkOpenRouterHealth(): Promise<{
  ok: boolean
  model?: string
  keyConfigured?: boolean
}> {
  const res = await fetch(resolveApiUrl('/api/health/openrouter'))
  if (!res.ok) return { ok: false }
  return res.json() as Promise<{ ok: boolean; model?: string; keyConfigured?: boolean }>
}

export async function runResearchPipeline(lead: Lead): Promise<ResearchResult> {
  return post('/api/research/pipeline', { lead: leadToPayload(lead) })
}

export async function scrapeWebsiteOnly(domain: string) {
  return post<{ url: string; excerpt: string; error?: string }>('/api/research/scrape', {
    domain,
  })
}

export async function generateAssessmentQuestions(
  lead: Lead,
  research: ResearchResult,
): Promise<AssessmentGenerationResult> {
  const raw = await post<{
    userDomain: string
    taxonomy: {
      technicalPainPoints: string[]
      operationalPainAreas: string[]
      processImprovements: string[]
    }
    questions: Omit<AssessmentQuestion, 'id'>[]
  }>('/api/assessment/generate-questions', { lead: leadToPayload(lead), research })

  const base = Date.now()
  const taxonomy: AssessmentTaxonomy = {
    userDomain: raw.userDomain,
    technicalPainPoints: raw.taxonomy.technicalPainPoints,
    operationalPainAreas: raw.taxonomy.operationalPainAreas,
    processImprovements: raw.taxonomy.processImprovements,
  }

  const questions = raw.questions.map((q, i) =>
    mapGeneratedQuestion(
      {
        taxonomyPillar: q.taxonomyPillar,
        domainContext: q.domainContext,
        category: q.category,
        text: q.text,
        type: q.type,
        options: q.options,
        suggestedOptions: q.suggestedOptions,
        sortOrder: q.sortOrder ?? i,
      },
      `q-ai-${base}-${i}`,
    ),
  )

  return { userDomain: raw.userDomain, taxonomy, questions }
}

export async function rewriteAssessmentQuestion(
  lead: Lead,
  research: ResearchResult,
  question: AssessmentQuestion,
  taxonomy: AssessmentTaxonomy | undefined,
  allQuestions: AssessmentQuestion[],
): Promise<AssessmentQuestion> {
  const peerSummaries = allQuestions
    .filter((q) => q.id !== question.id)
    .map((q) => `- [${q.taxonomyPillar}] ${q.text}`)

  const raw = await post<{
    question: {
      taxonomyPillar: string
      domainContext: string
      text: string
      type: string
      options?: string[]
      suggestedOptions?: string[]
      sortOrder: number
    }
  }>('/api/assessment/rewrite-question', {
    lead: leadToPayload(lead),
    research,
    taxonomy: taxonomy
      ? {
          technicalPainPoints: taxonomy.technicalPainPoints,
          operationalPainAreas: taxonomy.operationalPainAreas,
          processImprovements: taxonomy.processImprovements,
        }
      : undefined,
    question: {
      taxonomyPillar: question.taxonomyPillar,
      domainContext: question.domainContext,
      text: question.text,
      type: question.type,
      options: question.options,
      suggestedOptions: question.suggestedOptions,
      sortOrder: question.sortOrder,
    },
    peerSummaries,
  })

  return mapGeneratedQuestion(
    {
      taxonomyPillar: raw.question.taxonomyPillar,
      domainContext: raw.question.domainContext,
      text: raw.question.text,
      type: raw.question.type,
      options: raw.question.options,
      suggestedOptions: raw.question.suggestedOptions,
      sortOrder: question.sortOrder,
    },
    question.id,
  )
}

export async function generateDemoClientAnswers(
  lead: Lead,
  research: ResearchResult,
  questions: AssessmentQuestion[],
): Promise<{
  answers: Record<string, string | number | string[]>
  richtext: Record<string, string>
}> {
  const payload = questions.map((q) => ({
    taxonomyPillar: q.taxonomyPillar,
    domainContext: q.domainContext,
    text: q.text,
    type: q.type,
    options: q.options,
  }))
  const raw = await post<{
    answers: Record<string, string | number | string[]>
    richtext: Record<string, string>
  }>('/api/assessment/generate-demo-answers', {
    lead: leadToPayload(lead),
    research,
    questions: payload,
  })

  const answers: Record<string, string | number | string[]> = {}
  const richtext: Record<string, string> = {}

  questions.forEach((q, i) => {
    const key = `q-${i}`
    if (raw.answers[key] !== undefined) answers[q.id] = raw.answers[key]
    if (raw.richtext[key]) richtext[q.id] = raw.richtext[key]
    if (raw.answers[q.id] !== undefined) answers[q.id] = raw.answers[q.id]
    if (raw.richtext[q.id]) richtext[q.id] = raw.richtext[q.id]
  })

  return { answers, richtext }
}

export async function generateProposalFromDiscovery(
  lead: Lead,
  research: ResearchResult,
  clientAnswersSummary: string,
): Promise<ProposalAiResult> {
  return post('/api/assessment/generate-proposal', {
    lead: leadToPayload(lead),
    research,
    clientAnswersSummary,
  })
}

export async function runFullDiscoveryPipeline(
  lead: Lead,
  options?: { includeDemoAnswers?: boolean },
): Promise<{
  research: ResearchResult
  taxonomy: AssessmentTaxonomy
  questions: AssessmentQuestion[]
  demoAnswers?: {
    answers: Record<string, string | number | string[]>
    richtext: Record<string, string>
  }
}> {
  const research = await runResearchPipeline(lead)
  const { taxonomy, questions } = await generateAssessmentQuestions(lead, research)
  let demoAnswers
  if (options?.includeDemoAnswers) {
    demoAnswers = await generateDemoClientAnswers(lead, research, questions)
  }
  return { research, taxonomy, questions, demoAnswers }
}
