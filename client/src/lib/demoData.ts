import type { GapAnalysis, PocPlan, Proposal, Question, QuestionAnalysis, Results, Score } from './api';
import type { PocLetterContent } from './pocContent';

const DRIVER_KEYS = [
  'business_strategy',
  'technology_data',
  'ai_strategy',
  'org_culture',
  'infrastructure',
] as const;

const DRIVER_NAMES: Record<string, string> = {
  business_strategy: 'Business Strategy',
  technology_data: 'Technology & Data',
  ai_strategy: 'AI Strategy',
  org_culture: 'Organization & Culture',
  infrastructure: 'Infrastructure',
};

export const DEMO_DRIVERS = DRIVER_KEYS.map((key, i) => ({
  id: `demo-driver-${i + 1}`,
  driver_key: key,
  driver_name: DRIVER_NAMES[key],
}));

export const DEMO_MATURITY_STAGES = [
  { stage_name: 'Exploring', color_hex: '#94A3B8' },
  { stage_name: 'Planning', color_hex: '#60A5FA' },
  { stage_name: 'Implementing', color_hex: '#FBBF24' },
  { stage_name: 'Scaling', color_hex: '#34D399' },
  { stage_name: 'Realizing', color_hex: '#A78BFA' },
];

function qid(assessmentId: string, n: number) {
  return `demo-q-${assessmentId.slice(0, 8)}-${n}`;
}

export function buildDemoResearch(companyName: string, industryName = 'Financial Services') {
  return {
    research_notes: `## ${companyName} — AI readiness snapshot (demo)

**Industry:** ${industryName}

### Executive context
${companyName} is moving from exploratory AI pilots toward governed, production-grade capabilities. Leadership has sponsored copilot trials in operations and customer service, but outcomes are not yet tied to enterprise OKRs.

### Observed strengths
- Executive sponsorship for a 12-month AI roadmap
- Modern cloud footprint with API-first integration patterns
- Willingness to fund a focused 90-day proof of concept

### Priority pain points
- Fragmented data across CRM, ERP, and document stores
- Limited MLOps / LLMOps standards for model promotion
- Change management load on frontline teams adopting AI assistants

### Recommended assessment focus
Validate data readiness, governance, and a single high-ROI use case before scaling spend.`,
    pain_point_ids: ['demo-pp-1', 'demo-pp-2', 'demo-pp-3'],
  };
}

export function buildDemoQuestions(assessmentId: string, driverIds: string[], companyName = 'the organization'): Question[] {
  const d = (i: number) => driverIds[i % driverIds.length] || DEMO_DRIVERS[i % 5].id;
  const specs: Array<Omit<Question, 'id'>> = [
    {
      question_text: `How clearly has ${companyName} linked AI investments to measurable business outcomes?`,
      question_type: 'rating',
      rating_min: 1,
      rating_max: 5,
      rating_labels: { '1': 'Not at all', '3': 'Partially', '5': 'Fully aligned' },
      options: null,
      driver_id: d(0),
      display_order: 1,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 60,
      expected_answer:
        'Mature organizations score 4–5: AI initiatives map to OKRs with executive owners, quarterly reviews, and funded roadmaps—not ad hoc experiments.',
    },
    {
      question_text: 'Rate your enterprise data quality and accessibility for analytics and AI workloads.',
      question_type: 'rating',
      rating_min: 1,
      rating_max: 5,
      rating_labels: { '1': 'Poor', '5': 'Excellent' },
      options: null,
      driver_id: d(1),
      display_order: 2,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 60,
      expected_answer:
        'Benchmark: unified catalog, documented lineage, and <5% critical field null rates in core customer/transaction entities.',
    },
    {
      question_text: 'Which AI governance practices are in place today?',
      question_type: 'multi_select',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: [
        'AI risk committee',
        'Model inventory & approvals',
        'Prompt/PII redaction standards',
        'Third-party model reviews',
        'None formalized yet',
      ],
      driver_id: d(2),
      display_order: 3,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 90,
      expected_answer:
        'Target state: risk committee + inventory + secure prompt patterns; at minimum two controls active before production GenAI.',
    },
    {
      question_text: 'Describe how frontline teams are trained and supported to adopt AI copilots or automation.',
      question_type: 'text',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: null,
      driver_id: d(3),
      display_order: 4,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 120,
      expected_answer:
        'Strong answers cite champions per business unit, office hours, measured adoption KPIs, and feedback loops into product owners.',
    },
    {
      question_text: 'What is your current cloud / MLOps posture for deploying models to production?',
      question_type: 'multi_select',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: ['Kubernetes + CI/CD', 'Managed ML platform', 'Serverless only', 'Manual releases', 'Not in production'],
      driver_id: d(4),
      display_order: 5,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 90,
      expected_answer:
        'Production-ready: automated promotion gates, monitoring, rollback, and environment separation (dev/stage/prod).',
    },
    {
      question_text: 'How would you rate executive sponsorship and budget continuity for AI over the next 12 months?',
      question_type: 'rating',
      rating_min: 1,
      rating_max: 5,
      rating_labels: { '1': 'None', '5': 'Committed multi-year' },
      options: null,
      driver_id: d(0),
      display_order: 6,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 60,
      expected_answer: 'Score 4+ when funding is ring-fenced and tied to named executive sponsors with quarterly checkpoints.',
    },
    {
      question_text: 'Which document or knowledge sources are available for retrieval-augmented GenAI?',
      question_type: 'text',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: null,
      driver_id: d(1),
      display_order: 7,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 90,
      expected_answer:
        'Ideal: policy manuals, SOPs, and CRM notes in a governed vector index with access controls by role.',
    },
    {
      question_text: 'Share an example where an AI pilot succeeded or stalled—what made the difference?',
      question_type: 'voice',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: null,
      driver_id: d(2),
      display_order: 8,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 120,
      expected_answer:
        'Listen for clear KPI movement, sponsor engagement, and whether data + change management were addressed early.',
    },
    {
      question_text: 'How mature is observability for AI systems (latency, drift, cost, safety incidents)?',
      question_type: 'rating',
      rating_min: 1,
      rating_max: 5,
      rating_labels: { '1': 'None', '5': 'Full SLO coverage' },
      options: null,
      driver_id: d(4),
      display_order: 9,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 60,
      expected_answer: 'Mature teams track token cost, quality sampling, red-team findings, and rollback playbooks.',
    },
    {
      question_text: 'Select the top barriers slowing AI scale in your organization.',
      question_type: 'multi_select',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: ['Data silos', 'Compliance review', 'Talent gap', 'Legacy integration', 'Unclear ROI'],
      driver_id: d(3),
      display_order: 10,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 90,
      expected_answer: 'Prioritize 1–2 blockers with owners; data + governance are the most common root causes.',
    },
    {
      question_text: 'Rate partner/vendor management for external AI models and APIs.',
      question_type: 'rating',
      rating_min: 1,
      rating_max: 5,
      rating_labels: { '1': 'Ad hoc', '5': 'Formal vendor risk program' },
      options: null,
      driver_id: d(2),
      display_order: 11,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 60,
      expected_answer: 'Include security review, data residency, and exit strategy for each model provider.',
    },
    {
      question_text: 'What outcomes would define success for a 90-day AI proof of concept?',
      question_type: 'text',
      rating_min: 1,
      rating_max: 5,
      rating_labels: null,
      options: null,
      driver_id: d(0),
      display_order: 12,
      is_required: true,
      is_ai_generated: true,
      session_status: 'active',
      expected_answer_time_seconds: 120,
      expected_answer:
        'Concrete KPI delta (e.g., 20% cycle-time reduction), adoption threshold, and documented production path.',
    },
  ];

  return specs.map((s, i) => ({ ...s, id: qid(assessmentId, i + 1) }));
}

export function buildDemoScore(companyName: string, questions: Question[]): Score {
  const driver_scores: Record<string, number> = {
    business_strategy: 3.4,
    technology_data: 2.6,
    ai_strategy: 3.1,
    org_culture: 2.9,
    infrastructure: 3.0,
  };
  const overall =
    Math.round((Object.values(driver_scores).reduce((a, b) => a + b, 0) / 5) * 10) / 10;

  const industryAvg: Record<string, number> = {
    business_strategy: 3.6,
    technology_data: 3.4,
    ai_strategy: 3.5,
    org_culture: 3.3,
    infrastructure: 3.4,
  };

  const question_analyses: QuestionAnalysis[] = questions.slice(0, 6).map((q, i) => ({
    question_id: q.id,
    question_text: q.question_text,
    driver_key: DRIVER_KEYS[i % 5],
    driver_name: DRIVER_NAMES[DRIVER_KEYS[i % 5]],
    score: i % 2 === 0 ? 3 : 4,
    analysis:
      'Client response aligns with mid-maturity patterns—clear intent but execution gaps in data and operating model.',
    strengths: ['Executive awareness', 'Pilot momentum'],
    gaps: ['Standardized governance', 'Production monitoring'],
    client_answer_summary:
      i % 3 === 0
        ? 'Rated 3/5 — partial alignment with enterprise KPIs.'
        : 'Described ongoing copilot trials with operations team champions.',
    expected_answer: q.expected_answer,
  }));

  return {
    driver_scores,
    overall_score: overall,
    maturity_stage_name: 'Implementing',
    benchmark_comparison: {
      industry_avg: industryAvg,
      client_scores: driver_scores,
      delta: Object.fromEntries(
        Object.keys(driver_scores).map((k) => [k, driver_scores[k] - (industryAvg[k] ?? 3.3)]),
      ),
      industry_maturity_pct: 58,
    },
    executive_summary: `${companyName} demonstrates **Implementing-stage** AI readiness (${overall}/5). Strategy and sponsorship are visible, but **Technology & Data** and **Organization & Culture** trail industry benchmarks—ideal focus areas for a governed GenAI proof of concept within 90 days.`,
    key_findings: [
      'Executive sponsorship is active, yet funding is not fully tied to measurable OKRs.',
      'Data integration and catalog maturity limit trustworthy enterprise GenAI.',
      'Governance practices are emerging but not consistently enforced across units.',
      'Successful copilot pilots exist; scaling requires MLOps and change management.',
    ],
    recommendations: [
      'Launch a single high-ROI GenAI PoC with explicit KPIs and executive steering.',
      'Establish AI governance checkpoints before any production promotion.',
      'Invest in data foundation (catalog, lineage, access) in parallel with the pilot.',
    ],
    question_analyses,
  };
}

export function buildDemoGap(): GapAnalysis {
  return {
    gaps: [
      {
        driver: 'Technology & Data',
        gap: 'Core customer and operations data remain siloed; AI teams spend ~40% of cycle time on data prep instead of model value.',
        severity: 'high',
      },
      {
        driver: 'Organization & Culture',
        gap: 'Frontline adoption of copilots is uneven—champions exist in two departments but no enterprise playbooks or adoption KPIs.',
        severity: 'medium',
      },
      {
        driver: 'AI Strategy',
        gap: 'Governance committee is forming but lacks model inventory, prompt safety standards, and production approval gates.',
        severity: 'medium',
      },
      {
        driver: 'Infrastructure',
        gap: 'Monitoring for LLM cost, latency, and quality drift is manual; no unified observability dashboard.',
        severity: 'low',
      },
    ],
    recommended_solutions: [
      {
        solution_name: 'GenAI',
        solution_key: 'genai',
        rationale:
          'Addresses knowledge-worker productivity and document-heavy workflows with retrieval-augmented copilots—fastest path to measurable ROI within 90 days.',
      },
      {
        solution_name: 'NLP',
        solution_key: 'nlp',
        rationale:
          'Structured extraction from contracts, policies, and service tickets improves data readiness feeding downstream AI products.',
      },
      {
        solution_name: 'Predictive Analytics',
        solution_key: 'predictive_analytics',
        rationale:
          'Forecasting and anomaly detection on operations data complements GenAI once core pipelines are stabilized.',
      },
    ],
  };
}

export function buildDemoPocContent(companyName: string): PocLetterContent {
  return {
    title: `Proof of Concept: Enterprise GenAI Copilot — ${companyName}`,
    objectives: [
      'Prove 20% reduction in document handling time for the pilot user group',
      'Validate secure retrieval over approved knowledge bases with role-based access',
      'Establish executive confidence to fund scale-up with clear governance gates',
    ],
    scope:
      'Design, build, and pilot a retrieval-augmented GenAI assistant integrated with two priority systems of record. Includes red-team review, prompt library, and adoption playbook for 25–50 users.',
    timeline: [
      { phase: 'Week 1–2', activity: 'Discovery, data access, security review, and success metrics sign-off' },
      { phase: 'Week 3–5', activity: 'Index construction, copilot UX, and integration stubs' },
      { phase: 'Week 6–8', activity: 'Pilot with champions; measure time-on-task and quality samples' },
      { phase: 'Week 9–10', activity: 'Harden observability, cost controls, and executive readout' },
    ],
    success_metrics: [
      '≥20% improvement on targeted process cycle time',
      '≥70% weekly active usage among pilot cohort',
      'Zero critical security findings at go/no-go review',
    ],
    effort: 'Medium (10 weeks, blended Pbshope + client team)',
    low_cost_options: 'Managed APIs (Gemini / Azure OpenAI) with existing SSO and vector store',
  };
}

export function buildDemoPoc(companyName: string): PocPlan {
  const content = buildDemoPocContent(companyName);
  return {
    content: content as unknown as Record<string, unknown>,
    html_content: '',
  };
}

export function buildDemoProposalHtml(companyName: string, score: Score, gap: GapAnalysis, poc: PocLetterContent): string {
  const rows = Object.entries(score.driver_scores)
    .map(([k, v]) => `<tr><td>${DRIVER_NAMES[k] || k}</td><td><strong>${v}/5</strong></td></tr>`)
    .join('');
  const gapsList = gap.gaps
    .map((g) => `<li><strong>${g.driver}</strong> <span style="color:#7288AE">(${g.severity})</span> — ${g.gap}</li>`)
    .join('');
  const solList = gap.recommended_solutions
    .map((s) => `<li><strong>${s.solution_name}</strong> — ${s.rationale}</li>`)
    .join('');

  return `<div class="proposal-letter-body">
<h1>AI Readiness Proposal — ${companyName}</h1>
<p class="letter-lead">Prepared by <strong>Pbshope · Assessment ai</strong> · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

<h2>Executive summary</h2>
<p>${companyName} achieved an overall readiness score of <strong>${score.overall_score}/5</strong>, placing the organization in the <strong>${score.maturity_stage_name}</strong> maturity stage. This proposal outlines prioritized gaps, recommended solution paths, and a focused proof of concept to unlock measurable value within one quarter.</p>
<p>${score.executive_summary || ''}</p>

<h2>Driver scorecard</h2>
<table class="letter-table"><thead><tr><th>Driver</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>

<h2>Key findings</h2>
<ul>${(score.key_findings || []).map((f) => `<li>${f}</li>`).join('')}</ul>

<h2>Prioritized gaps</h2>
<ul>${gapsList}</ul>

<h2>Recommended Pbshope solutions</h2>
<ul>${solList}</ul>

<h2>Proof of concept</h2>
<p><strong>${poc.title}</strong></p>
<p>${poc.scope}</p>
<h3>Success metrics</h3>
<ul>${poc.success_metrics.map((m) => `<li>${m}</li>`).join('')}</ul>
<h3>Indicative timeline</h3>
<ul>${poc.timeline.map((t) => `<li><strong>${t.phase}:</strong> ${t.activity}</li>`).join('')}</ul>

<h2>Recommended next steps</h2>
<ol>
<li>Approve PoC charter and steering committee (Week 1)</li>
<li>Finalize data access and security sign-off (Week 2)</li>
<li>Begin pilot build with weekly KPI reviews (Weeks 3–8)</li>
<li>Executive scale decision based on pilot outcomes (Week 10)</li>
</ol>
<p>We look forward to partnering with ${companyName} on a disciplined, outcomes-driven AI journey.</p>
</div>`;
}

export function buildDemoProposal(companyName: string, score: Score, gap: GapAnalysis): Proposal {
  const poc = buildDemoPocContent(companyName);
  return {
    rendered_html: buildDemoProposalHtml(companyName, score, gap, poc),
    status: 'draft',
  };
}

export function buildDemoResults(assessmentId: string, companyName: string, questions: Question[]): Results {
  const score = buildDemoScore(companyName, questions);
  const answers = questions.slice(0, 5).map((q, i) => ({
    question_id: q.id,
    rating_value: q.question_type === 'rating' ? (i % 2 === 0 ? 3 : 4) : null,
    text_answer:
      q.question_type === 'text'
        ? 'We run two copilot pilots in operations with positive feedback but limited KPI tracking.'
        : null,
    transcript_answer:
      q.question_type === 'voice'
        ? 'Leadership is supportive; our main challenge is consolidating data before we scale assistants enterprise-wide.'
        : null,
  }));

  return {
    score,
    questions,
    answers,
    drivers: DEMO_DRIVERS,
    maturityStages: DEMO_MATURITY_STAGES,
  };
}

export function buildDemoChatReply(message: string, companyName?: string): string {
  const co = companyName || 'the client';
  const lower = message.toLowerCase();
  if (lower.includes('gap') || lower.includes('poc')) {
    return `For **${co}**, the highest-priority gap is **Technology & Data** (data silos). The recommended path is a **90-day GenAI copilot PoC** with retrieval over approved knowledge bases. Open **Gap Analysis** for the full breakdown and PoC letter.`;
  }
  if (lower.includes('score') || lower.includes('result')) {
    return `**${co}** is in the **Implementing** stage (~3.0/5 overall). Technology & Data trails industry benchmarks—ideal focus for the next investment cycle. See **Results** for driver radar and per-question analysis.`;
  }
  if (lower.includes('proposal')) {
    return `The **client proposal** rolls up scores, gaps, solutions, and the PoC plan. In demo mode all sections are pre-filled—open **Proposal** to review and finalize.`;
  }
  return `I'm running in **demo mode** (no live AI). For **${co}**, use the pipeline: Results → Gap Analysis → PoC letter → Proposal. Ask about "gaps", "scores", or "proposal" for tailored guidance.`;
}

export const DEMO_TRANSCRIPT =
  'We have strong executive support for AI. Our pilot copilots help agents draft responses faster, but we need better data integration and governance before rolling out enterprise-wide.';
