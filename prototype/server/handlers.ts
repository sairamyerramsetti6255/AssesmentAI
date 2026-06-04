import type { IncomingMessage, ServerResponse } from 'node:http'
import type OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import type { ChatRequestBody, ChatCompletionResponse, ORChatMessage } from './types'
import type { OpenRouterConfig } from './openrouter-client'

function readJsonBody(req: IncomingMessage): Promise<ChatRequestBody> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve((raw ? JSON.parse(raw) : {}) as ChatRequestBody)
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

type ORAssistantMessage = {
  role: 'assistant'
  content: string | null
  reasoning_details?: unknown
}

export async function handleChatCompletion(
  client: OpenAI,
  config: OpenRouterConfig,
  body: ChatRequestBody,
): Promise<ChatCompletionResponse> {
  const model = body.model ?? config.model // defaults to nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
  const messages = body.messages ?? []

  const apiResponse = (await client.chat.completions.create({
    model,
    messages,
    stream: false,
    ...(body.reasoning ? { reasoning: { enabled: true } } : {}),
  } as Parameters<OpenAI['chat']['completions']['create']>[0])) as ChatCompletion

  const message = apiResponse.choices[0]?.message as ORAssistantMessage | undefined

  return {
    content: message?.content ?? null,
    reasoning_details: message?.reasoning_details,
    model,
  }
}

export async function handleChatStream(
  client: OpenAI,
  config: OpenRouterConfig,
  body: ChatRequestBody,
  res: ServerResponse,
) {
  const model = body.model ?? config.model // defaults to nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
  const messages = body.messages ?? []

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
    ...(body.reasoning ? { reasoning: { enabled: true } } : {}),
  } as Parameters<OpenAI['chat']['completions']['create']>[0])

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  for await (const chunk of stream as AsyncIterable<{
    choices?: { delta?: { content?: string | null } }[]
  }>) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`)
    }
  }
  res.write('data: [DONE]\n\n')
  res.end()
}

export function createApiMiddleware(
  client: OpenAI,
  config: OpenRouterConfig,
) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0] ?? ''

    if (req.method !== 'POST' || !url.startsWith('/api/chat/')) {
      next()
      return
    }

    try {
      const body = await readJsonBody(req)

      if (url === '/api/chat/completions/stream' || body.stream) {
        await handleChatStream(client, config, body, res)
        return
      }

      if (url === '/api/chat/completions') {
        const result = await handleChatCompletion(client, config, body)
        sendJson(res, 200, result)
        return
      }

      sendJson(res, 404, { error: 'Not found' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OpenRouter request failed'
      sendJson(res, 500, { error: message })
    }
  }
}

export function buildReasoningFollowUpMessages(
  userPrompt: string,
  followUpPrompt: string,
  first: ChatCompletionResponse,
): ORChatMessage[] {
  return [
    { role: 'user', content: userPrompt },
    {
      role: 'assistant',
      content: first.content ?? '',
      reasoning_details: first.reasoning_details,
    },
    { role: 'user', content: followUpPrompt },
  ]
}
