const GENERIC_PATTERNS = [
  /^Expected mature response for/i,
  /documented strategy, accountable ownership, and measurable KPIs/i,
  /^Based on .+'s profile in .+, a mature organization would demonstrate/i,
];

export function isGenericBenchmark(text: string | null | undefined): boolean {
  const t = text?.trim();
  if (!t || t.length < 20) return false;
  return GENERIC_PATTERNS.some((p) => p.test(t));
}

export function cleanBenchmarkDrafts(drafts: Record<string, string>): Record<string, string> {
  const out = { ...drafts };
  for (const id of Object.keys(out)) {
    if (isGenericBenchmark(out[id])) out[id] = '';
  }
  return out;
}
