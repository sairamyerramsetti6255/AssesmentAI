/** Fetch public homepage text for AI analysis (server-side only). */
export async function scrapeWebsite(domain: string): Promise<{
  url: string;
  excerpt: string;
  error?: string;
}> {
  const url = domain.match(/^https?:\/\//) ? domain : `https://${domain.replace(/^\/+/, '')}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AI-Readiness-Assessment/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return { url, excerpt: '', error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const excerpt = htmlToText(html).slice(0, 12_000);
    return { url, excerpt: excerpt || '(no extractable text)' };
  } catch (err) {
    return {
      url,
      excerpt: '',
      error: err instanceof Error ? err.message : 'Fetch failed',
    };
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
