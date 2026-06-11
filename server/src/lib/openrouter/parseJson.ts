/** Extract first complete `{...}` or `[...]` block by balanced brackets. */
export function extractFirstJsonBlock(text: string): string | null {
  const startObj = text.indexOf('{')
  const startArr = text.indexOf('[')
  let start = -1
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr)
  else start = Math.max(startObj, startArr)
  if (start < 0) return null

  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

/** Close unclosed strings/brackets when the model truncates mid-JSON. */
function repairTruncatedJson(text: string): string {
  let inString = false
  let escape = false
  const stack: string[] = []

  for (const ch of text) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }

  let repaired = text.replace(/,\s*$/, '')
  if (inString) repaired += '"'
  while (stack.length) repaired += stack.pop()
  return repaired
}

function tryParseJson<T>(text: string): T {
  const block = extractFirstJsonBlock(text)
  if (!block) throw new SyntaxError('No JSON object found in AI response')
  return JSON.parse(block) as T
}

/** Extract first JSON object or array from an LLM response. */
export function parseJsonFromLlm<T>(content: string): T {
  const trimmed = content?.trim()
  if (!trimmed) {
    throw new SyntaxError('AI returned empty response — try again or check model availability')
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced
    ? fenced[1].trim()
    : trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  const attempts = [candidate, repairTruncatedJson(candidate)]
  const errors: string[] = []

  for (const attempt of attempts) {
    try {
      return tryParseJson<T>(attempt)
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  const block = extractFirstJsonBlock(candidate)
  if (block) {
    for (let end = block.length; end > Math.floor(block.length * 0.4); end -= 80) {
      try {
        return JSON.parse(repairTruncatedJson(block.slice(0, end))) as T
      } catch {
        /* try shorter slice */
      }
    }
  }

  throw new SyntaxError(errors[0] ?? 'Failed to parse AI JSON response')
}
