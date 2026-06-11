import type { Response } from 'express';
import type OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import type { OpenRouterConfig } from './openrouterClient.js';

export type ORChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'developer' | 'tool';
  content?: string | null;
  reasoning_details?: unknown;
};

export interface ChatRequestBody {
  messages: ORChatMessage[];
  model?: string;
  reasoning?: boolean;
  stream?: boolean;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  content: string | null;
  reasoning_details?: unknown;
  model: string;
}

type ORAssistantMessage = {
  role: 'assistant';
  content: string | null;
  reasoning_details?: unknown;
};

export async function handleChatCompletion(
  client: OpenAI,
  config: OpenRouterConfig,
  body: ChatRequestBody,
): Promise<ChatCompletionResponse> {
  const model = body.model ?? config.model;
  const messages = body.messages ?? [];

  const apiResponse = (await client.chat.completions.create({
    model,
    messages,
    stream: false,
    max_tokens: body.max_tokens ?? 2048,
    ...(body.reasoning ? { reasoning: { enabled: true } } : {}),
  } as Parameters<OpenAI['chat']['completions']['create']>[0])) as ChatCompletion;

  const message = apiResponse.choices[0]?.message as ORAssistantMessage | undefined;

  return {
    content: message?.content ?? null,
    reasoning_details: message?.reasoning_details,
    model,
  };
}

export async function handleChatStream(
  client: OpenAI,
  config: OpenRouterConfig,
  body: ChatRequestBody,
  res: Response,
) {
  const model = body.model ?? config.model;
  const messages = body.messages ?? [];

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
    ...(body.reasoning ? { reasoning: { enabled: true } } : {}),
  } as Parameters<OpenAI['chat']['completions']['create']>[0]);

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  for await (const chunk of stream as AsyncIterable<{
    choices?: { delta?: { content?: string | null } }[];
  }>) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }
  res.write('data: [DONE]\n\n');
  res.end();
}
