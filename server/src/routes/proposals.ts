import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { demoStore, templateId } from '../lib/demoStore.js';
import { logAudit, createNotification } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);
router.use(requireRole('super_admin', 'sales_manager'));

function renderProposal(assessmentId: string): string {
  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const score = demoStore.scores.find((s) => s.assessment_id === assessmentId);
  const gap = demoStore.gapAnalyses.find((g) => g.assessment_id === assessmentId);
  const poc = demoStore.pocPlans.find((p) => p.assessment_id === assessmentId);
  const template = demoStore.masters.proposalTemplates.find((t) => t.is_default);

  let html = template?.template_html || '<h1>Proposal for {{company_name}}</h1>';

  const driverTable = score
    ? `<table border="1" cellpadding="8"><tr><th>Driver</th><th>Score</th></tr>${Object.entries(score.driver_scores).map(([k, v]) => {
        const driver = demoStore.masters.drivers.find((d) => d.driver_key === k);
        return `<tr><td>${driver?.driver_name || k}</td><td>${v}/5</td></tr>`;
      }).join('')}</table>`
    : '';

  const gapsSection = gap
    ? `<ul>${gap.gaps.map((g) => `<li><strong>${g.driver}</strong> (${g.severity}): ${g.gap}</li>`).join('')}</ul>`
    : '';

  const solutionsSection = gap
    ? `<ul>${gap.recommended_solutions.map((s) => `<li><strong>${s.solution_name}</strong>: ${s.rationale}</li>`).join('')}</ul>`
    : '';

  const pocSection = poc?.html_content || '<p>PoC plan pending.</p>';

  html = html
    .replace(/\{\{company_name\}\}/g, client?.company_name || 'Client')
    .replace(/\{\{readiness_score\}\}/g, String(score?.overall_score || 'N/A'))
    .replace(/\{\{maturity_stage\}\}/g, score?.maturity_stage_name || 'N/A')
    .replace(/\{\{driver_scores_table\}\}/g, driverTable)
    .replace(/\{\{gaps_section\}\}/g, gapsSection)
    .replace(/\{\{solutions_section\}\}/g, solutionsSection)
    .replace(/\{\{poc_section\}\}/g, pocSection);

  return html;
}

router.post('/', async (req: Request, res: Response) => {
  const assessmentId = req.params.id as string;
  const html = renderProposal(assessmentId);

  const proposal = {
    id: uuidv4(),
    assessment_id: assessmentId,
    template_id: templateId,
    rendered_html: html,
    status: 'draft',
    finalized_at: null,
  };
  const idx = demoStore.proposals.findIndex((p) => p.assessment_id === assessmentId);
  if (idx >= 0) demoStore.proposals[idx] = proposal;
  else demoStore.proposals.push(proposal);
  await logAudit(req.user!.id, 'generate_proposal', 'assessment', assessmentId);
  res.status(201).json(proposal);
});

router.get('/', async (req: Request, res: Response) => {
  res.json(demoStore.proposals.find((p) => p.assessment_id === req.params.id) || null);
});

router.put('/', async (req: Request, res: Response) => {
  const { rendered_html, status } = req.body;

  const proposal = demoStore.proposals.find((p) => p.assessment_id === req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Not found' });
  if (rendered_html) proposal.rendered_html = rendered_html;
  if (status === 'finalized') {
    proposal.status = 'finalized';
    proposal.finalized_at = new Date().toISOString();
    const assessment = demoStore.assessments.find((a) => a.id === req.params.id);
    if (assessment) assessment.status = 'completed';
    await createNotification(req.user!.id, 'Proposal Finalized', 'Your proposal has been finalized', 'success', `/assessments/${req.params.id}/proposal`);
  }
  await logAudit(req.user!.id, 'update_proposal', 'assessment', req.params.id as string);
  res.json(proposal);
});

export default router;
