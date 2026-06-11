/** Close unclosed strings/brackets when the model truncates mid-JSON. */
function repairTruncatedJson(text) {
    let inString = false;
    let escape = false;
    const stack = [];
    for (const ch of text) {
        if (escape) {
            escape = false;
            continue;
        }
        if (ch === '\\' && inString) {
            escape = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString)
            continue;
        if (ch === '{')
            stack.push('}');
        else if (ch === '[')
            stack.push(']');
        else if (ch === '}' || ch === ']')
            stack.pop();
    }
    let repaired = text.replace(/,\s*$/, '');
    if (inString)
        repaired += '"';
    while (stack.length)
        repaired += stack.pop();
    return repaired;
}
function extractJsonSlice(text) {
    const startObj = text.indexOf('{');
    const startArr = text.indexOf('[');
    let start = -1;
    if (startObj >= 0 && startArr >= 0)
        start = Math.min(startObj, startArr);
    else
        start = Math.max(startObj, startArr);
    if (start < 0)
        return text;
    return text.slice(start);
}
function tryParseJson(text) {
    const slice = extractJsonSlice(text);
    const endObj = slice.lastIndexOf('}');
    const endArr = slice.lastIndexOf(']');
    const end = Math.max(endObj, endArr);
    if (end < 0)
        throw new SyntaxError('No JSON object found in AI response');
    return JSON.parse(slice.slice(0, end + 1));
}
/** Extract first JSON object or array from an LLM response. */
export function parseJsonFromLlm(content) {
    const trimmed = content?.trim();
    if (!trimmed) {
        throw new SyntaxError('AI returned empty response — try again or check model availability');
    }
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fence ? fence[1].trim() : trimmed;
    const attempts = [candidate, repairTruncatedJson(candidate)];
    const errors = [];
    for (const attempt of attempts) {
        try {
            return tryParseJson(attempt);
        }
        catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
        }
    }
    const slice = extractJsonSlice(candidate);
    for (let end = slice.length; end > Math.floor(slice.length * 0.4); end -= 80) {
        try {
            return JSON.parse(repairTruncatedJson(slice.slice(0, end)));
        }
        catch {
            /* try shorter slice */
        }
    }
    throw new SyntaxError(errors[0] ?? 'Failed to parse AI JSON response');
}
