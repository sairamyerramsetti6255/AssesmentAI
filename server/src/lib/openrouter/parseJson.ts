/** Extract first JSON object or array from an LLM response. */
export function parseJsonFromLlm<T>(content: string): T {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;

  const startObj = candidate.indexOf('{');
  const startArr = candidate.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = Math.max(startObj, startArr);

  if (start < 0) return JSON.parse(candidate) as T;

  const slice = candidate.slice(start);
  const endObj = slice.lastIndexOf('}');
  const endArr = slice.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (end < 0) return JSON.parse(candidate) as T;

  return JSON.parse(slice.slice(0, end + 1)) as T;
}
