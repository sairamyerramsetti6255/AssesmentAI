import OpenAI from 'openai';
export const OPENROUTER_FREE_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
export function createOpenRouterClient(config) {
    const defaultHeaders = {};
    if (config.siteUrl)
        defaultHeaders['HTTP-Referer'] = config.siteUrl;
    if (config.appName)
        defaultHeaders['X-Title'] = config.appName;
    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: config.apiKey,
        timeout: 120_000,
        maxRetries: 1,
        defaultHeaders: Object.keys(defaultHeaders).length ? defaultHeaders : undefined,
    });
}
export function getOpenRouterConfigFromEnv() {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey)
        return null;
    return {
        apiKey,
        model: process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_FREE_MODEL,
        siteUrl: process.env.OPENROUTER_SITE_URL?.trim(),
        appName: process.env.OPENROUTER_APP_NAME?.trim() || 'AI Readiness Assessment',
    };
}
