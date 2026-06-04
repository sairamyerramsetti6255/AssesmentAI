import type { IncomingMessage, ServerResponse } from 'node:http'
import type OpenAI from 'openai'
import type { OpenRouterConfig } from './openrouter-client'
import {
  generateAssessmentQuestions,
  rewriteAssessmentQuestion,
  generateDemoClientAnswers,
  generateProposalContent,
  runResearchPipeline,
  type AssessmentGenerationResult,
  type GeneratedQuestionPayload,
  type LeadPayload,
  type ResearchResult,
} from './ai-run'
import { scrapeWebsite } from './scrape'

function readBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
    })
    req.on('end', () => {
      try {
        resolve((raw ? JSON.parse(raw) : {}) as T)
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function createResearchMiddleware(client: OpenAI, config: OpenRouterConfig) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0] ?? ''

    if (url === '/api/health/openrouter' && req.method === 'GET') {
      json(res, 200, { ok: true, model: config.model, keyConfigured: true })
      return
    }

    if (req.method !== 'POST' || !url.startsWith('/api/')) {
      next()
      return
    }

    try {
      if (url === '/api/research/pipeline') {
        const { lead } = await readBody<{ lead: LeadPayload }>(req)
        const result = await runResearchPipeline(client, config, lead)
        json(res, 200, result)
        return
      }

      if (url === '/api/research/scrape') {
        const { domain } = await readBody<{ domain: string }>(req)
        const scrape = await scrapeWebsite(domain)
        json(res, 200, scrape)
        return
      }

      if (url === '/api/assessment/generate-questions') {
        const { lead, research } = await readBody<{
          lead: LeadPayload
          research: ResearchResult
        }>(req)
        const generated = await generateAssessmentQuestions(client, config, lead, research)
        json(res, 200, generated)
        return
      }

      if (url === '/api/assessment/rewrite-question') {
        const { lead, research, question, taxonomy, peerSummaries } = await readBody<{
          lead: LeadPayload
          research: ResearchResult
          question: GeneratedQuestionPayload
          taxonomy?: AssessmentGenerationResult['taxonomy']
          peerSummaries?: string[]
        }>(req)
        const rewritten = await rewriteAssessmentQuestion(
          client,
          config,
          lead,
          research,
          question,
          taxonomy,
          peerSummaries ?? [],
        )
        json(res, 200, { question: rewritten })
        return
      }

      if (url === '/api/assessment/generate-demo-answers') {
        const { lead, research, questions } = await readBody<{
          lead: LeadPayload
          research: ResearchResult
          questions: GeneratedQuestionPayload[]
        }>(req)
        const generated = await generateDemoClientAnswers(
          client,
          config,
          lead,
          questions,
          research,
        )
        json(res, 200, generated)
        return
      }

      if (url === '/api/assessment/generate-proposal') {
        const { lead, research, clientAnswersSummary } = await readBody<{
          lead: LeadPayload
          research: ResearchResult
          clientAnswersSummary: string
        }>(req)
        const proposal = await generateProposalContent(
          client,
          config,
          lead,
          research,
          clientAnswersSummary,
        )
        json(res, 200, proposal)
        return
      }

      next()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed'
      json(res, 500, { error: message })
    }
  }
}
