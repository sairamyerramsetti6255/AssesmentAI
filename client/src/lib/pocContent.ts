export interface PocTimelineItem {
  phase: string;
  activity: string;
}

export interface PocLetterContent {
  title: string;
  objectives: string[];
  scope: string;
  timeline: PocTimelineItem[];
  success_metrics: string[];
  effort: string;
  low_cost_options: string;
}

export function parsePocContent(raw: Record<string, unknown> | undefined | null): PocLetterContent | null {
  if (!raw || typeof raw.title !== 'string') return null;

  const timeline = Array.isArray(raw.timeline)
    ? raw.timeline
        .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
        .map((t) => ({
          phase: String(t.phase ?? ''),
          activity: String(t.activity ?? ''),
        }))
        .filter((t) => t.phase || t.activity)
    : [];

  return {
    title: raw.title,
    objectives: Array.isArray(raw.objectives) ? raw.objectives.map(String) : [],
    scope: String(raw.scope ?? ''),
    timeline: timeline.length
      ? timeline
      : [
          { phase: 'Week 1–2', activity: 'Discovery & environment setup' },
          { phase: 'Week 3–6', activity: 'Build & integrate pilot' },
          { phase: 'Week 7–10', activity: 'Validate & refine' },
          { phase: 'Week 11–12', activity: 'Executive readout & decision' },
        ],
    success_metrics: Array.isArray(raw.success_metrics) ? raw.success_metrics.map(String) : [],
    effort: String(raw.effort ?? 'Medium'),
    low_cost_options: String(raw.low_cost_options ?? 'Cloud APIs & managed services'),
  };
}

export function isStyledPocHtml(html: string | undefined): boolean {
  return Boolean(html?.includes('professional-letter') || html?.includes('letter-head'));
}
