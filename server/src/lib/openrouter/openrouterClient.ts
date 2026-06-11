import OpenAI from 'openai';

export const OPENROUTER_FREE_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

/** Non-reasoning fallback when the primary model returns no JSON (free tier). */
export const OPENROUTER_JSON_FALLBACK_MODEL = 'google/gemma-3-12b-it:free';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  appName?: string;
}

export function createOpenRouterClient(config: OpenRouterConfig) {
  const defaultHeaders: Record<string, string> = {};
  if (config.siteUrl) defaultHeaders['HTTP-Referer'] = config.siteUrl;
  if (config.appName) defaultHeaders['X-Title'] = config.appName;

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.apiKey,
    timeout: 300_000,
    maxRetries: 1,
    defaultHeaders: Object.keys(defaultHeaders).length ? defaultHeaders : undefined,
  });
}

export function getOpenRouterConfigFromEnv(): OpenRouterConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_FREE_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim(),
    appName: process.env.OPENROUTER_APP_NAME?.trim() || 'AI Readiness Assessment',
  };
}

export function getOpenRouterJsonModel(): string {
  return process.env.OPENROUTER_JSON_MODEL?.trim() || OPENROUTER_JSON_FALLBACK_MODEL;
}

export function isReasoningModel(model: string): boolean {
  return /reasoning|\/think/i.test(model);
}
