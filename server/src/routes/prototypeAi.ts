import { Router, Request, Response } from 'express';
import {
  createOpenRouterClient,
  getOpenRouterConfigFromEnv,
  isRateLimitMessage,
  OpenRouterRateLimitError,
} from '../lib/openrouter/openrouterClient.js';
import {
  generateAssessmentQuestions,
  generateDemoClientAnswers,
  generateProposalContent,
  rewriteAssessmentQuestion,
  runResearchPipeline,
  type AssessmentGenerationResult,
  type GeneratedQuestionPayload,
  type LeadPayload,
  type ResearchResult,
} from '../lib/openrouter/aiRun.js';
import { scrapeWebsite } from '../lib/openrouter/scrape.js';
import {
  handleChatCompletion,
  handleChatStream,
  type ChatRequestBody,
} from '../lib/openrouter/chatHandlers.js';

const router = Router();

function sendAiError(res: Response, err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const rateLimited =
    err instanceof OpenRouterRateLimitError || isRateLimitMessage(message);
  res.status(rateLimited ? 429 : 500).json({
    error: message,
    code: rateLimited ? 'rate_limit' : 'ai_error',
  });
}

function requireOpenRouter(_req: Request, res: Response): ReturnType<typeof getOpenRouterConfigFromEnv> {
  const config = getOpenRouterConfigFromEnv();
  if (!config) {
    res.status(503).json({
      error: 'OPENROUTER_API_KEY not configured on server. Add it to server/.env or Coolify env.',
    });
    return null;
  }
  return config;
}

/** Prototype SPA — OpenRouter only (no legacy assessment API auth). */
router.get('/health/openrouter', (_req, res) => {
  const config = getOpenRouterConfigFromEnv();
  if (!config) {
    res.status(503).json({ ok: false, keyConfigured: false });
    return;
  }
  res.json({ ok: true, model: config.model, keyConfigured: true });
});

router.post('/research/pipeline', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const { lead } = req.body as { lead: LeadPayload };
    const client = createOpenRouterClient(config);
    const result = await runResearchPipeline(client, config, lead);
    res.json(result);
  } catch (err) {
    sendAiError(res, err, 'Research failed');
  }
});

router.post('/research/scrape', async (req, res) => {
  try {
    const { domain } = req.body as { domain: string };
    const scrape = await scrapeWebsite(domain);
    res.json(scrape);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scrape failed' });
  }
});

router.post('/assessment/generate-questions', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const { lead, research } = req.body as { lead: LeadPayload; research: ResearchResult };
    const client = createOpenRouterClient(config);
    const generated = await generateAssessmentQuestions(client, config, lead, research);
    res.json(generated);
  } catch (err) {
    sendAiError(res, err, 'Question generation failed');
  }
});

router.post('/assessment/rewrite-question', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const { lead, research, question, taxonomy, peerSummaries } = req.body as {
      lead: LeadPayload;
      research: ResearchResult;
      question: GeneratedQuestionPayload;
      taxonomy?: AssessmentGenerationResult['taxonomy'];
      peerSummaries?: string[];
    };
    const client = createOpenRouterClient(config);
    const rewritten = await rewriteAssessmentQuestion(
      client,
      config,
      lead,
      research,
      question,
      taxonomy,
      peerSummaries ?? [],
    );
    res.json({ question: rewritten });
  } catch (err) {
    sendAiError(res, err, 'Rewrite failed');
  }
});

router.post('/assessment/generate-demo-answers', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const { lead, research, questions } = req.body as {
      lead: LeadPayload;
      research: ResearchResult;
      questions: GeneratedQuestionPayload[];
    };
    const client = createOpenRouterClient(config);
    const generated = await generateDemoClientAnswers(client, config, lead, questions, research);
    res.json(generated);
  } catch (err) {
    sendAiError(res, err, 'Demo answers failed');
  }
});

router.post('/assessment/generate-proposal', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const { lead, research, clientAnswersSummary } = req.body as {
      lead: LeadPayload;
      research: ResearchResult;
      clientAnswersSummary: string;
    };
    const client = createOpenRouterClient(config);
    const proposal = await generateProposalContent(client, config, lead, research, clientAnswersSummary);
    res.json(proposal);
  } catch (err) {
    sendAiError(res, err, 'Proposal generation failed');
  }
});

router.post('/chat/completions/stream', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const body = req.body as ChatRequestBody;
    const client = createOpenRouterClient(config);
    await handleChatStream(client, config, body, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Stream failed' });
    }
  }
});

router.post('/chat/completions', async (req, res) => {
  const config = requireOpenRouter(req, res);
  if (!config) return;
  try {
    const body = req.body as ChatRequestBody;
    if (body.stream) {
      const client = createOpenRouterClient(config);
      await handleChatStream(client, config, body, res);
      return;
    }
    const client = createOpenRouterClient(config);
    const result = await handleChatCompletion(client, config, body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Chat failed' });
  }
});

export default router;
