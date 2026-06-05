import { OPENROUTER_FREE_MODEL } from '../../shared/openrouter-model'
import { resolveApiUrl } from './apiBase'
import type { ChatCompletionResponse, ChatRequestBody, ORChatMessage } from './openrouter-types'

export { OPENROUTER_FREE_MODEL }

export class OpenRouterApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'OpenRouterApiError'
    this.status = status
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? res.statusText
  } catch {
    return res.statusText || 'Request failed'
  }
}

function withDefaultModel(body: ChatRequestBody): ChatRequestBody {
  return {
    ...body,
    model: body.model ?? OPENROUTER_FREE_MODEL,
  }
}

/** Non-streaming completion — uses free Nemotron reasoning model by default. */
export async function chatCompletion(
  body: ChatRequestBody,
): Promise<ChatCompletionResponse> {
  const res = await fetch(resolveApiUrl('/api/chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withDefaultModel(body)),
  })
  if (!res.ok) throw new OpenRouterApiError(await parseError(res), res.status)
  return res.json() as Promise<ChatCompletionResponse>
}

/** Streaming completion — free Nemotron model, reasoning optional. */
export async function chatCompletionStream(
  messages: ORChatMessage[],
  onToken: (text: string) => void,
  options?: { reasoning?: boolean },
): Promise<void> {
  const res = await fetch(resolveApiUrl('/api/chat/completions/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      withDefaultModel({
        messages,
        reasoning: options?.reasoning ?? true,
        stream: true,
      }),
    ),
  })
  if (!res.ok) throw new OpenRouterApiError(await parseError(res), res.status)
  if (!res.body) throw new OpenRouterApiError('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload) as { content?: string }
        if (parsed.content) onToken(parsed.content)
      } catch {
        /* ignore malformed chunks */
      }
    }
  }
}

/** Two-turn reasoning flow — free Nemotron with reasoning_details preserved. */
export async function reasoningDemoTurns(
  userPrompt: string,
  followUpPrompt: string,
): Promise<{ first: ChatCompletionResponse; second: ChatCompletionResponse }> {
  const first = await chatCompletion({
    messages: [{ role: 'user', content: userPrompt }],
    reasoning: true,
  })

  const messages: ORChatMessage[] = [
    { role: 'user', content: userPrompt },
    {
      role: 'assistant',
      content: first.content ?? '',
      reasoning_details: first.reasoning_details,
    },
    { role: 'user', content: followUpPrompt },
  ]

  const second = await chatCompletion({ messages, reasoning: true })
  return { first, second }
}

/** Generate agent research summary for a lead intake record. */
export async function generateLeadResearchBrief(input: {
  companyName: string
  industry: string
  domain: string
  country: string
  documents: string[]
}): Promise<string> {
  const docList = input.documents.length ? input.documents.join(', ') : 'none uploaded'
  const result = await chatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a B2B AI readiness consultant. Output concise bullet points: web signals, competitive context, and document insights. No markdown headers.',
      },
      {
        role: 'user',
        content: `Company: ${input.companyName}
Industry: ${input.industry}
Domain: ${input.domain}
Country: ${input.country}
Documents: ${docList}

Produce 6-8 bullet points for an executive discovery brief.`,
      },
    ],
    reasoning: true,
  })
  return result.content ?? 'No response from model.'
}
