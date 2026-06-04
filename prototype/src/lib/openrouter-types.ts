export type ORChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; reasoning_details?: unknown }
  | { role: 'system'; content: string }

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
