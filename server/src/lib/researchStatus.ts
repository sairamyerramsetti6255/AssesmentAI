export interface ResearchCrawlStatus {
  phase: 'idle' | 'crawl' | 'analyze' | 'brief' | 'done' | 'error';
  message: string;
  pagesCrawled?: number;
  maxPages?: number;
  currentPath?: string;
  engine?: 'playwright' | 'fetch';
  updatedAt?: string;
}

export function researchMessage(progress: number, status?: ResearchCrawlStatus | null): string {
  if (status?.message && progress < 100) return status.message;
  if (progress >= 100) return 'Website research complete.';
  if (progress >= 72) return 'Writing your company brief…';
  if (progress >= 50) return 'Analyzing pages and identifying competitors…';
  if (progress >= 12) {
    const path = status?.currentPath ? ` (${status.currentPath})` : '';
    const pages =
      status?.pagesCrawled && status.maxPages
        ? ` — page ${status.pagesCrawled} of ${status.maxPages}`
        : '';
    const engine = status?.engine === 'playwright' ? ' (browser)' : '';
    return `Crawling your website${engine}${pages}${path}…`;
  }
  if (progress > 0) return 'Starting website research…';
  return '';
}

export function parseCrawlStatus(aiResearch: unknown): ResearchCrawlStatus | null {
  if (!aiResearch || typeof aiResearch !== 'object') return null;
  const row = aiResearch as Record<string, unknown>;
  const status = row._status;
  if (!status || typeof status !== 'object') return null;
  return status as ResearchCrawlStatus;
}

export function mergeCrawlStatus(
  aiResearch: unknown,
  patch: Partial<ResearchCrawlStatus>,
): Record<string, unknown> {
  const base =
    aiResearch && typeof aiResearch === 'object' && !Array.isArray(aiResearch)
      ? { ...(aiResearch as Record<string, unknown>) }
      : {};
  const prev = parseCrawlStatus(base) ?? { phase: 'idle', message: '' };
  base._status = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return base;
}
