import { getOpenRouterConfigFromEnv } from './openrouterClient.js';

const SPEAK_MODEL = 'openai/gpt-audio';

function pcm16ToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Speaks the script in a US English voice. Returns a wav buffer. */
export async function openRouterSpeak(script: string): Promise<Buffer> {
  const config = getOpenRouterConfigFromEnv();
  if (!config) throw new Error('OpenRouter is not configured on the server.');
  const text = script.replace(/\s+/g, ' ').trim().slice(0, 1500);
  if (!text) throw new Error('Nothing to speak.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(config.siteUrl ? { 'HTTP-Referer': config.siteUrl } : {}),
      'X-Title': config.appName || 'AI Readiness Assessment',
    },
    body: JSON.stringify({
      model: SPEAK_MODEL,
      stream: true,
      modalities: ['text', 'audio'],
      audio: { voice: 'alloy', format: 'pcm16' },
      messages: [
        {
          role: 'user',
          content:
            'Read the script below aloud in a clear United States English accent. Do not add words.\n\n' + text,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message || `OpenRouter speech failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let audioBase64 = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      const json = JSON.parse(payload) as {
        error?: { message?: string };
        choices?: Array<{ delta?: { audio?: { data?: string } | string } }>;
      };
      if (json.error?.message) throw new Error(json.error.message);
      const audio = json.choices?.[0]?.delta?.audio;
      if (typeof audio === 'string') audioBase64 += audio;
      else if (audio?.data) audioBase64 += audio.data;
    }
  }

  if (!audioBase64) throw new Error('OpenRouter returned no speech audio.');
  return pcm16ToWav(Buffer.from(audioBase64, 'base64'));
}
