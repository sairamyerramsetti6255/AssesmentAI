import OpenAI from 'openai'
import { OPENROUTER_FREE_MODEL } from '../shared/openrouter-model'

export interface OpenRouterConfig {
  apiKey: string
  model: string
  siteUrl?: string
  appName?: string
}

export function createOpenRouterClient(config: OpenRouterConfig) {
  const defaultHeaders: Record<string, string> = {}
  if (config.siteUrl) defaultHeaders['HTTP-Referer'] = config.siteUrl
  if (config.appName) defaultHeaders['X-Title'] = config.appName

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.apiKey,
    defaultHeaders: Object.keys(defaultHeaders).length ? defaultHeaders : undefined,
  })
}

export function getOpenRouterConfigFromEnv(env: Record<string, string>): OpenRouterConfig | null {
  const apiKey = env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) return null

  return {
    apiKey,
    model: env.OPENROUTER_MODEL?.trim() || OPENROUTER_FREE_MODEL,
    siteUrl: env.OPENROUTER_SITE_URL?.trim(),
    appName: env.OPENROUTER_APP_NAME?.trim() || 'AI Readiness Assessment',
  }
}
