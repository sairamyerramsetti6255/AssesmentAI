import type { ScrapeProgressHandler, SiteScrapeResult } from './scrape.js';

const MAX_CHARS = 28_000;

function resolveSiteOrigin(domain: string): string {
  const raw = domain.trim();
  if (!raw) return '';
  return raw.match(/^https?:\/\//) ? raw.replace(/\/$/, '') : `https://${raw.replace(/^\/+/, '').replace(/\/$/, '')}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Headless browser crawl for JS-rendered sites. Returns null if Playwright cannot launch. */
export async function scrapeWebsiteWithPlaywright(
  domain: string,
  maxPages: number,
  onProgress?: ScrapeProgressHandler,
): Promise<SiteScrapeResult | null> {
  const origin = resolveSiteOrigin(domain);
  if (!origin) {
    return { url: '', excerpt: '', pages: [], error: 'No website URL provided', engine: 'playwright' };
  }

  let chromium: typeof import('playwright').chromium;
  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
  } catch {
    return null;
  }

  const visited = new Set<string>();
  const chunks: string[] = [];
  const pages: { path: string; chars: number }[] = [];
  const queue: string[] = [origin];

  let browser: import('playwright').Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      userAgent: 'PBS-AI-Readiness-Assessment/1.0 (Playwright)',
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 },
    });

    await onProgress?.({ phase: 'crawl_start', progress: 12, maxPages, engine: 'playwright' });

    while (queue.length > 0 && visited.size < maxPages) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const page = await context.newPage();
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        });
        if (!response || !response.ok()) {
          await page.close();
          continue;
        }
        await page.waitForTimeout(400);

        let text = '';
        try {
          text = await page.evaluate(() => {
            const root = document.body;
            return root ? (root.innerText || root.textContent || '').replace(/\s+/g, ' ').trim() : '';
          });
        } catch {
          const html = await page.content();
          text = htmlToText(html);
        }

        if (text.length > 80) {
          const path = url.replace(origin, '') || '/';
          chunks.push(`--- Page: ${path} ---\n${text.slice(0, 8000)}`);
          pages.push({ path, chars: text.length });
          const pageNum = pages.length;
          await onProgress?.({
            phase: 'crawl_page',
            progress: 12 + Math.round((pageNum / maxPages) * 33),
            path,
            page: pageNum,
            maxPages,
            engine: 'playwright',
          });
        }

        if (visited.size < maxPages) {
          const links = await page.$$eval('a[href]', (anchors, baseOrigin) => {
            const hostName = new URL(baseOrigin).host;
            const scored: { url: string; score: number }[] = [];
            for (const anchor of anchors) {
              const href = anchor.getAttribute('href')?.trim();
              if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:'))
                continue;
              try {
                const absolute = new URL(href, baseOrigin).href.split('#')[0];
                if (!absolute.startsWith('http')) continue;
                if (!absolute.includes(hostName)) continue;
                const score = /about|service|solution|product|company|who-we|contact|industr|capabilit/i.test(href)
                  ? 2
                  : 1;
                scored.push({ url: absolute, score });
              } catch {
                /* skip */
              }
            }
            scored.sort((a, b) => b.score - a.score);
            const out: string[] = [];
            for (const item of scored) {
              if (!out.includes(item.url)) out.push(item.url);
            }
            return out.slice(0, 12);
          }, origin);

          for (const link of links) {
            if (!visited.has(link) && !queue.includes(link)) queue.push(link);
          }
        }
      } catch {
        /* skip page */
      } finally {
        await page.close();
      }
    }

    await context.close();
  } finally {
    await browser?.close();
  }

  const excerpt = chunks.join('\n\n').slice(0, MAX_CHARS);
  await onProgress?.({ phase: 'crawl_done', progress: 45, maxPages, engine: 'playwright' });

  if (!excerpt) {
    return {
      url: origin,
      excerpt: '',
      pages,
      engine: 'playwright',
      error: pages.length ? undefined : 'Could not read text from the website',
    };
  }
  return { url: origin, excerpt, pages, engine: 'playwright' };
}
