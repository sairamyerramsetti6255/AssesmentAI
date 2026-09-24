import type { ResearchResult } from './openrouter/aiRun.js';

/** Short client-facing summary for the intro voice/text box. */
export function buildClientIntroSummary(research: ResearchResult): string {
  const lines: string[] = ['What we learned from your website (edit or add your own story below):', ''];

  const insights = (research.webInsights ?? []).filter(Boolean).slice(0, 5);
  if (insights.length) {
    lines.push(...insights.map((item) => `• ${item.trim()}`));
    lines.push('');
  }

  const competitors = (research.competitors ?? []).filter(Boolean).slice(0, 4);
  if (competitors.length) {
    lines.push(`Peers / competitors we noted: ${competitors.join(', ')}.`);
    lines.push('');
  }

  const brief = (research.executiveBrief ?? '').trim();
  if (brief) {
    const bullets = brief
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length > 20)
      .slice(0, 4);
    if (bullets.length) {
      lines.push(...bullets.map((line) => `• ${line}`));
    } else {
      lines.push(brief.slice(0, 600));
    }
  }

  lines.push('');
  lines.push('Your turn — add anything we missed about your business, activities, and goals:');

  return lines.join('\n').trim();
}
