import { getOpenRouterConfigFromEnv } from './openrouterClient.js';

const LISTEN_MODEL = 'google/gemini-2.5-flash';

const PROMPT =
  'Listen only to clear English speech. Ignore noise, murmuring, and any other language. ' +
  'If nobody is speaking clear English, reply with exactly NONE. ' +
  'Otherwise summarise what they said in 2 to 4 first-person sentences about the person, the business, and the problems they want to solve. ' +
  'Do not invent names, companies, or facts. Plain text only.';

/** English listen-and-summarise through OpenRouter (Gemini 2.5). Empty string means no clear speech. */
export async function openRouterSummarizeSpeech(audio: Buffer, mimeType: string): Promise<string> {
  const config = getOpenRouterConfigFromEnv();
  if (!config) throw new Error('OpenRouter is not configured on the server.');

  const format = mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : 'wav';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(config.siteUrl ? { 'HTTP-Referer': config.siteUrl } : {}),
      'X-Title': config.appName || 'AI Readiness Assessment',
    },
    body: JSON.stringify({
      model: LISTEN_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'input_audio', input_audio: { data: audio.toString('base64'), format } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenRouter listen failed (${response.status})`);
  }
  const summary = (data.choices?.[0]?.message?.content ?? '').replace(/^["']|["']$/g, '').trim();
  if (!summary || /^none\.?$/i.test(summary)) return '';
  return summary;
}
