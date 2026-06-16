import OpenAI from 'openai';

/** Paid default — reliable structured JSON, low cost. */
export const OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o-mini';

/** Kept for backwards-compat with older imports. */
export const OPENROUTER_FREE_MODEL = OPENROUTER_DEFAULT_MODEL;

/** Fallback model when the primary model returns no JSON. */
export const OPENROUTER_JSON_FALLBACK_MODEL = OPENROUTER_DEFAULT_MODEL;

/** Models that were removed from OpenRouter — ignore stale env values pointing here. */
const DEAD_MODEL_PATTERNS = [/nemotron-3-nano-omni/i, /nemotron-3-nano-30b/i];

function sanitizeModel(model: string | undefined): string {
  const trimmed = model?.trim();
  if (!trimmed) return OPENROUTER_DEFAULT_MODEL;
  if (DEAD_MODEL_PATTERNS.some((re) => re.test(trimmed))) {
    console.warn(`[openrouter] Model "${trimmed}" is unavailable — using ${OPENROUTER_DEFAULT_MODEL}`);
    return OPENROUTER_DEFAULT_MODEL;
  }
  return trimmed;
}

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
    model: sanitizeModel(process.env.OPENROUTER_MODEL),
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim(),
    appName: process.env.OPENROUTER_APP_NAME?.trim() || 'AI Readiness Assessment',
  };
}

export function getOpenRouterJsonModel(): string {
  return sanitizeModel(process.env.OPENROUTER_JSON_MODEL);
}

export function isReasoningModel(model: string): boolean {
  return /reasoning|\/think/i.test(model);
}

export class OpenRouterRateLimitError extends Error {
  readonly status = 429 as const;

  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterRateLimitError';
  }
}

export function isRateLimitMessage(message: string): boolean {
  return /rate limit|429|free-models-per-day/i.test(message);
}
