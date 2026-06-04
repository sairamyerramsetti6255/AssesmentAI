import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../lib/demoStore.js';
import { openai, isOpenAIConfigured } from '../lib/openai.js';
import { logAudit } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { buildPocLetterHtml, type PocLetterContent } from '../lib/pocLetterHtml.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);
router.use(requireRole('super_admin', 'sales_manager'));

router.post('/', async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;

  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);
  const gap = demoStore.gapAnalyses.find((g) => g.assessment_id === assessmentId);
  const topSolution = gap?.recommended_solutions?.[0] || { solution_name: 'GenAI', solution_key: 'genai' };

  const content: PocLetterContent = {
    title: `PoC Plan: ${topSolution.solution_name} for ${client?.company_name || 'Client'}`,
    objectives: [
      'Validate AI readiness hypothesis with measurable outcomes',
      'Demonstrate ROI within 90-day timeline',
      'Build internal stakeholder confidence',
    ],
    scope: `Implement a focused ${topSolution.solution_name} proof of concept addressing the highest-priority gap identified in the assessment.`,
    timeline: [
      { phase: 'Week 1-2', activity: 'Data preparation and environment setup' },
      { phase: 'Week 3-6', activity: 'Model development and integration' },
      { phase: 'Week 7-10', activity: 'Testing and validation' },
      { phase: 'Week 11-12', activity: 'Results presentation and go/no-go decision' },
    ],
    success_metrics: ['20% improvement in target KPI', 'User adoption > 70%', 'Technical feasibility confirmed'],
    effort: demoStore.masters.solutions.find((s) => s.solution_key === topSolution.solution_key)?.typical_effort || 'Medium',
    low_cost_options: demoStore.masters.solutions.find((s) => s.solution_key === topSolution.solution_key)?.low_cost_options || 'Cloud APIs',
  };

  if (isOpenAIConfigured()) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: `Generate a PoC plan JSON for ${topSolution.solution_name} at ${client?.company_name}. Include: title, objectives (array), scope, timeline (array of {phase, activity}), success_metrics (array), effort, low_cost_options.` }],
        response_format: { type: 'json_object' },
      });
      Object.assign(content, JSON.parse(response.choices[0]?.message?.content || '{}'));
    } catch { /* use template */ }
  }

  const html = buildPocLetterHtml({
    companyName: client?.company_name || 'Client',
    industryName: industry?.name,
    contactName: client?.contact_name,
    content,
  });

  const poc = {
    id: uuidv4(),
    assessment_id: assessmentId,
    content: content as unknown as Record<string, unknown>,
    html_content: html,
  };
  const idx = demoStore.pocPlans.findIndex((p) => p.assessment_id === assessmentId);
  if (idx >= 0) demoStore.pocPlans[idx] = poc;
  else demoStore.pocPlans.push(poc);

  await logAudit(req.user!.id, 'generate_poc', 'assessment', assessmentId);
  res.status(201).json(poc);
});

router.get('/', async (req: Request, res: Response) => {
  res.json(demoStore.pocPlans.find((p) => p.assessment_id === req.params.id) || null);
});

router.put('/', async (req: Request, res: Response) => {
  const { content, html_content } = req.body;
  const poc = demoStore.pocPlans.find((p) => p.assessment_id === req.params.id);
  if (!poc) return res.status(404).json({ error: 'Not found' });
  if (content) poc.content = content;
  if (html_content) poc.html_content = html_content;
  res.json(poc);
});

export default router;
