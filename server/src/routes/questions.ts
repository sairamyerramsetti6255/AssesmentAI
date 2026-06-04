import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import {
  generateAssessmentQuestions,
  generateExpectedAnswer,
  generateResearchNotes,
  clearGenericBenchmarks,
} from '../lib/assessmentAi.js';
import { isGenericBenchmark } from '../lib/benchmarkUtils.js';
import { isGeminiConfigured } from '../lib/gemini.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

/** Map AI-generated question payloads into persisted demoStore question records. */
function buildQuestionRecords(
  assessmentId: string,
  generated: Awaited<ReturnType<typeof generateAssessmentQuestions>>,
): typeof demoStore.questions {
  return generated.map((q, idx) => {
    const driver = demoStore.masters.drivers.find((d) => d.driver_key === q.driver_key) || demoStore.masters.drivers[idx % demoStore.masters.drivers.length];
    const questionType = q.question_type || 'rating';
    return {
      id: uuidv4(),
      assessment_id: assessmentId,
      source_question_id: null,
      driver_id: driver.id,
      question_text: q.question_text,
      question_type: questionType,
      rating_min: 1,
      rating_max: 5,
      rating_labels: questionType === 'rating' ? { '1': 'Not at all', '2': 'Limited', '3': 'Moderate', '4': 'Strong', '5': 'Fully' } : null,
      options: questionType === 'multi_select' && q.options?.length ? q.options : null,
      expected_answer_time_seconds: questionType === 'voice' ? 90 : 60,
      display_order: idx + 1,
      is_required: q.is_required ?? true,
      is_ai_generated: isGeminiConfigured(),
      session_status: 'active',
      skip_reason: null,
      original_question_text: q.question_text,
      expected_answer: null,
    };
  });
}

/** Map suggested pain-point category names to their master IDs. */
function resolvePainPointIds(names: string[]): string[] {
  return names
    .map((name) => demoStore.masters.painPoints.find((p) => p.category_name.toLowerCase() === name.toLowerCase())?.id)
    .filter((id): id is string => Boolean(id));
}

router.get('/questions', async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  res.json(
    demoStore.questions
      .filter((q) => q.assessment_id === assessmentId && q.session_status !== 'deleted')
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  );
});

/**
 * One-shot generation driven entirely by Step 1 client info:
 * deep research -> questions -> expected answers, persisted in a single request.
 */
router.post('/generate-all', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  if (!assessment) return res.status(404).json({ error: 'Not found' });

  const client = demoStore.clients.find((c) => c.id === assessment.client_id);
  if (!client?.company_name?.trim()) {
    return res.status(400).json({ error: 'Enter the company name in Step 1 before generating' });
  }

  try {
    // 1. Deep research from client info
    const research = await generateResearchNotes(assessmentId);
    assessment.pre_assessment_notes = research.research_notes;
    assessment.pain_point_ids = resolvePainPointIds(research.suggested_pain_points);

    // 2. Tailored questions
    demoStore.questions = demoStore.questions.filter((q) => q.assessment_id !== assessmentId);
    const generated = await generateAssessmentQuestions(assessmentId);
    const questions = buildQuestionRecords(assessmentId, generated);
    demoStore.questions.push(...questions);

    // Benchmarks stay empty — manager fills manually or uses "AI Suggest" / "Generate all benchmarks"
    clearGenericBenchmarks(assessmentId);

    if (assessment.status === 'draft') assessment.status = 'pre_assessment';
    assessment.updated_at = new Date().toISOString();
    await logAudit(req.user!.id, 'generate_all', 'assessment', assessmentId, {
      questions: questions.length,
      ai: isGeminiConfigured(),
    });

    res.status(201).json({
      research_notes: research.research_notes,
      pain_point_ids: assessment.pain_point_ids,
      questions,
    });
  } catch (err) {
    console.error('Full generation failed:', err);
    const msg = err instanceof Error ? err.message : 'Generation failed';
    if (msg.includes('Complete Step 1') || msg.includes('company name')) return res.status(400).json({ error: msg });
    if (!isGeminiConfigured()) return res.status(503).json({ error: 'Gemini API key not configured' });
    return res.status(502).json({ error: msg });
  }
});

router.post('/generate-questions', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  if (!assessment) return res.status(404).json({ error: 'Not found' });

  demoStore.questions = demoStore.questions.filter((q) => q.assessment_id !== assessmentId);

  let generated: Awaited<ReturnType<typeof generateAssessmentQuestions>>;
  try {
    generated = await generateAssessmentQuestions(assessmentId);
  } catch (err) {
    console.error('Question generation failed:', err);
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to generate questions' });
  }

  const generatedQuestions = buildQuestionRecords(assessmentId, generated);

  demoStore.questions.push(...generatedQuestions);
  assessment.status = assessment.status === 'draft' ? 'pre_assessment' : assessment.status;
  assessment.updated_at = new Date().toISOString();
  await logAudit(req.user!.id, 'generate_questions', 'assessment', assessmentId, { count: generatedQuestions.length, ai: isGeminiConfigured() });
  res.status(201).json(generatedQuestions);
});

router.post('/generate-all-benchmarks', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const questions = demoStore.questions.filter(
    (q) => q.assessment_id === assessmentId && q.session_status !== 'deleted',
  );
  if (!questions.length) return res.status(400).json({ error: 'Generate questions first' });

  const results: Array<{ id: string; expected_answer: string | null }> = [];
  for (const q of questions) {
    try {
      const expected_answer = await generateExpectedAnswer(assessmentId, q.id);
      q.expected_answer = expected_answer || null;
      results.push({ id: q.id, expected_answer: q.expected_answer });
    } catch (err) {
      console.warn(`Benchmark failed for ${q.id}:`, err);
      results.push({ id: q.id, expected_answer: q.expected_answer ?? null });
    }
  }
  await logAudit(req.user!.id, 'generate_all_benchmarks', 'assessment', assessmentId, { count: results.length });
  res.json({ updated: results.length, questions: results });
});

router.post('/clear-generic-benchmarks', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const cleared = clearGenericBenchmarks(assessmentId);
  res.json({ cleared });
});

router.post('/questions/:qid/generate-expected-answer', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const questionId = req.params.qid as string;

  try {
    const expected_answer = await generateExpectedAnswer(assessmentId, questionId);
    const question = demoStore.questions.find((q) => q.id === questionId && q.assessment_id === assessmentId);
    if (question) question.expected_answer = expected_answer;
    await logAudit(req.user!.id, 'generate_expected_answer', 'question', questionId);
    res.json({ expected_answer });
  } catch (err) {
    console.error('Expected answer generation failed:', err);
    if (!isGeminiConfigured()) {
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to generate answer' });
  }
});

router.post('/questions', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const {
    question_text,
    question_type = 'rating',
    options,
    driver_id,
    is_required = true,
    rating_min = 1,
    rating_max = 5,
    expected_answer_time_seconds = 60,
  } = req.body;

  if (!question_text?.trim()) return res.status(400).json({ error: 'Question text is required' });

  const validTypes = ['rating', 'text', 'voice', 'multi_select'];
  if (!validTypes.includes(question_type)) {
    return res.status(400).json({ error: `Invalid question type. Use: ${validTypes.join(', ')}` });
  }
  if (question_type === 'multi_select' && (!options || !Array.isArray(options) || options.length < 2)) {
    return res.status(400).json({ error: 'Multi-select questions need at least 2 options' });
  }

  const existing = demoStore.questions.filter((q) => q.assessment_id === assessmentId);
  const question = {
    id: uuidv4(),
    assessment_id: assessmentId,
    source_question_id: null,
    driver_id: driver_id || demoStore.masters.drivers[0]?.id || null,
    question_text: question_text.trim(),
    question_type,
    rating_min,
    rating_max,
    rating_labels: question_type === 'rating' ? { '1': 'Not at all', '5': 'Fully' } : null,
    options: question_type === 'multi_select' ? options : null,
    expected_answer_time_seconds,
    display_order: existing.length + 1,
    is_required,
    is_ai_generated: false,
    session_status: 'active',
    skip_reason: null,
    original_question_text: null,
    expected_answer: null,
  };
  demoStore.questions.push(question);
  await logAudit(req.user!.id, 'add_manual_question', 'question', question.id);
  res.status(201).json(question);
});

router.delete('/questions/:qid', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const questionId = req.params.qid as string;

  const question = demoStore.questions.find((q) => q.id === questionId && q.assessment_id === assessmentId);
  if (!question) return res.status(404).json({ error: 'Not found' });
  question.session_status = 'deleted';
  await logAudit(req.user!.id, 'delete_question', 'question', questionId);
  res.json({ message: 'Deleted' });
});

router.put('/questions', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const { questions } = req.body as { questions: Array<{ id: string; question_text?: string; display_order?: number; expected_answer?: string | null }> };

  for (const q of questions) {
    const existing = demoStore.questions.find((x) => x.id === q.id && x.assessment_id === assessmentId);
    if (existing) {
      if (q.question_text !== undefined) existing.question_text = q.question_text;
      if (q.display_order !== undefined) existing.display_order = q.display_order;
      if (q.expected_answer !== undefined) {
        const val = q.expected_answer?.trim() || null;
        existing.expected_answer = val && isGenericBenchmark(val) ? null : val;
      }
    }
  }
  const result = demoStore.questions
    .filter((q) => q.assessment_id === assessmentId && q.session_status !== 'deleted')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  await logAudit(req.user!.id, 'update_questions', 'assessment', assessmentId);
  res.json(result);
});

export default router;
