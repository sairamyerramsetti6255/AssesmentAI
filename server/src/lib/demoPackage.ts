import { v4 as uuidv4 } from 'uuid';
import { demoStore, templateId } from './demoStore.js';
import { buildPocLetterHtml } from './pocLetterHtml.js';

/** Demo score when no live session exists yet (manager preview / sales demo). */
export function ensureDemoScore(assessmentId: string) {
  const existing = demoStore.scores.find((s) => s.assessment_id === assessmentId);
  if (existing) return existing;

  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const benchmark = assessment?.industry_benchmark_snapshot as { avg_driver_scores?: Record<string, number> } | null;

  const driver_scores: Record<string, number> = {};
  for (const d of demoStore.masters.drivers) {
    const bench = benchmark?.avg_driver_scores?.[d.driver_key];
    driver_scores[d.driver_key] = bench != null ? Math.round(bench * 10) / 10 : 2.8;
  }
  const overall = Math.round(
    (Object.values(driver_scores).reduce((a, b) => a + b, 0) / demoStore.masters.drivers.length) * 10,
  ) / 10;

  const stage = demoStore.masters.maturityStages.find((s) => s.stage_order === 3)
    || demoStore.masters.maturityStages[0];

  const score = {
    id: uuidv4(),
    assessment_id: assessmentId,
    driver_scores,
    overall_score: overall,
    maturity_stage_id: stage.id,
    maturity_stage_name: stage.stage_name,
    benchmark_comparison: {
      industry_avg: benchmark?.avg_driver_scores || {},
      client_scores: driver_scores,
      delta: Object.fromEntries(
        Object.keys(driver_scores).map((k) => [
          k,
          driver_scores[k] - (benchmark?.avg_driver_scores?.[k] ?? driver_scores[k]),
        ]),
      ),
    },
    executive_summary: `${client?.company_name || 'The client'} shows moderate AI readiness (${overall}/5), with the strongest opportunity to close gaps in technology, governance, and scaled pilots.`,
    key_findings: [
      'Data integration and quality remain the primary constraint for enterprise AI.',
      'Executive sponsorship is present but operational playbooks are still forming.',
      'Quick-win pilots can build momentum within a 90-day window.',
    ],
    recommendations: [
      'Prioritize a focused proof of concept on the highest-impact use case.',
      'Establish AI governance aligned to industry compliance requirements.',
      'Invest in data foundation work in parallel with pilot delivery.',
    ],
    question_analyses: [],
    scored_at: new Date().toISOString(),
  };

  demoStore.scores.push(score);
  if (assessment) assessment.status = 'scored';
  return score;
}

export function ensureDemoGap(assessmentId: string) {
  const existing = demoStore.gapAnalyses.find((g) => g.assessment_id === assessmentId);
  if (existing) return existing;

  const score = ensureDemoScore(assessmentId);
  const gaps = demoStore.masters.drivers
    .filter((d) => (score.driver_scores[d.driver_key] ?? 5) < 3.5)
    .map((d) => ({
      driver: d.driver_name,
      gap: `${d.driver_name} requires targeted investment to reach industry benchmark levels.`,
      severity: (score.driver_scores[d.driver_key] ?? 3) < 2.5 ? 'high' : 'medium',
    }));

  if (gaps.length === 0) {
    gaps.push({ driver: 'Scaling', gap: 'Expand successful pilots across business units.', severity: 'low' });
  }

  const recommended = demoStore.masters.solutions.slice(0, 3).map((s, i) => ({
    solution_name: s.solution_name,
    solution_key: s.solution_key,
    rationale: `Addresses ${gaps[i]?.driver || 'priority'} gaps with ${s.typical_effort} typical effort. ${s.description}`,
  }));

  const analysis = {
    id: uuidv4(),
    assessment_id: assessmentId,
    gaps,
    recommended_solutions: recommended,
    ai_prompt: null,
    ai_response: null,
  };
  demoStore.gapAnalyses.push(analysis);
  return analysis;
}

export function ensureDemoPoc(assessmentId: string) {
  const existing = demoStore.pocPlans.find((p) => p.assessment_id === assessmentId);
  if (existing) return existing;

  const gap = ensureDemoGap(assessmentId);
  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const industry = demoStore.masters.industries.find((i) => i.id === client?.industry_id);
  const top = gap.recommended_solutions[0] || { solution_name: 'GenAI', solution_key: 'genai' };
  const solution = demoStore.masters.solutions.find((s) => s.solution_key === top.solution_key);

  const content = {
    title: `PoC Plan: ${top.solution_name} for ${client?.company_name || 'Client'}`,
    objectives: [
      'Validate ROI and technical feasibility within 90 days',
      'Prove measurable improvement on one priority KPI',
      'Build executive confidence for scaled investment',
    ],
    scope: `Deliver a focused ${top.solution_name} pilot addressing the top gap identified in the readiness assessment.`,
    timeline: [
      { phase: 'Week 1–2', activity: 'Discovery, data access, and environment setup' },
      { phase: 'Week 3–6', activity: 'Build, integrate, and internal testing' },
      { phase: 'Week 7–10', activity: 'Pilot with users and measure outcomes' },
      { phase: 'Week 11–12', activity: 'Executive readout and scale decision' },
    ],
    success_metrics: ['20% KPI improvement', '70%+ user adoption', 'Technical feasibility confirmed'],
    effort: solution?.typical_effort || 'Medium',
    low_cost_options: solution?.low_cost_options || 'Managed APIs and open models',
  };

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
  demoStore.pocPlans.push(poc);
  return poc;
}

export function ensureDemoProposal(assessmentId: string) {
  const existing = demoStore.proposals.find((p) => p.assessment_id === assessmentId);
  if (existing?.rendered_html) return existing;

  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
  const score = ensureDemoScore(assessmentId);
  const gap = ensureDemoGap(assessmentId);
  const poc = ensureDemoPoc(assessmentId);

  const driverTable = `<table class="letter-table"><thead><tr><th>Driver</th><th>Score</th></tr>${Object.entries(score.driver_scores)
    .map(([k, v]) => {
      const driver = demoStore.masters.drivers.find((d) => d.driver_key === k);
      return `<tr><td>${driver?.driver_name || k}</td><td>${v}/5</td></tr>`;
    })
    .join('')}</table>`;

  const gapsSection = `<ul>${gap.gaps.map((g) => `<li><strong>${g.driver}</strong> (${g.severity}): ${g.gap}</li>`).join('')}</ul>`;
  const solutionsSection = `<ul>${gap.recommended_solutions.map((s) => `<li><strong>${s.solution_name}</strong>: ${s.rationale}</li>`).join('')}</ul>`;

  let html = demoStore.masters.proposalTemplates.find((t) => t.is_default)?.template_html
    || '<h1>AI Readiness Proposal for {{company_name}}</h1><h2>Executive Summary</h2><p>Readiness score: <strong>{{readiness_score}}/5</strong> — {{maturity_stage}}</p><h2>Driver Scores</h2>{{driver_scores_table}}<h2>Gaps</h2>{{gaps_section}}<h2>Solutions</h2>{{solutions_section}}<h2>Proof of Concept</h2>{{poc_section}}';

  html = html
    .replace(/\{\{company_name\}\}/g, client?.company_name || 'Client')
    .replace(/\{\{readiness_score\}\}/g, String(score.overall_score))
    .replace(/\{\{maturity_stage\}\}/g, score.maturity_stage_name || 'Planning')
    .replace(/\{\{driver_scores_table\}\}/g, driverTable)
    .replace(/\{\{gaps_section\}\}/g, gapsSection)
    .replace(/\{\{solutions_section\}\}/g, solutionsSection)
    .replace(/\{\{poc_section\}\}/g, `<p>See the formal PoC letter prepared for this engagement. Key title: ${(poc.content as { title?: string }).title || 'Proof of Concept Plan'}.</p>`);

  const proposal = {
    id: uuidv4(),
    assessment_id: assessmentId,
    template_id: templateId,
    rendered_html: `<div class="proposal-letter-body">${html}</div>`,
    status: 'draft',
    finalized_at: null,
  };

  const idx = demoStore.proposals.findIndex((p) => p.assessment_id === assessmentId);
  if (idx >= 0) demoStore.proposals[idx] = proposal;
  else demoStore.proposals.push(proposal);

  return proposal;
}

export function buildDemoPackage(assessmentId: string) {
  const score = ensureDemoScore(assessmentId);
  const gap = ensureDemoGap(assessmentId);
  const poc = ensureDemoPoc(assessmentId);
  const proposal = ensureDemoProposal(assessmentId);
  const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
  if (assessment && assessment.status !== 'completed') assessment.status = 'scored';
  return { score, gap, poc, proposal };
}
