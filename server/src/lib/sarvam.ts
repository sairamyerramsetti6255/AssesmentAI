/**
 * Sarvam Saaras speech-to-text (server-side). Keys from dashboard:
 * https://dashboard.sarvam.ai — header `api-subscription-key`.
 * Samvaad platform keys (`sk_samvaad_…`) are for indus.sarvam.ai agents and may not include STT scope.
 */

const DEFAULT_BASE = 'https://api.sarvam.ai';

export interface SarvamConfig {
  baseUrl: string;
  apiKeys: string[];
  appId?: string;
  orgId?: string;
  workspaceId?: string;
}

export function getSarvamConfigFromEnv(): SarvamConfig | null {
  const keys = [process.env.SARVAM_API_KEY, process.env.SARVAM_API_SUBSCRIPTION_KEY]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, all) => all.indexOf(value) === index);

  if (!keys.length) return null;

  return {
    baseUrl: (process.env.SARVAM_API_BASE || DEFAULT_BASE).replace(/\/$/, ''),
    apiKeys: keys,
    appId: process.env.SARVAM_APP_ID?.trim(),
    orgId: process.env.SARVAM_ORG_ID?.trim(),
    workspaceId: process.env.SARVAM_WORKSPACE_ID?.trim(),
  };
}

export interface SarvamHealthResult {
  configured: boolean;
  speechToText: {
    ok: boolean;
    message: string;
    keyKind?: 'subscription' | 'samvaad' | 'none';
  };
  platform: {
    appIdSet: boolean;
    orgIdSet: boolean;
    workspaceIdSet: boolean;
  };
  webCrawl: {
    ok: boolean;
    message: string;
    provider: 'openrouter-scrape';
  };
}

/** Tiny valid WAV for auth probe (silent). */
function probeWav(): Buffer {
  return Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', 'base64');
}

async function probeSpeechToTextKey(baseUrl: string, apiKey: string): Promise<{ ok: boolean; message: string }> {
  const form = new FormData();
  form.append('file', new Blob([probeWav()], { type: 'audio/wav' }), 'probe.wav');
  form.append('language_code', 'en-IN');

  const res = await fetch(`${baseUrl}/speech-to-text`, {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey },
    body: form,
    signal: AbortSignal.timeout(25_000),
  });

  const body = await res.text();
  if (res.status === 403) {
    let code = '';
    try {
      code = JSON.parse(body).error?.code ?? '';
    } catch {
      /* ignore */
    }
    if (code === 'invalid_api_key_error') {
      return { ok: false, message: 'Key rejected for Speech-to-Text (invalid or wrong product/scopes).' };
    }
  }
  if (res.ok) {
    return { ok: true, message: 'Speech-to-Text accepted this key.' };
  }
  if (res.status === 422 || res.status === 400) {
    return { ok: true, message: 'Key is valid for Speech-to-Text (probe audio was too short or empty).' };
  }
  return { ok: false, message: `Speech-to-Text returned ${res.status}: ${body.slice(0, 200)}` };
}

export async function checkSarvamHealth(): Promise<SarvamHealthResult> {
  const config = getSarvamConfigFromEnv();
  const platform = {
    appIdSet: Boolean(config?.appId),
    orgIdSet: Boolean(config?.orgId),
    workspaceIdSet: Boolean(config?.workspaceId),
  };

  const webCrawl = {
    ok: true,
    message: 'Website crawl uses the assessment server (HTML fetch + OpenRouter research), not Sarvam.',
    provider: 'openrouter-scrape' as const,
  };

  if (!config) {
    return {
      configured: false,
      speechToText: { ok: false, message: 'No SARVAM_API_SUBSCRIPTION_KEY or SARVAM_SAMVAAD_API_KEY in server env.', keyKind: 'none' },
      platform,
      webCrawl,
    };
  }

  for (const apiKey of config.apiKeys) {
    const keyKind = apiKey.startsWith('sk_samvaad_') ? 'samvaad' : 'subscription';
    try {
      const result = await probeSpeechToTextKey(config.baseUrl, apiKey);
      if (result.ok) {
        return {
          configured: true,
          speechToText: { ...result, keyKind },
          platform,
          webCrawl,
        };
      }
      if (keyKind === 'samvaad') {
        return {
          configured: true,
          speechToText: {
            ok: false,
            message:
              `${result.message} Samvaad keys are for Voice Agents on indus.sarvam.ai; add a Model API key from dashboard.sarvam.ai for Saaras STT, or keep browser voice.`,
            keyKind,
          },
          platform,
          webCrawl,
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speech-to-Text probe failed';
      return {
        configured: true,
        speechToText: { ok: false, message, keyKind },
        platform,
        webCrawl,
      };
    }
  }

  return {
    configured: true,
    speechToText: { ok: false, message: 'No working Speech-to-Text key found.', keyKind: 'none' },
    platform,
    webCrawl,
  };
}

export async function transcribeWithSarvam(
  audio: Buffer,
  mimeType: string,
  languageCode = 'en-IN',
): Promise<{ transcript: string; languageCode?: string }> {
  const config = getSarvamConfigFromEnv();
  if (!config) throw new Error('Sarvam is not configured on the server.');

  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'wav';
  let lastError = 'Speech-to-Text failed';

  for (const apiKey of config.apiKeys) {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType || 'audio/webm' }), `audio.${ext}`);
    form.append('language_code', languageCode === 'auto' ? 'unknown' : languageCode);
    form.append('model', 'saaras:v3');
    form.append('mode', 'transcribe');

    const res = await fetch(`${config.baseUrl}/speech-to-text`, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });

    const raw = await res.text();
    if (!res.ok) {
      lastError = raw.slice(0, 300);
      continue;
    }

    const parsed = JSON.parse(raw) as { transcript?: string; language_code?: string };
    const transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
    if (!transcript) throw new Error('Sarvam returned an empty transcript.');
    return { transcript, languageCode: parsed.language_code };
  }

  throw new Error(lastError);
}
