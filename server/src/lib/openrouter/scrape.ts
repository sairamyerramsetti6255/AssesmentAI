/** Fetch public site text for AI analysis (server-side only). */

import { scrapeWebsiteWithPlaywright } from './scrapePlaywright.js';

export interface SiteScrapeResult {
  url: string;
  excerpt: string;
  pages: { path: string; chars: number }[];
  error?: string;
  engine?: 'playwright' | 'fetch';
}

export interface ScrapeProgressEvent {
  phase: 'crawl_start' | 'crawl_page' | 'crawl_done';
  progress: number;
  path?: string;
  page?: number;
  maxPages?: number;
  engine?: 'playwright' | 'fetch';
}

export type ScrapeProgressHandler = (event: ScrapeProgressEvent) => void | Promise<void>;

const MAX_PAGES = 6;
const MAX_CHARS = 28_000;

function playwrightEnabled(): boolean {
  return process.env.SCRAPE_USE_PLAYWRIGHT !== 'false';
}

export async function scrapeWebsite(
  domain: string,
  onProgress?: ScrapeProgressHandler,
): Promise<SiteScrapeResult> {
  return scrapeWebsiteDeep(domain, MAX_PAGES, onProgress);
}

/** Crawl homepage plus same-origin links (about, services, etc.). */
export async function scrapeWebsiteDeep(
  domain: string,
  maxPages = MAX_PAGES,
  onProgress?: ScrapeProgressHandler,
): Promise<SiteScrapeResult> {
  if (playwrightEnabled()) {
    try {
      const playwrightResult = await scrapeWebsiteWithPlaywright(domain, maxPages, onProgress);
      if (playwrightResult && (playwrightResult.excerpt || playwrightResult.pages.length)) {
        return playwrightResult;
      }
    } catch (err) {
      console.warn('[scrape] Playwright crawl failed, using fetch fallback:', err instanceof Error ? err.message : err);
    }
  }
  return scrapeWebsiteWithFetch(domain, maxPages, onProgress);
}

async function scrapeWebsiteWithFetch(
  domain: string,
  maxPages = MAX_PAGES,
  onProgress?: ScrapeProgressHandler,
): Promise<SiteScrapeResult> {
  const raw = domain.trim();
  if (!raw) {
    return { url: '', excerpt: '', pages: [], error: 'No website URL provided' };
  }
  const origin = raw.match(/^https?:\/\//) ? raw.replace(/\/$/, '') : `https://${raw.replace(/^\/+/, '').replace(/\/$/, '')}`;
  const host = tryHost(origin);
  const visited = new Set<string>();
  const chunks: string[] = [];
  const pages: { path: string; chars: number }[] = [];
  const queue: string[] = [origin];

  await onProgress?.({ phase: 'crawl_start', progress: 12, maxPages, engine: 'fetch' });

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PBS-AI-Readiness-Assessment/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const text = htmlToText(html);
      if (text.length > 80) {
        const path = url.replace(origin, '') || '/';
        chunks.push(`--- Page: ${path} ---\n${text.slice(0, 8000)}`);
        pages.push({ path, chars: text.length });
        const pageNum = pages.length;
        const crawlProgress = 12 + Math.round((pageNum / maxPages) * 33);
        await onProgress?.({
          phase: 'crawl_page',
          progress: crawlProgress,
          path,
          page: pageNum,
          maxPages,
          engine: 'fetch',
        });
      }
      if (visited.size < maxPages) {
        for (const link of extractSameOriginLinks(html, origin, host)) {
          if (!visited.has(link) && !queue.includes(link)) queue.push(link);
        }
      }
    } catch {
      /* skip broken page */
    }
  }

  const excerpt = chunks.join('\n\n').slice(0, MAX_CHARS);
  await onProgress?.({ phase: 'crawl_done', progress: 45, maxPages, engine: 'fetch' });
  if (!excerpt) {
    return {
      url: origin,
      excerpt: '',
      pages,
      engine: 'fetch',
      error: pages.length ? undefined : 'Could not read text from the website',
    };
  }
  return { url: origin, excerpt, pages, engine: 'fetch' };
}

export function resolveSiteOrigin(domain: string): string {
  const raw = domain.trim();
  if (!raw) return '';
  return raw.match(/^https?:\/\//) ? raw.replace(/\/$/, '') : `https://${raw.replace(/^\/+/, '').replace(/\/$/, '')}`;
}

function tryHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

function extractSameOriginLinks(html: string, origin: string, host: string): string[] {
  const out: string[] = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  const priority = /about|service|solution|product|company|who-we|contact|industr|capabilit/i;
  const candidates: { url: string; score: number }[] = [];

  while ((match = re.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    let absolute: string;
    try {
      absolute = new URL(href, origin).href.split('#')[0];
    } catch {
      continue;
    }
    if (!absolute.startsWith(origin) && !absolute.includes(host)) continue;
    if (!absolute.startsWith('http')) continue;
    const score = priority.test(href) ? 2 : 1;
    candidates.push({ url: absolute, score });
  }

  candidates
    .sort((a, b) => b.score - a.score)
    .forEach(({ url }) => {
      if (!out.includes(url)) out.push(url);
    });
  return out.slice(0, 12);
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
