import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { scoreSessionWithAI } from '../lib/assessmentAi.js';
import { logAudit, createNotification } from '../lib/audit.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function computeAndPersistScore(assessmentId: string, userId: string) {
  const session = demoStore.sessions.find((s) => s.assessment_id === assessmentId && s.status === 'completed')
    || demoStore.sessions.find((s) => s.assessment_id === assessmentId);
  if (!session) return null;

  const computed = await scoreSessionWithAI(assessmentId, session.id);

  const existing = demoStore.scores.findIndex((s) => s.assessment_id === assessmentId);
  const score = {
    id: uuidv4(),
    assessment_id: assessmentId,
    driver_scores: computed.driver_scores,
    overall_score: computed.overall_score,
    maturity_stage_id: computed.maturity_stage_id,
    maturity_stage_name: computed.maturity_stage_name,
    benchmark_comparison: computed.benchmark_comparison,
    executive_summary: computed.executive_summary,
    key_findings: computed.key_findings,
    recommendations: computed.recommendations,
    question_analyses: computed.question_analyses,
    scored_at: new Date().toISOString(),
  };

  if (existing >= 0) demoStore.scores[existing] = score;
  else demoStore.scores.push(score);

  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  if (assessment) assessment.status = 'scored';

  await logAudit(userId, 'score_assessment', 'assessment', assessmentId);
  if (assessment?.created_by) {
    await createNotification(
      assessment.created_by,
      'Scores Ready',
      'AI session analysis and scoring is complete',
      'success',
      `/assessments/${assessmentId}/results`,
    );
  }

  return score;
}

router.post('/score', async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  try {
    const score = await computeAndPersistScore(assessmentId, req.user!.id);
    if (!score) return res.status(400).json({ error: 'No session data to score' });
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scoring failed' });
  }
});

router.get('/results', async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  let score = demoStore.scores.find((s) => s.assessment_id === assessmentId);
  if (!score) {
    try {
      score = await computeAndPersistScore(assessmentId, req.user!.id) ?? undefined;
    } catch {
      /* no session yet */
    }
  }

  const questions = demoStore.questions.filter((q) => q.assessment_id === assessmentId);
  const session = demoStore.sessions.find((s) => s.assessment_id === assessmentId);
  const answers = session ? demoStore.answers.filter((a) => a.session_id === session.id) : [];
  res.json({ score: score || null, questions, answers, drivers: demoStore.masters.drivers, maturityStages: demoStore.masters.maturityStages });
});

export default router;
