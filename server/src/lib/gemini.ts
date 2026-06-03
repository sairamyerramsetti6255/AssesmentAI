import dotenv from 'dotenv';

dotenv.config();

/** Stable Gemini 2.5 Flash — best price/performance for structured JSON generation */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function getGeminiApiKey(): string | undefined {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.includes('your-') && geminiKey.length > 10) return geminiKey;
  const legacyKey = process.env.OPENAI_API_KEY;
  if (legacyKey?.startsWith('AIza')) return legacyKey;
  return geminiKey || undefined;
}

export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && !key.startsWith('sk-placeholder'));
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; status?: string };
}

export interface GeminiGenerateOptions {
  json?: boolean;
  /** OpenAPI-style schema when json is true (Gemini structured output) */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Strip markdown fences and parse JSON reliably from model output */
export function extractJsonText(raw: string): string {
  let text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(text);
  if (fence) text = fence[1].trim();
  if (text.startsWith('{') || text.startsWith('[')) return text;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

export function parseGeminiJson<T>(raw: string): T {
  const text = extractJsonText(raw);
  try {
    return JSON.parse(text) as T;
  } catch {
    const repaired = text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"');
    return JSON.parse(repaired) as T;
  }
}

export async function geminiGenerateText(
  prompt: string,
  options: GeminiGenerateOptions = {},
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in server/.env');

  const { json = false, responseSchema, temperature = 0.4, maxOutputTokens = 8192 } = options;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens,
  };
  if (json) {
    generationConfig.responseMimeType = 'application/json';
    if (responseSchema) generationConfig.responseSchema = responseSchema;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });
  } catch (err) {
    const cause = err instanceof Error && 'cause' in err ? (err.cause as NodeJS.ErrnoException) : null;
    if (cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || cause?.message?.includes('certificate')) {
      throw new Error(
        'TLS error reaching Gemini API. On Windows, restart the server with npm run dev (uses --use-system-ca).',
      );
    }
    throw new Error(`Could not reach Gemini API: ${err instanceof Error ? err.message : 'network error'}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const msg = data.error?.message || `Gemini API error (${res.status})`;
    if (msg.includes('not found') || msg.includes('NOT_FOUND')) {
      throw new Error(`Model "${GEMINI_MODEL}" unavailable. Set GEMINI_MODEL=gemini-2.5-flash in server/.env`);
    }
    if (msg.includes('suspended') || msg.includes('PERMISSION_DENIED') || msg.includes('API key')) {
      throw new Error('Gemini API key invalid or suspended. Create a new key at https://aistudio.google.com/apikey');
    }
    throw new Error(msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

export async function geminiGenerateJSON<T>(
  prompt: string,
  responseSchema?: Record<string, unknown>,
): Promise<T> {
  const text = await geminiGenerateText(prompt, { json: true, responseSchema });
  return parseGeminiJson<T>(text);
}

/** Transcribe audio using Gemini multimodal (webm/wav/mp3) */
export async function geminiTranscribeAudio(
  audioBase64: string,
  mimeType: string,
  contextPrompt: string,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType || 'audio/webm', data: audioBase64 } },
          { text: contextPrompt },
        ],
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    }),
  });

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini transcription failed (${res.status})`);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty transcription from Gemini');
  return text;
}
