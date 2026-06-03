import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { geminiGenerateJSON, isGeminiConfigured } from '../lib/gemini.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

router.post('/', requireRole('super_admin', 'sales_manager'), async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  const score = demoStore.scores.find((s) => s.assessment_id === assessmentId);
  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);

  const gaps: Array<{ driver: string; gap: string; severity: string }> = [];
  const driverScores = score?.driver_scores || {};

  for (const driver of demoStore.masters.drivers) {
    const driverScore = driverScores[driver.driver_key] || 0;
    if (driverScore < 3) {
      gaps.push({
        driver: driver.driver_name,
        gap: `${driver.driver_name} maturity is below industry average (${driverScore}/5)`,
        severity: driverScore < 2 ? 'high' : 'medium',
      });
    }
  }

  if (gaps.length === 0) {
    gaps.push({ driver: 'General', gap: 'Continue scaling AI initiatives across departments', severity: 'low' });
  }

  const recommended = demoStore.masters.solutions.slice(0, 3).map((s, i) => ({
    solution_name: s.solution_name,
    solution_key: s.solution_key,
    rationale: `Recommended based on ${gaps[i]?.driver || 'overall'} gap analysis. ${s.description}`,
  }));

  if (isGeminiConfigured() && score) {
    try {
      const parsed = await geminiGenerateJSON<{
        gaps: Array<{ driver: string; gap: string; severity: string }>;
        recommended_solutions: Array<{ solution_name: string; solution_key: string; rationale: string }>;
      }>(
        `Given AI readiness scores ${JSON.stringify(driverScores)} for ${industry?.name || 'a company'} (${client?.company_name || 'client'}), identify gaps and recommend from: ${demoStore.masters.solutions.map((s) => s.solution_name).join(', ')}. Return JSON: {gaps: [{driver, gap, severity}], recommended_solutions: [{solution_name, solution_key, rationale}]}`,
      );
      if (parsed.gaps) gaps.splice(0, gaps.length, ...parsed.gaps);
      if (parsed.recommended_solutions) recommended.splice(0, recommended.length, ...parsed.recommended_solutions);
    } catch { /* use rule-based */ }
  }

  const analysis = {
    id: uuidv4(),
    assessment_id: assessmentId,
    gaps,
    recommended_solutions: recommended,
    ai_prompt: null,
    ai_response: null,
  };

  const idx = demoStore.gapAnalyses.findIndex((g) => g.assessment_id === assessmentId);
  if (idx >= 0) demoStore.gapAnalyses[idx] = analysis;
  else demoStore.gapAnalyses.push(analysis);

  await logAudit(req.user!.id, 'generate_gap_analysis', 'assessment', assessmentId);
  res.status(201).json(analysis);
});

router.get('/', async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const analysis = demoStore.gapAnalyses.find((g) => g.assessment_id === assessmentId);
  res.json(analysis || null);
});

export default router;
