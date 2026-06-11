import dotenv from 'dotenv';
dotenv.config();
/** Stable Gemini 2.5 Flash — best price/performance for structured JSON generation */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export function getGeminiApiKey() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !geminiKey.includes('your-') && geminiKey.length > 10)
        return geminiKey;
    const legacyKey = process.env.OPENAI_API_KEY;
    if (legacyKey?.startsWith('AIza'))
        return legacyKey;
    return geminiKey || undefined;
}
export function isGeminiConfigured() {
    const key = getGeminiApiKey();
    return Boolean(key && !key.startsWith('sk-placeholder'));
}
/** Strip markdown fences and parse JSON reliably from model output */
export function extractJsonText(raw) {
    let text = raw.trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(text);
    if (fence)
        text = fence[1].trim();
    if (text.startsWith('{') || text.startsWith('['))
        return text;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start)
        return text.slice(start, end + 1);
    return text;
}
export function parseGeminiJson(raw) {
    const text = extractJsonText(raw);
    try {
        return JSON.parse(text);
    }
    catch {
        const repaired = text
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/[\u201C\u201D]/g, '"');
        return JSON.parse(repaired);
    }
}
export async function geminiGenerateText(prompt, options = {}) {
    const apiKey = getGeminiApiKey();
    if (!apiKey)
        throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in server/.env');
    const { json = false, responseSchema, temperature = 0.4, maxOutputTokens = 8192 } = options;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const generationConfig = {
        temperature,
        maxOutputTokens,
    };
    if (json) {
        generationConfig.responseMimeType = 'application/json';
        if (responseSchema)
            generationConfig.responseSchema = responseSchema;
    }
    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig,
            }),
        });
    }
    catch (err) {
        const cause = err instanceof Error && 'cause' in err ? err.cause : null;
        if (cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || cause?.message?.includes('certificate')) {
            throw new Error('TLS error reaching Gemini API. On Windows, restart the server with npm run dev (uses --use-system-ca).');
        }
        throw new Error(`Could not reach Gemini API: ${err instanceof Error ? err.message : 'network error'}`);
    }
    const data = (await res.json());
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
    if (!text)
        throw new Error('Empty response from Gemini');
    return text;
}
export async function geminiGenerateJSON(prompt, responseSchema) {
    const text = await geminiGenerateText(prompt, { json: true, responseSchema });
    return parseGeminiJson(text);
}
/** Transcribe audio using Gemini multimodal (webm/wav/mp3) */
export async function geminiTranscribeAudio(audioBase64, mimeType, contextPrompt) {
    const apiKey = getGeminiApiKey();
    if (!apiKey)
        throw new Error('Gemini API key not configured');
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
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.error?.message || `Gemini transcription failed (${res.status})`);
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text)
        throw new Error('Empty transcription from Gemini');
    return text;
}
