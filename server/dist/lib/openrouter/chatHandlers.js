function buildReasoningParam(body) {
    if (body.reasoningConfig)
        return { reasoning: body.reasoningConfig };
    if (body.reasoning)
        return { reasoning: { enabled: true } };
    return undefined;
}
export async function handleChatCompletion(client, config, body) {
    const model = body.model ?? config.model;
    const messages = body.messages ?? [];
    const apiResponse = (await client.chat.completions.create({
        model,
        messages,
        stream: false,
        max_tokens: body.max_tokens ?? 4096,
        ...(body.responseFormat ? { response_format: body.responseFormat } : {}),
        ...buildReasoningParam(body),
    }));
    const choice = apiResponse.choices[0];
    const message = choice?.message;
    return {
        content: message?.content ?? null,
        reasoning_details: message?.reasoning_details,
        model,
        finishReason: choice?.finish_reason ?? null,
    };
}
export async function handleChatStream(client, config, body, res) {
    const model = body.model ?? config.model;
    const messages = body.messages ?? [];
    const stream = await client.chat.completions.create({
        model,
        messages,
        stream: true,
        ...buildReasoningParam(body),
    });
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
    }
    res.write('data: [DONE]\n\n');
    res.end();
}
