import { v4 as uuidv4 } from 'uuid';
const roleIds = {
    super_admin: 'r0000001-0001-4001-8001-000000000001',
    sales_manager: 'r0000001-0001-4001-8001-000000000002',
    sales_rep: 'r0000001-0001-4001-8001-000000000003',
};
const driverIds = {
    business_strategy: 'd0000001-0001-4001-8001-000000000001',
    technology_data: 'd0000001-0001-4001-8001-000000000002',
    ai_strategy: 'd0000001-0001-4001-8001-000000000003',
    org_culture: 'd0000001-0001-4001-8001-000000000004',
    infrastructure: 'd0000001-0001-4001-8001-000000000005',
};
const industryIds = {
    financial: 'i0000001-0001-4001-8001-000000000001',
    healthcare: 'i0000001-0001-4001-8001-000000000002',
    retail: 'i0000001-0001-4001-8001-000000000003',
    manufacturing: 'i0000001-0001-4001-8001-000000000004',
    technology: 'i0000001-0001-4001-8001-000000000005',
};
const maturityIds = {
    exploring: 'm0000001-0001-4001-8001-000000000001',
    planning: 'm0000001-0001-4001-8001-000000000002',
    implementing: 'm0000001-0001-4001-8001-000000000003',
    scaling: 'm0000001-0001-4001-8001-000000000004',
    realizing: 'm0000001-0001-4001-8001-000000000005',
};
const solutionIds = {
    cv: 's0000001-0001-4001-8001-000000000001',
    nlp: 's0000001-0001-4001-8001-000000000002',
    predictive: 's0000001-0001-4001-8001-000000000003',
    genai: 's0000001-0001-4001-8001-000000000004',
    recommendation: 's0000001-0001-4001-8001-000000000005',
};
const painPointIds = {
    manual: 'p0000001-0001-4001-8001-000000000001',
    dataSilos: 'p0000001-0001-4001-8001-000000000002',
    customerExp: 'p0000001-0001-4001-8001-000000000003',
    operational: 'p0000001-0001-4001-8001-000000000004',
    compliance: 'p0000001-0001-4001-8001-000000000005',
    talent: 'p0000001-0001-4001-8001-000000000006',
    legacy: 'p0000001-0001-4001-8001-000000000007',
};
const templateId = 't0000001-0001-4001-8001-000000000001';
export const USER_IDS = {
    admin: 'a0000001-0001-4001-8001-000000000001',
    manager: 'a0000001-0001-4001-8001-000000000002',
    rep: 'a0000001-0001-4001-8001-000000000003',
};
export const CLIENT_IDS = {
    acme: 'b0000001-0001-4001-8001-000000000001',
    nova: 'b0000001-0001-4001-8001-000000000002',
    pilot: 'b0000001-0001-4001-8001-000000000003',
    draft: 'b0000001-0001-4001-8001-000000000004',
};
export const ASSESSMENT_IDS = {
    draft: 'c0000001-0001-4001-8001-000000000001',
    acme: 'c0000001-0001-4001-8001-000000000002',
    nova: 'c0000001-0001-4001-8001-000000000003',
    pilot: 'c0000001-0001-4001-8001-000000000004',
};
export const demoUsers = [
    {
        id: USER_IDS.admin,
        email: 'admin@pbshope.com',
        full_name: 'Super Admin',
        role_name: 'super_admin',
        role_id: roleIds.super_admin,
        is_active: true,
    },
    {
        id: USER_IDS.manager,
        email: 'manager@pbshope.com',
        full_name: 'Sales Manager',
        role_name: 'sales_manager',
        role_id: roleIds.sales_manager,
        is_active: true,
    },
    {
        id: USER_IDS.rep,
        email: 'rep@pbshope.com',
        full_name: 'Sales Rep',
        role_name: 'sales_rep',
        role_id: roleIds.sales_rep,
        is_active: true,
    },
];
export const demoPasswords = {
    'admin@pbshope.com': 'admin123',
    'manager@pbshope.com': 'manager123',
    'rep@pbshope.com': 'rep123',
};
export const demoStore = {
    users: [...demoUsers],
    clients: [],
    assessments: [],
    documents: [],
    chunks: [],
    questions: [],
    sessions: [],
    recordings: [],
    answers: [],
    scores: [],
    gapAnalyses: [],
    pocPlans: [],
    proposals: [],
    notifications: [],
    auditLogs: [],
    chatMessages: [],
    clientPortalSubmissions: [],
    sessions_auth: new Map(),
    masters: {
        industries: [
            { id: industryIds.financial, name: 'Financial Services', is_active: true },
            { id: industryIds.healthcare, name: 'Healthcare', is_active: true },
            { id: industryIds.retail, name: 'Retail', is_active: true },
            { id: industryIds.manufacturing, name: 'Manufacturing', is_active: true },
            { id: industryIds.technology, name: 'Technology', is_active: true },
        ],
        drivers: [
            { id: driverIds.business_strategy, driver_name: 'Business Strategy', driver_key: 'business_strategy', display_order: 1, description: 'Alignment of AI with business goals', icon_name: 'Target' },
            { id: driverIds.technology_data, driver_name: 'Technology & Data', driver_key: 'technology_data', display_order: 2, description: 'Data infrastructure readiness', icon_name: 'Database' },
            { id: driverIds.ai_strategy, driver_name: 'AI Strategy', driver_key: 'ai_strategy', display_order: 3, description: 'AI vision and governance', icon_name: 'Brain' },
            { id: driverIds.org_culture, driver_name: 'Organization & Culture', driver_key: 'org_culture', display_order: 4, description: 'Workforce readiness', icon_name: 'Users' },
            { id: driverIds.infrastructure, driver_name: 'Infrastructure', driver_key: 'infrastructure', display_order: 5, description: 'Cloud and MLOps', icon_name: 'Server' },
        ],
        maturityStages: [
            { id: maturityIds.exploring, stage_name: 'Exploring', stage_order: 1, color_hex: '#94A3B8', focus_area: 'Awareness', description: 'Exploring AI possibilities' },
            { id: maturityIds.planning, stage_name: 'Planning', stage_order: 2, color_hex: '#60A5FA', focus_area: 'Strategy', description: 'Planning AI initiatives' },
            { id: maturityIds.implementing, stage_name: 'Implementing', stage_order: 3, color_hex: '#FBBF24', focus_area: 'Execution', description: 'Implementing AI solutions' },
            { id: maturityIds.scaling, stage_name: 'Scaling', stage_order: 4, color_hex: '#34D399', focus_area: 'Growth', description: 'Scaling AI across departments' },
            { id: maturityIds.realizing, stage_name: 'Realizing', stage_order: 5, color_hex: '#A78BFA', focus_area: 'Value', description: 'Realizing AI value at scale' },
        ],
        questions: [],
        solutions: [
            { id: solutionIds.cv, solution_name: 'Computer Vision', solution_key: 'computer_vision', description: 'Visual inspection and image analysis', typical_effort: 'High', low_cost_options: 'Pre-trained models', icon_name: 'Eye' },
            { id: solutionIds.nlp, solution_name: 'NLP', solution_key: 'nlp', description: 'Text analysis and document processing', typical_effort: 'Medium', low_cost_options: 'Open-source models', icon_name: 'MessageSquare' },
            { id: solutionIds.predictive, solution_name: 'Predictive Analytics', solution_key: 'predictive_analytics', description: 'Forecasting and anomaly detection', typical_effort: 'Medium', low_cost_options: 'AutoML platforms', icon_name: 'TrendingUp' },
            { id: solutionIds.genai, solution_name: 'GenAI', solution_key: 'genai', description: 'Generative AI for content and automation', typical_effort: 'Medium', low_cost_options: 'Prompt engineering', icon_name: 'Sparkles' },
            { id: solutionIds.recommendation, solution_name: 'Recommendation Engine', solution_key: 'recommendation_engine', description: 'Personalization and recommendations', typical_effort: 'Low', low_cost_options: 'Collaborative filtering', icon_name: 'ThumbsUp' },
        ],
        painPoints: [
            { id: painPointIds.manual, category_name: 'Manual Processes', is_active: true },
            { id: painPointIds.dataSilos, category_name: 'Data Silos', is_active: true },
            { id: painPointIds.customerExp, category_name: 'Customer Experience', is_active: true },
            { id: painPointIds.operational, category_name: 'Operational Efficiency', is_active: true },
            { id: painPointIds.compliance, category_name: 'Compliance & Risk', is_active: true },
            { id: painPointIds.talent, category_name: 'Talent Shortage', is_active: true },
            { id: painPointIds.legacy, category_name: 'Legacy Systems', is_active: true },
        ],
        proposalTemplates: [{
                id: templateId,
                template_name: 'Default AI Readiness Proposal',
                template_html: `<h1>AI Readiness Proposal for {{company_name}}</h1>
<h2>Executive Summary</h2>
<p>Based on our assessment, {{company_name}} achieved a readiness score of <strong>{{readiness_score}}/5</strong>, placing you in the <strong>{{maturity_stage}}</strong> stage.</p>
<h2>Driver Scores</h2>
{{driver_scores_table}}
<h2>Identified Gaps</h2>
{{gaps_section}}
<h2>Recommended Solutions</h2>
{{solutions_section}}
<h2>Proof of Concept</h2>
{{poc_section}}`,
                is_default: true,
            }],
        benchmarks: [
            { id: uuidv4(), industry_id: industryIds.financial, maturity_stage_id: maturityIds.implementing, percentage: 35, avg_driver_scores: { business_strategy: 3.2, technology_data: 2.8, ai_strategy: 2.5, org_culture: 3.0, infrastructure: 2.7 } },
            { id: uuidv4(), industry_id: industryIds.healthcare, maturity_stage_id: maturityIds.planning, percentage: 40, avg_driver_scores: { business_strategy: 2.5, technology_data: 2.3, ai_strategy: 2.0, org_culture: 2.8, infrastructure: 2.2 } },
        ],
    },
};
function seedTestData() {
    const now = new Date().toISOString();
    demoStore.clients.push({
        id: CLIENT_IDS.acme,
        company_name: 'Acme Financial Corp',
        industry_id: industryIds.financial,
        contact_name: 'Jane Smith',
        contact_email: 'jane.smith@acme.com',
        contact_phone: '+1-555-0101',
        domain: 'Financial Services, B2B SaaS',
        business_domains: ['Financial Services', 'B2B SaaS'],
        website_url: 'https://www.acmefinancial.com',
        website_details: 'Regional bank expanding digital lending and fraud detection capabilities.',
        country_of_operation: 'United States',
    }, {
        id: CLIENT_IDS.nova,
        company_name: 'Nova Health Systems',
        industry_id: industryIds.healthcare,
        contact_name: 'Dr. Robert Chen',
        contact_email: 'rchen@novahealth.org',
        contact_phone: '+1-555-0102',
        domain: 'Healthcare, Technology',
        business_domains: ['Healthcare', 'Technology'],
        website_url: 'https://www.novahealth.org',
        website_details: 'Hospital network piloting clinical documentation and patient triage AI.',
        country_of_operation: 'United States',
    }, {
        id: CLIENT_IDS.pilot,
        company_name: 'Pilot Logistics Inc',
        industry_id: industryIds.technology,
        contact_name: 'Maria Garcia',
        contact_email: 'maria@pilotlogistics.com',
        contact_phone: '+1-555-0103',
        domain: 'Logistics, E-commerce',
        business_domains: ['Logistics', 'E-commerce'],
        website_url: 'https://www.pilotlogistics.com',
        website_details: 'Mid-size 3PL seeking route optimization and warehouse automation.',
        country_of_operation: 'United States',
    }, {
        id: CLIENT_IDS.draft,
        company_name: 'New Client Assessment',
        industry_id: industryIds.technology,
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        domain: null,
        business_domains: [],
        website_url: null,
        website_details: null,
        country_of_operation: null,
    });
    const assessmentDefaults = { portal_token: null, approved_at: null };
    demoStore.assessments.push({
        id: ASSESSMENT_IDS.draft,
        client_id: CLIENT_IDS.draft,
        status: 'draft',
        assigned_rep_id: null,
        created_by: USER_IDS.manager,
        pre_assessment_notes: null,
        pain_point_ids: [],
        industry_benchmark_snapshot: null,
        current_step: 1,
        completed_steps: [],
        ...assessmentDefaults,
        created_at: now,
        updated_at: now,
    }, {
        id: ASSESSMENT_IDS.acme,
        client_id: CLIENT_IDS.acme,
        status: 'pre_assessment',
        assigned_rep_id: null,
        created_by: USER_IDS.manager,
        pre_assessment_notes: '## Acme Financial Corp — Pre-Assessment Research\n\n**Industry:** Financial Services\n**Focus:** Digital lending, fraud detection, regulatory compliance.\n\nAcme is a regional bank investing in AI for credit scoring and AML monitoring.',
        pain_point_ids: [painPointIds.manual, painPointIds.dataSilos],
        industry_benchmark_snapshot: { percentage: 35, avg_driver_scores: { business_strategy: 3.2, technology_data: 2.8 } },
        current_step: 3,
        completed_steps: [1, 2],
        ...assessmentDefaults,
        created_at: now,
        updated_at: now,
    }, {
        id: ASSESSMENT_IDS.nova,
        client_id: CLIENT_IDS.nova,
        status: 'assigned',
        assigned_rep_id: USER_IDS.rep,
        created_by: USER_IDS.manager,
        pre_assessment_notes: '## Nova Health Systems — Pre-Assessment Research\n\n**Industry:** Healthcare\n**Focus:** Clinical documentation, patient triage, HIPAA-compliant AI.\n\nNova operates 12 hospitals exploring ambient clinical notes and ED triage support.',
        pain_point_ids: [painPointIds.dataSilos, painPointIds.legacy],
        industry_benchmark_snapshot: { percentage: 40, avg_driver_scores: { business_strategy: 2.5, technology_data: 2.3 } },
        current_step: 5,
        completed_steps: [1, 2, 3, 4],
        ...assessmentDefaults,
        created_at: now,
        updated_at: now,
    }, {
        id: ASSESSMENT_IDS.pilot,
        client_id: CLIENT_IDS.pilot,
        status: 'assigned',
        assigned_rep_id: USER_IDS.rep,
        created_by: USER_IDS.manager,
        pre_assessment_notes: '## Pilot Logistics Inc — Pre-Assessment Research\n\n**Industry:** Technology / Logistics\n**Focus:** Route optimization, warehouse automation, demand forecasting.',
        pain_point_ids: [painPointIds.manual, painPointIds.dataSilos, painPointIds.legacy],
        industry_benchmark_snapshot: null,
        current_step: 5,
        completed_steps: [1, 2, 3, 4],
        ...assessmentDefaults,
        created_at: now,
        updated_at: now,
    });
    const novaQuestions = [
        { assessment_id: ASSESSMENT_IDS.nova, source_question_id: null, driver_id: driverIds.business_strategy, question_text: 'How clearly has Nova Health linked AI investments to clinical outcome KPIs?', question_type: 'rating', rating_min: 1, rating_max: 5, rating_labels: { '1': 'Not at all', '5': 'Fully' }, options: null, expected_answer_time_seconds: 60, display_order: 1, is_required: true, is_ai_generated: true, session_status: 'active', skip_reason: null, original_question_text: null },
        { assessment_id: ASSESSMENT_IDS.nova, source_question_id: null, driver_id: driverIds.technology_data, question_text: 'Is patient data across your 12 hospitals integrated enough for enterprise AI models?', question_type: 'rating', rating_min: 1, rating_max: 5, rating_labels: { '1': 'Not at all', '5': 'Fully' }, options: null, expected_answer_time_seconds: 60, display_order: 2, is_required: true, is_ai_generated: true, session_status: 'active', skip_reason: null, original_question_text: null },
        { assessment_id: ASSESSMENT_IDS.nova, source_question_id: null, driver_id: driverIds.ai_strategy, question_text: 'Do you have a HIPAA-reviewed AI governance framework for clinical use cases?', question_type: 'text', rating_min: 1, rating_max: 5, rating_labels: null, options: null, expected_answer_time_seconds: 60, display_order: 3, is_required: true, is_ai_generated: true, session_status: 'active', skip_reason: null, original_question_text: null },
        { assessment_id: ASSESSMENT_IDS.nova, source_question_id: null, driver_id: driverIds.org_culture, question_text: 'How ready are frontline clinicians to adopt ambient documentation tools?', question_type: 'voice', rating_min: 1, rating_max: 5, rating_labels: null, options: null, expected_answer_time_seconds: 90, display_order: 4, is_required: true, is_ai_generated: true, session_status: 'active', skip_reason: null, original_question_text: null },
        { assessment_id: ASSESSMENT_IDS.nova, source_question_id: null, driver_id: driverIds.infrastructure, question_text: 'Which EHR integration patterns do you use for real-time AI inference?', question_type: 'multi_select', rating_min: 1, rating_max: 5, rating_labels: null, options: ['HL7 FHIR APIs', 'Batch ETL', 'Direct DB access', 'None yet'], expected_answer_time_seconds: 60, display_order: 5, is_required: true, is_ai_generated: true, session_status: 'active', skip_reason: null, original_question_text: null },
    ];
    demoStore.questions.push(...novaQuestions.map((q) => ({ ...q, id: uuidv4(), expected_answer: null })));
    demoStore.notifications.push({ id: uuidv4(), user_id: USER_IDS.rep, title: 'Assessment Assigned', message: 'You have been assigned Nova Health Systems assessment', type: 'info', link: `/assessments/${ASSESSMENT_IDS.nova}`, is_read: false, created_at: now }, { id: uuidv4(), user_id: USER_IDS.rep, title: 'Assessment Assigned', message: 'You have been assigned Pilot Logistics Inc assessment', type: 'info', link: `/assessments/${ASSESSMENT_IDS.pilot}`, is_read: false, created_at: now });
}
// Seed master questions
let order = 1;
for (const driver of demoStore.masters.drivers) {
    demoStore.masters.questions.push({
        id: uuidv4(),
        driver_id: driver.id,
        question_text: `How well is AI integrated into your ${driver.driver_name.toLowerCase()}?`,
        question_type: 'rating',
        rating_min: 1,
        rating_max: 5,
        rating_labels: { '1': 'Not at all', '2': 'Limited', '3': 'Moderate', '4': 'Strong', '5': 'Fully' },
        expected_answer_time_seconds: 60,
        display_order: order++,
        is_required: true,
    }, {
        id: uuidv4(),
        driver_id: driver.id,
        question_text: `What is the current maturity level of ${driver.driver_name.toLowerCase()} for AI adoption?`,
        question_type: 'rating',
        rating_min: 1,
        rating_max: 5,
        rating_labels: { '1': 'Not at all', '2': 'Limited', '3': 'Moderate', '4': 'Strong', '5': 'Fully' },
        expected_answer_time_seconds: 60,
        display_order: order++,
        is_required: true,
    });
}
seedTestData();
export { roleIds, driverIds, industryIds, maturityIds, solutionIds, templateId, painPointIds };
