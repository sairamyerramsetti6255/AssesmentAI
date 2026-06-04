import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

/** OpenRouter extends assistant messages with reasoning_details for multi-turn reasoning models */
export type ORChatMessage = ChatCompletionMessageParam & {
  reasoning_details?: unknown
}

export interface ChatRequestBody {
  messages: ORChatMessage[]
  model?: string
  reasoning?: boolean
  stream?: boolean
}

export interface ChatCompletionResponse {
  content: string | null
  reasoning_details?: unknown
  model: string
}
