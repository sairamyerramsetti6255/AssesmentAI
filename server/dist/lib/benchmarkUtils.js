/** Detects low-quality template benchmarks that should not be shown to users. */
const GENERIC_PATTERNS = [
    /^Expected mature response for/i,
    /documented strategy, accountable ownership, and measurable KPIs/i,
    /^Based on .+'s profile in .+, a mature organization would demonstrate/i,
    /^a mature organization would demonstrate strong capability/i,
];
export function isGenericBenchmark(text) {
    const t = text?.trim();
    if (!t || t.length < 20)
        return false;
    return GENERIC_PATTERNS.some((p) => p.test(t));
}
export function sanitizeBenchmark(text) {
    if (!text?.trim())
        return null;
    return isGenericBenchmark(text) ? null : text.trim();
}
