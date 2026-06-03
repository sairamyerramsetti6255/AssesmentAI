import { Router, Request, Response } from 'express';
import { demoStore } from '../lib/demoStore.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('super_admin', 'sales_manager'));

router.get('/overview', async (req: Request, res: Response) => {
  const { industry_id } = req.query;

  let assessments = [...demoStore.assessments];
  if (industry_id) {
    assessments = assessments.filter((a) => {
      const client = demoStore.clients.find((c) => c.id === a.client_id);
      return client?.industry_id === industry_id;
    });
  }

  const byStatus: Record<string, number> = {};
  assessments.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

  const scores = demoStore.scores.filter((s) => assessments.some((a) => a.id === s.assessment_id));
  const avgReadiness = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.overall_score, 0) / scores.length * 100) / 100
    : 0;

  const maturityDist: Record<string, number> = {};
  scores.forEach((s) => {
    const name = s.maturity_stage_name || 'Unknown';
    maturityDist[name] = (maturityDist[name] || 0) + 1;
  });

  const byIndustry: Record<string, { count: number; avgScore: number }> = {};
  for (const a of assessments) {
    const client = demoStore.clients.find((c) => c.id === a.client_id);
    const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);
    const name = industry?.name || 'Unknown';
    if (!byIndustry[name]) byIndustry[name] = { count: 0, avgScore: 0 };
    byIndustry[name].count++;
    const score = scores.find((s) => s.assessment_id === a.id);
    if (score) byIndustry[name].avgScore += score.overall_score;
  }
  Object.keys(byIndustry).forEach((k) => {
    if (byIndustry[k].count) byIndustry[k].avgScore = Math.round(byIndustry[k].avgScore / byIndustry[k].count * 100) / 100;
  });

  const repActivity = demoStore.users
    .filter((u) => u.role_name === 'sales_rep')
    .map((rep) => ({
      rep_name: rep.full_name,
      assigned: assessments.filter((a) => a.assigned_rep_id === rep.id).length,
      completed: demoStore.sessions.filter((s) => s.rep_id === rep.id && s.status === 'completed').length,
    }));

  res.json({
    total_assessments: assessments.length,
    by_status: byStatus,
    avg_readiness_score: avgReadiness,
    maturity_distribution: maturityDist,
    by_industry: byIndustry,
    rep_activity: repActivity,
  });
});

router.get('/export', async (_req: Request, res: Response) => {
  const rows = demoStore.assessments.map((a) => {
    const client = demoStore.clients.find((c) => c.id === a.client_id);
    const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);
    const score = demoStore.scores.find((s) => s.assessment_id === a.id);
    const rep = demoStore.users.find((u) => u.id === a.assigned_rep_id);
    return {
      id: a.id,
      company: client?.company_name,
      industry: industry?.name,
      status: a.status,
      rep: rep?.full_name,
      score: score?.overall_score,
      maturity: score?.maturity_stage_name,
      created_at: a.created_at,
    };
  });

  const headers = Object.keys(rows[0] || {}).join(',');
  const csv = [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=assessments.csv');
  res.send(csv);
});

export default router;
