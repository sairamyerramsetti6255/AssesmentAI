import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { openai, isOpenAIConfigured } from '../lib/openai.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req: Request, res: Response) => {
  const { message, assessment_id } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let context = '';
  if (assessment_id) {
    const assessment = demoStore.assessments.find((a) => a.id === assessment_id);
    const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
    const score = demoStore.scores.find((s) => s.assessment_id === assessment_id);
    const docs = demoStore.documents.filter((d) => d.assessment_id === assessment_id);
    context = `Assessment for ${client?.company_name || 'client'}. Status: ${assessment?.status}. Score: ${score?.overall_score || 'N/A'}. Documents: ${docs.length}.`;
  }

  const systemPrompt = `You are an AI assistant for the Pbshope.com AI Readiness Platform. Role: ${req.user!.role_name}. ${context ? `Context: ${context}` : ''} Help with assessment guidance, proposal drafting, and AI readiness questions. Be concise and professional.`;

  demoStore.chatMessages.push({
    id: uuidv4(),
    user_id: req.user!.id,
    assessment_id: assessment_id || null,
    role: 'user',
    content: message,
    created_at: new Date().toISOString(),
  });

  let reply = `I can help you with this assessment. Based on your role as ${req.user!.role_name}, I recommend reviewing the client documentation and focusing on the five AI readiness drivers.`;

  if (req.user!.role_name === 'sales_rep') {
    reply = 'For your live session: start with Business Strategy questions, allow 60 seconds per question, and use voice recording for detailed client responses.';
  } else if (req.user!.role_name === 'sales_manager') {
    reply = 'As a manager, ensure pre-assessment research is complete, documents are uploaded, and questions are approved before assigning to a rep. After scoring, generate gap analysis and proposal.';
  }

  if (isOpenAIConfigured()) {
    try {
      const history = demoStore.chatMessages
        .filter((m) => m.user_id === req.user!.id && m.assessment_id === (assessment_id || null))
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }],
      });
      reply = response.choices[0]?.message?.content || reply;
    } catch { /* use default */ }
  }

  const assistantMsg = {
    id: uuidv4(),
    user_id: req.user!.id,
    assessment_id: assessment_id || null,
    role: 'assistant',
    content: reply,
    created_at: new Date().toISOString(),
  };
  demoStore.chatMessages.push(assistantMsg);

  res.json({ message: assistantMsg });
});

router.get('/history', async (req: Request, res: Response) => {
  const { assessment_id } = req.query;

  const messages = demoStore.chatMessages.filter(
    (m) => m.user_id === req.user!.id && (!assessment_id || m.assessment_id === assessment_id)
  );
  res.json(messages);
});

export default router;
