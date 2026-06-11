import { demoStore } from './demoStore.js';
import { geminiGenerateJSON, geminiTranscribeAudio, isGeminiConfigured } from './gemini.js';
import { isGenericBenchmark, sanitizeBenchmark } from './benchmarkUtils.js';
export function parseBusinessDomains(client) {
    if (client.business_domains?.length)
        return client.business_domains;
    if (!client.domain)
        return [];
    try {
        const parsed = JSON.parse(client.domain);
        if (Array.isArray(parsed))
            return parsed;
    }
    catch { /* legacy string */ }
    return client.domain.split(',').map((s) => s.trim()).filter(Boolean);
}
export function getAssessmentContext(assessmentId) {
    const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
    if (!assessment)
        return null;
    const client = demoStore.clients.find((c) => c.id === assessment.client_id);
    if (!client)
        return null;
    const industry = demoStore.masters.industries.find((i) => i.id === client.industry_id);
    const docs = demoStore.documents.filter((d) => d.assessment_id === assessmentId);
    const painPointNames = assessment.pain_point_ids
        .map((id) => demoStore.masters.painPoints.find((p) => p.id === id)?.category_name)
        .filter(Boolean);
    return {
        assessment,
        client,
        industryName: industry?.name || 'General',
        businessDomains: parseBusinessDomains(client),
        documents: docs,
        docSummaries: docs.map((d) => ({
            file_name: d.file_name,
            summary: d.extraction_summary,
        })),
        painPointNames,
        drivers: demoStore.masters.drivers,
        painPoints: demoStore.masters.painPoints,
    };
}
const RESEARCH_SCHEMA = {
    type: 'object',
    properties: {
        executive_summary: { type: 'string', description: '2-3 sentence overview' },
        company_context: { type: 'string', description: 'Company background and market position' },
        industry_ai_landscape: { type: 'string', description: 'AI trends in their industry' },
        opportunities: { type: 'string', description: 'Specific AI opportunities for this client' },
        risks_and_gaps: { type: 'string', description: 'Likely blockers and gaps' },
        assessment_focus: {
            type: 'array',
            items: { type: 'string' },
            description: '3-5 focus areas for the live assessment',
        },
        suggested_pain_points: {
            type: 'array',
            items: { type: 'string' },
        },
    },
    required: ['executive_summary', 'company_context', 'industry_ai_landscape', 'opportunities', 'risks_and_gaps', 'assessment_focus', 'suggested_pain_points'],
};
function formatDeepResearchMarkdown(data, companyName) {
    const focus = data.assessment_focus.map((f) => `- ${f}`).join('\n');
    return `## ${companyName} — Deep Pre-Assessment Research

### Executive Summary
${data.executive_summary}

### Company Context
${data.company_context}

### Industry AI Landscape
${data.industry_ai_landscape}

### AI Opportunities
${data.opportunities}

### Risks & Gaps
${data.risks_and_gaps}

### Recommended Assessment Focus
${focus}
`.trim();
}
function buildClientBrief(client, industryName, businessDomains) {
    return `
Company Name: ${client.company_name || 'Unknown'}
Industry: ${industryName}
Business Domains: ${businessDomains.join(', ') || 'Not specified'}
Website URL: ${client.website_url || 'Not provided'}
Website / Business Details: ${client.website_details || 'Not provided'}
Contact Name: ${client.contact_name || 'N/A'}
Contact Email: ${client.contact_email || 'no email'}
Contact Phone: ${client.contact_phone || 'N/A'}
`.trim();
}
function fallbackResearch(companyName, industryName, businessDomains) {
    const notes = formatDeepResearchMarkdown({
        executive_summary: `${companyName} is positioned in ${industryName} with domains spanning ${businessDomains.join(', ') || 'general business operations'}. A structured AI readiness assessment will clarify maturity across strategy, data, culture, and infrastructure.`,
        company_context: `${companyName} appears to be exploring AI adoption. Based on available profile data, the organization likely faces typical ${industryName} challenges around data integration, governance, and scaling pilots to production.`,
        industry_ai_landscape: `${industryName} peers are increasingly adopting AI for automation, analytics, and customer experience. Leaders invest in data platforms, MLOps, and responsible AI governance.`,
        opportunities: `- Process automation in high-volume workflows\n- Predictive analytics on operational data\n- GenAI for knowledge work and customer support\n- Computer vision / NLP where unstructured data is abundant`,
        risks_and_gaps: `- Data silos and quality issues\n- Limited AI literacy outside IT\n- Legacy systems blocking real-time AI\n- Compliance and security concerns`,
        assessment_focus: [
            'Business strategy alignment with AI goals',
            'Data infrastructure and integration readiness',
            'AI governance and responsible use',
            'Workforce adoption and change management',
            'Infrastructure for production AI workloads',
        ],
        suggested_pain_points: ['Manual Processes', 'Data Silos'],
    }, companyName);
    return { research_notes: notes, suggested_pain_points: ['Manual Processes', 'Data Silos'] };
}
export async function generateResearchNotes(assessmentId) {
    const ctx = getAssessmentContext(assessmentId);
    if (!ctx)
        throw new Error('Assessment not found');
    const { client, industryName, businessDomains } = ctx;
    const companyName = client.company_name?.trim() || 'Client';
    if (!client.company_name?.trim()) {
        throw new Error('Complete Step 1 (Company Name) before generating research');
    }
    const painPointOptions = ctx.painPoints.map((p) => p.category_name).join(', ');
    const clientBrief = buildClientBrief(client, industryName, businessDomains);
    if (!isGeminiConfigured()) {
        return fallbackResearch(companyName, industryName, businessDomains);
    }
    const prompt = `You are a senior AI readiness consultant performing DEEP pre-assessment research for a B2B sales team.

Use ONLY the client data below. Be specific to this company — cite their industry, domains, website details, and contact context. Do not use generic filler.

CLIENT DATA (Step 1):
${clientBrief}

Available pain point categories (pick 2-4 most relevant — use EXACT names): ${painPointOptions}

Produce thorough, actionable research the sales manager will use to run a live AI readiness assessment.
- executive_summary: crisp 2-3 sentences
- company_context: what we know + reasonable inference from their profile
- industry_ai_landscape: how peers in ${industryName} use AI today
- opportunities: bullet-style paragraph of 3-5 specific AI opportunities for ${companyName}
- risks_and_gaps: likely blockers based on profile
- assessment_focus: 4-6 concrete topics to probe in the live session
- suggested_pain_points: exact category names from the list`;
    const useTemplateFallback = (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes('TLS') || msg.includes('Could not reach Gemini') || msg.includes('fetch failed') || msg.includes('suspended');
    };
    try {
        const data = await geminiGenerateJSON(prompt, RESEARCH_SCHEMA);
        const research_notes = formatDeepResearchMarkdown(data, companyName);
        return {
            research_notes,
            suggested_pain_points: data.suggested_pain_points || [],
            executive_summary: data.executive_summary,
            key_opportunities: data.assessment_focus,
        };
    }
    catch (err) {
        if (useTemplateFallback(err)) {
            console.warn('Gemini research fallback:', err);
            return fallbackResearch(companyName, industryName, businessDomains);
        }
        throw err;
    }
}
const VALID_TYPES = new Set(['rating', 'text', 'voice', 'multi_select']);
const QUESTIONS_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        questions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    driver_key: {
                        type: 'string',
                        enum: ['business_strategy', 'technology_data', 'ai_strategy', 'org_culture', 'infrastructure'],
                    },
                    question_text: { type: 'string' },
                    question_type: {
                        type: 'string',
                        enum: ['rating', 'text', 'voice', 'multi_select'],
                    },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    is_required: { type: 'boolean' },
                },
                required: ['driver_key', 'question_text', 'question_type'],
            },
        },
    },
    required: ['questions'],
};
function normalizeDriverKey(raw, drivers) {
    const key = raw.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const exact = drivers.find((d) => d.driver_key === key);
    if (exact)
        return exact.driver_key;
    const partial = drivers.find((d) => key.includes(d.driver_key) || d.driver_key.includes(key.replace(/_/g, '')));
    if (partial)
        return partial.driver_key;
    const byWord = drivers.find((d) => {
        const words = d.driver_name.toLowerCase().split(/\s+/);
        return words.some((w) => key.includes(w.slice(0, 4)));
    });
    return byWord?.driver_key || drivers[0]?.driver_key || 'business_strategy';
}
function normalizeQuestionType(raw) {
    const t = raw.toLowerCase().replace(/[^a-z_]/g, '');
    if (t.includes('multi') || t === 'multiple_choice')
        return 'multi_select';
    if (t.includes('voice') || t.includes('audio'))
        return 'voice';
    if (t.includes('text') || t.includes('open'))
        return 'text';
    if (VALID_TYPES.has(t))
        return t;
    return 'rating';
}
function normalizeQuestion(q, drivers) {
    const text = q.question_text?.trim();
    if (!text || text.length < 10)
        return null;
    const question_type = normalizeQuestionType(q.question_type || 'rating');
    const driver_key = normalizeDriverKey(q.driver_key || '', drivers);
    let options = q.options?.filter((o) => typeof o === 'string' && o.trim()).map((o) => o.trim());
    if (question_type === 'multi_select') {
        if (!options || options.length < 2) {
            options = ['Not started', 'In progress', 'Mature / fully adopted'];
        }
        if (options.length > 5)
            options = options.slice(0, 5);
    }
    else {
        options = undefined;
    }
    return {
        driver_key,
        question_text: text,
        question_type,
        options,
        is_required: q.is_required !== false,
    };
}
/** Target mix: ~5 rating, ~3 multi_select, ~3 text, ~3 voice (12–15 total). */
const TARGET_TYPE_MIX = {
    rating: 5,
    multi_select: 3,
    text: 3,
    voice: 3,
};
const MIN_QUESTIONS = 12;
const MAX_QUESTIONS = 15;
const MIN_PER_DRIVER = 2;
function questionQualityScore(q) {
    return q.question_text.length + (q.options?.length || 0) * 5;
}
function dedupeQuestions(questions) {
    const seen = new Set();
    return questions.filter((q) => {
        const key = q.question_text.toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function syntheticQuestion(driver, question_type, ctx, variant) {
    const domain = ctx.businessDomains[0] || ctx.industryName;
    const co = ctx.companyName;
    const byDriver = {
        business_strategy: {
            rating: [
                `On a 1–5 scale, how clearly has ${co} linked AI investments to measurable ${domain} KPIs and executive accountability?`,
                `How mature is ${co}'s roadmap for prioritizing AI use cases against revenue, risk, and compliance goals in ${ctx.industryName}?`,
            ],
            multi_select: [
                `Which strategic planning rhythms does ${co} use today to fund and govern AI initiatives?`,
            ],
            text: [
                `List the top three business outcomes ${co} expects from AI in the next 12 months (metrics, owners, systems involved).`,
            ],
            voice: [
                `Walk us through how ${co}'s leadership team today decides which AI bets to fund, pause, or kill—and where that process breaks down.`,
            ],
        },
        technology_data: {
            rating: [
                `Rate (1–5) how integrated ${co}'s core data sources are for analytics and AI across ${domain} operations.`,
            ],
            multi_select: [
                `Which data platform patterns best describe ${co}'s current ${ctx.industryName} stack?`,
            ],
            text: [
                `Which CRM, ERP, data warehouse, and integration tools does ${co} rely on—and where do exports or manual spreadsheets still bridge gaps?`,
            ],
            voice: [
                `Describe a recent workflow at ${co} where teams had to manually reconcile data between systems before making a decision.`,
            ],
        },
        ai_strategy: {
            rating: [
                `How formalized is ${co}'s AI governance (policies, model review, vendor risk) for production use cases in ${ctx.industryName}?`,
            ],
            multi_select: [
                `Which AI delivery models is ${co} actively using or piloting?`,
            ],
            text: [
                `What AI solutions, copilots, or automations is ${co} already building or evaluating—include vendors and internal owners if known.`,
            ],
            voice: [
                `Tell us about an AI initiative ${co} attempted recently: intent, stakeholders, blockers, and what you would do differently.`,
            ],
        },
        org_culture: {
            rating: [
                `Rate frontline readiness at ${co} to adopt AI-assisted workflows in ${domain} (training, change management, incentives).`,
            ],
            multi_select: [
                `How does ${co} typically upskill teams on new digital or AI tooling?`,
            ],
            text: [
                `Which roles or departments at ${co} would be first impacted by AI—and what resistance or skills gaps do you anticipate?`,
            ],
            voice: [
                `Share how employees at ${co} react when automation touches their day-to-day work—examples help.`,
            ],
        },
        infrastructure: {
            rating: [
                `Rate ${co}'s cloud/MLOps readiness to deploy and monitor models in ${ctx.industryName} (1 = ad hoc, 5 = industrialized).`,
            ],
            multi_select: [
                `Which infrastructure capabilities does ${co} have in place for AI workloads?`,
            ],
            text: [
                `Document ${co}'s hosting model, identity/security controls, and any legacy systems that constrain real-time AI.`,
            ],
            voice: [
                `Explain how ${co} today deploys or would deploy an AI feature end-to-end—from data access to user-facing app.`,
            ],
        },
    };
    const multiOptionsByDriver = {
        business_strategy: [
            ['Annual board-level AI roadmap', 'Quarterly portfolio reviews', 'Ad hoc project approvals', 'No formal rhythm yet'],
            ['OKR-linked AI funding', 'Innovation lab / sandbox budget', 'Department P&L owners', 'Vendor-led pilots only'],
        ],
        technology_data: [
            ['Cloud warehouse + dbt/ELT', 'Operational DB replication', 'Spreadsheet-heavy reporting', 'Siloed departmental databases'],
            ['Real-time event streaming', 'Nightly batch only', 'API-led integrations', 'Manual CSV exports'],
        ],
        ai_strategy: [
            ['Buy SaaS copilots', 'Custom LLM apps', 'Traditional ML only', 'Exploring, not in production'],
            ['Central AI CoE', 'Embedded product squads', 'External SI partners', 'No dedicated owner'],
        ],
        org_culture: [
            ['Mandatory training paths', 'Optional lunch-and-learns', 'On-the-job shadowing', 'Minimal formal training'],
            ['Champions network', 'Executive sponsors only', 'Union/work-council review', 'No change program yet'],
        ],
        infrastructure: [
            ['Kubernetes + CI/CD for models', 'Managed ML platform (SageMaker/Azure ML)', 'VM-based scripts', 'On-prem only'],
            ['Full observability for models', 'Basic logging only', 'No production models yet', 'Third-party hosts everything'],
        ],
    };
    const pack = byDriver[driver.driver_key] || byDriver.business_strategy;
    const texts = pack[question_type];
    const text = texts[variant % texts.length] || texts[0];
    let options;
    if (question_type === 'multi_select') {
        const opts = multiOptionsByDriver[driver.driver_key] || multiOptionsByDriver.business_strategy;
        options = opts[variant % opts.length] || opts[0];
    }
    return {
        driver_key: driver.driver_key,
        question_text: text,
        question_type,
        options,
        is_required: true,
    };
}
function ensureDriverCoverage(questions, drivers, ctx) {
    const out = [...questions];
    const counts = new Map();
    for (const d of drivers)
        counts.set(d.driver_key, 0);
    for (const q of out)
        counts.set(q.driver_key, (counts.get(q.driver_key) || 0) + 1);
    const typeOrder = ['rating', 'multi_select', 'text', 'voice'];
    let synth = 0;
    for (const driver of drivers) {
        while ((counts.get(driver.driver_key) || 0) < MIN_PER_DRIVER) {
            const type = typeOrder[synth % typeOrder.length];
            out.push(syntheticQuestion(driver, type, ctx, synth++));
            counts.set(driver.driver_key, (counts.get(driver.driver_key) || 0) + 1);
        }
    }
    return out;
}
function enforceQuestionTypeMix(questions, drivers, ctx) {
    const sorted = [...questions].sort((a, b) => questionQualityScore(b) - questionQualityScore(a));
    const buckets = {
        rating: [],
        multi_select: [],
        text: [],
        voice: [],
    };
    for (const q of sorted)
        buckets[q.question_type].push(q);
    const selected = [];
    for (const type of Object.keys(TARGET_TYPE_MIX)) {
        const take = TARGET_TYPE_MIX[type];
        selected.push(...buckets[type].slice(0, take));
        buckets[type] = buckets[type].slice(take);
    }
    const counts = () => {
        const c = { rating: 0, multi_select: 0, text: 0, voice: 0 };
        for (const q of selected)
            c[q.question_type]++;
        return c;
    };
    let c = counts();
    let synth = 0;
    for (const type of Object.keys(TARGET_TYPE_MIX)) {
        while (c[type] < TARGET_TYPE_MIX[type]) {
            const driver = drivers[synth % drivers.length];
            selected.push(syntheticQuestion(driver, type, ctx, synth++));
            c = counts();
        }
    }
    while (selected.length < MIN_QUESTIONS) {
        const type = Object.keys(TARGET_TYPE_MIX).find((t) => c[t] < TARGET_TYPE_MIX[t] + 1) || 'rating';
        const driver = drivers[synth % drivers.length];
        selected.push(syntheticQuestion(driver, type, ctx, synth++));
        c = counts();
    }
    const trimOrder = ['rating', 'multi_select', 'text', 'voice'];
    let trimIdx = 0;
    while (selected.length > MAX_QUESTIONS) {
        const type = trimOrder[trimIdx % trimOrder.length];
        const idx = selected.map((q, i) => ({ q, i })).filter(({ q }) => q.question_type === type).pop()?.i;
        if (idx !== undefined)
            selected.splice(idx, 1);
        else
            selected.pop();
        trimIdx++;
        c = counts();
    }
    return selected;
}
function finalizeQuestionSet(questions, drivers, ctx) {
    const deduped = dedupeQuestions(questions);
    const withDrivers = ensureDriverCoverage(deduped, drivers, ctx);
    return enforceQuestionTypeMix(withDrivers, drivers, ctx);
}
function buildMixedFallbackQuestions(drivers, ctx) {
    const draft = [];
    const types = ['rating', 'multi_select', 'text', 'voice'];
    let i = 0;
    for (const driver of drivers) {
        for (let n = 0; n < MIN_PER_DRIVER; n++) {
            draft.push(syntheticQuestion(driver, types[i % types.length], ctx, i));
            i++;
        }
    }
    return finalizeQuestionSet(draft, drivers, ctx);
}
export async function generateAssessmentQuestions(assessmentId) {
    const ctx = getAssessmentContext(assessmentId);
    if (!ctx)
        throw new Error('Assessment not found');
    const { assessment, client, industryName, businessDomains, drivers, docSummaries, painPointNames } = ctx;
    const contextBlock = `
Company: ${client.company_name}
Industry: ${industryName}
Business Domains: ${businessDomains.join(', ') || 'Not specified'}
Website: ${client.website_url || 'N/A'}
Business Details: ${client.website_details || 'N/A'}
Research Notes: ${(assessment.pre_assessment_notes || 'None').slice(0, 4000)}
Pain Points: ${painPointNames.join(', ') || 'None selected'}
Documents: ${docSummaries.length ? JSON.stringify(docSummaries).slice(0, 3000) : 'None uploaded'}
`.trim();
    const buildCtx = {
        companyName: client.company_name,
        industryName,
        businessDomains,
    };
    if (!isGeminiConfigured()) {
        return buildMixedFallbackQuestions(drivers, buildCtx);
    }
    const driverList = drivers.map((d) => `${d.driver_key} (${d.driver_name})`).join(', ');
    const prompt = `You are an expert AI Readiness Assessor and Technical Analyst. Generate a highly tailored, conversational discovery questionnaire for a live executive session to uncover tech infrastructure gaps, manual bottlenecks, and strategic AI opportunities.

### COGNITIVE PREPARATION:
Before generating questions, cross-reference and synthesize:
1. **Uploaded Documents:** Analyze the executive's uploaded files to extract current software, hardware, operational workflows, and explicit pain points.
2. **Client Website/Domain:** Analyze their web presence to understand their precise business model, service delivery channels, and customer touchpoints.
3. **Competitive Landscape:** Benchmark against regional competitors within their country of operation to identify standard tech adoption levels and market pressures.

### INPUT CONTEXT:
**Client Context & Data:**
${contextBlock}

**Core Drivers (Use exact keys):** ${driverList}

### REQUIREMENTS:
1. **Total Count:** Exactly 12 to 15 questions uniquely tailored to ${client.company_name} (${industryName} industry).
2. **Driver Coverage:** At least 2 questions mapped to each driver key provided.
3. **Format Mix:**
   * **~5 rating:** (1-5 maturity scale)
   * **~3 multi_select:** (3-5 smart options mirroring standard practices of regional competitors and domain standards)
   * **~3 text:** (for tool/infrastructure specifications)
   * **~3 voice:** (for complex, narrative workflow descriptions)
4. **Targeted Deep-Dives:**
   * **Gaps & Infrastructure:** Target hidden manual bottlenecks, legacy stack limitations, and data silos.
   * **Aspirations:** Directly ask about the exact solutions, workflows, or AI capabilities they are already thinking about or attempting to build.
5. **Tone:** Domain-expert, conversational, and highly specific (never generic). Do not output expected answers.

### OUTPUT JSON FORMAT (wrap in "questions" array):
Each item must use question_type exactly as one of: rating, multi_select, text, voice.
[
  {
    "driver_key": "exact_driver_key_from_list",
    "question_type": "rating | multi_select | text | voice",
    "question_text": "Highly contextual question text targeting their tech, manual gaps, or desired solutions...",
    "options": ["Option A", "Option B", "Option C"]
  }
]
Include "options" ONLY for multi_select (3-5 options). Omit options for rating, text, and voice.
You MUST return exactly 5 rating, 3 multi_select, 3 text, and 3 voice questions (14 total) unless driver count forces 12-15.`;
    const useTemplateFallback = (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes('TLS') || msg.includes('Could not reach Gemini') || msg.includes('fetch failed');
    };
    let raw;
    try {
        const result = await geminiGenerateJSON(prompt, QUESTIONS_RESPONSE_SCHEMA);
        raw = Array.isArray(result.questions) ? result.questions : [];
    }
    catch (err) {
        if (useTemplateFallback(err)) {
            console.warn('Gemini unreachable — using template questions:', err);
            return buildMixedFallbackQuestions(drivers, buildCtx);
        }
        console.error('Gemini question generation failed, retrying without schema:', err);
        try {
            const retryPrompt = `${prompt}\n\nReturn ONLY valid JSON: {"questions":[{"driver_key":"business_strategy","question_text":"...","question_type":"rating","is_required":true}]}`;
            const result = await geminiGenerateJSON(retryPrompt);
            raw = Array.isArray(result.questions) ? result.questions : [];
        }
        catch (retryErr) {
            if (useTemplateFallback(retryErr)) {
                console.warn('Gemini retry failed — using template questions');
                return buildMixedFallbackQuestions(drivers, buildCtx);
            }
            throw retryErr;
        }
    }
    const normalized = raw
        .map((q) => normalizeQuestion(q, drivers))
        .filter((q) => q !== null);
    if (normalized.length < 8) {
        console.warn(`Only ${normalized.length} valid questions from Gemini; supplementing with contextual templates`);
        const existing = new Set(normalized.map((q) => q.question_text.toLowerCase()));
        for (const fb of buildMixedFallbackQuestions(drivers, buildCtx)) {
            if (normalized.length >= MIN_QUESTIONS)
                break;
            const key = fb.question_text.toLowerCase();
            if (!existing.has(key)) {
                normalized.push(fb);
                existing.add(key);
            }
        }
    }
    const finalized = finalizeQuestionSet(normalized, drivers, buildCtx);
    const mix = finalized.reduce((acc, q) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
    }, {});
    console.info(`Question mix for ${client.company_name}:`, mix, `total=${finalized.length}`);
    return finalized;
}
const EXPECTED_ANSWER_SCHEMA = {
    type: 'object',
    properties: {
        expected_answer: { type: 'string' },
    },
    required: ['expected_answer'],
};
/** Snap an arbitrary model string to one of the allowed options (case-insensitive, fuzzy). */
function matchOption(raw, options) {
    const cleaned = raw.trim().replace(/^["'\s]+|["'\s.]+$/g, '');
    const lower = cleaned.toLowerCase();
    const exact = options.find((o) => o.toLowerCase() === lower);
    if (exact)
        return exact;
    const contains = options.find((o) => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower));
    if (contains)
        return contains;
    return options[options.length - 1]; // assume options ordered ascending maturity
}
/** Clamp a model string to a valid rating value within the question's range. */
function matchRating(raw, min, max) {
    const n = parseInt(raw.replace(/[^0-9-]/g, ''), 10);
    if (Number.isNaN(n))
        return max;
    return Math.min(max, Math.max(min, n));
}
export async function generateExpectedAnswer(assessmentId, questionId) {
    const ctx = getAssessmentContext(assessmentId);
    if (!ctx)
        throw new Error('Assessment not found');
    const question = demoStore.questions.find((q) => q.id === questionId && q.assessment_id === assessmentId && q.session_status !== 'deleted');
    if (!question)
        throw new Error('Question not found');
    const { assessment, client, industryName, businessDomains } = ctx;
    const driver = demoStore.masters.drivers.find((d) => d.id === question.driver_id);
    const qType = question.question_type;
    const options = question.options?.filter((o) => typeof o === 'string' && o.trim()) || [];
    const ratingMin = question.rating_min ?? 1;
    const ratingMax = question.rating_max ?? 5;
    const ratingLabel = (val) => question.rating_labels?.[String(val)] || '';
    const useTemplateFallback = (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes('TLS') || msg.includes('Could not reach Gemini') || msg.includes('fetch failed') || msg.includes('suspended');
    };
    const clientContext = `CLIENT: ${client.company_name} (${industryName})
DOMAINS: ${businessDomains.join(', ') || 'General'}
RESEARCH SUMMARY: ${(assessment.pre_assessment_notes || '').slice(0, 2000)}
DRIVER: ${driver?.driver_name || 'General'}
QUESTION: ${question.question_text}`;
    // ---- multi_select: pick exactly ONE of the provided options (no prose) ----
    if (qType === 'multi_select') {
        if (options.length === 0)
            return '';
        if (!isGeminiConfigured())
            return options[options.length - 1];
        const prompt = `You are setting the benchmark answer for a multiple-choice AI readiness question.
${clientContext}
OPTIONS (choose exactly ONE): ${options.map((o, i) => `${i + 1}. ${o}`).join(' | ')}

Return the single option text that represents the IDEAL/most mature expected answer for this client.
Respond with ONLY the exact option text — no explanation, no extra words.`;
        try {
            const result = await geminiGenerateJSON(prompt, EXPECTED_ANSWER_SCHEMA);
            const raw = result.expected_answer || '';
            const cleaned = finalizeBenchmark(raw) || raw;
            return matchOption(cleaned, options);
        }
        catch (err) {
            if (useTemplateFallback(err))
                return options[options.length - 1];
            throw err;
        }
    }
    // ---- rating: return the expected rating value (radio buttons), not prose ----
    if (qType === 'rating') {
        const fallbackVal = ratingMax;
        const fmt = (v) => (ratingLabel(v) ? `${v} — ${ratingLabel(v)}` : String(v));
        if (!isGeminiConfigured())
            return fmt(fallbackVal);
        const labelsHint = question.rating_labels
            ? `Scale labels: ${Object.entries(question.rating_labels).map(([k, v]) => `${k}=${v}`).join(', ')}`
            : '';
        const prompt = `You are setting the benchmark rating for an AI readiness question.
${clientContext}
RATING SCALE: ${ratingMin} to ${ratingMax}. ${labelsHint}

Return the single ideal rating VALUE (a number between ${ratingMin} and ${ratingMax}) that a mature client should reach.
Respond with ONLY the number — no explanation.`;
        try {
            const result = await geminiGenerateJSON(prompt, EXPECTED_ANSWER_SCHEMA);
            return fmt(matchRating(result.expected_answer || '', ratingMin, ratingMax));
        }
        catch (err) {
            if (useTemplateFallback(err))
                return fmt(fallbackVal);
            throw err;
        }
    }
    // ---- text / voice: specific benchmark prose (never generic templates) ----
    if (!isGeminiConfigured()) {
        return '';
    }
    const voiceHint = qType === 'voice'
        ? 'Write what a mature client would SAY aloud in 3-5 sentences (first person plural is fine). This is a transcript benchmark.'
        : 'Write 2-4 sentences the client would type as a mature answer.';
    const prompt = `You are an AI readiness consultant writing a BENCHMARK answer for scoring (manager-only, not shown to client during the call).
${clientContext}
QUESTION TYPE: ${qType}
${voiceHint}

Rules:
- Be specific to ${client.company_name} and ${industryName} — mention real systems, workflows, or metrics where possible.
- Do NOT use phrases like "documented strategy, accountable ownership, measurable KPIs" as filler.
- Do NOT start with "Expected mature response" or similar meta text.
- Return only the benchmark answer text.`;
    try {
        const result = await geminiGenerateJSON(prompt, EXPECTED_ANSWER_SCHEMA);
        const raw = result.expected_answer?.trim() || '';
        if (isGenericBenchmark(raw))
            return '';
        return raw;
    }
    catch (err) {
        if (useTemplateFallback(err))
            return '';
        throw err;
    }
}
/** Strip generic template benchmarks from all questions on an assessment. */
export function clearGenericBenchmarks(assessmentId) {
    let cleared = 0;
    for (const q of demoStore.questions) {
        if (q.assessment_id !== assessmentId || q.session_status === 'deleted')
            continue;
        if (isGenericBenchmark(q.expected_answer)) {
            q.expected_answer = null;
            cleared++;
        }
    }
    return cleared;
}
/** After AI generation, reject generic filler before persisting. */
export function finalizeBenchmark(text) {
    const clean = sanitizeBenchmark(text);
    return clean || '';
}
export function formatClientAnswer(question, answer) {
    if (!answer)
        return '';
    if (question.question_type === 'rating') {
        const parts = [answer.rating_value != null ? `Rating: ${answer.rating_value}/5` : ''];
        if (answer.text_answer?.trim())
            parts.push(`Notes: ${answer.text_answer}`);
        if (answer.transcript_answer?.trim())
            parts.push(`Voice: ${answer.transcript_answer}`);
        return parts.filter(Boolean).join('. ');
    }
    if (question.question_type === 'voice')
        return answer.transcript_answer?.trim() || answer.text_answer?.trim() || '';
    if (question.question_type === 'multi_select')
        return answer.text_answer?.trim() || '';
    return answer.text_answer?.trim() || answer.transcript_answer?.trim() || '';
}
function heuristicQuestionScore(question, answer) {
    const clientText = formatClientAnswer(question, answer);
    if (question.question_type === 'rating' && answer?.rating_value != null) {
        return {
            score: answer.rating_value,
            summary: clientText,
            analysis: `Client self-rated ${answer.rating_value}/${question.rating_max} on this dimension.`,
        };
    }
    if (!clientText.trim()) {
        return { score: 1, summary: 'No answer provided', analysis: 'Question was not answered during the session.' };
    }
    let score = 3;
    const expected = question.expected_answer?.toLowerCase() || '';
    const actual = clientText.toLowerCase();
    if (expected) {
        const expectedWords = new Set(expected.split(/\W+/).filter((w) => w.length > 3));
        const actualWords = actual.split(/\W+/).filter((w) => w.length > 3);
        const overlap = actualWords.filter((w) => expectedWords.has(w)).length;
        const ratio = expectedWords.size ? overlap / expectedWords.size : 0;
        if (ratio >= 0.35)
            score = 4;
        else if (ratio >= 0.15)
            score = 3;
        else
            score = 2;
    }
    else {
        score = Math.min(5, Math.max(2, Math.round(clientText.length / 80) + 2));
    }
    return {
        score,
        summary: clientText.slice(0, 300),
        analysis: expected
            ? `Response compared to benchmark. ${score >= 4 ? 'Strong alignment with expected maturity.' : score <= 2 ? 'Notable gaps vs benchmark.' : 'Partial alignment with expected answer.'}`
            : `Scored from response depth and clarity (${clientText.length} chars captured).`,
    };
}
const SESSION_SCORE_SCHEMA = {
    type: 'object',
    properties: {
        executive_summary: { type: 'string' },
        key_findings: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        question_analyses: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question_id: { type: 'string' },
                    score: { type: 'number' },
                    analysis: { type: 'string' },
                    strengths: { type: 'array', items: { type: 'string' } },
                    gaps: { type: 'array', items: { type: 'string' } },
                    client_answer_summary: { type: 'string' },
                },
                required: ['question_id', 'score', 'analysis', 'client_answer_summary'],
            },
        },
    },
    required: ['executive_summary', 'question_analyses', 'key_findings', 'recommendations'],
};
function resolveMaturityStage(overall) {
    let stage = demoStore.masters.maturityStages[0];
    if (overall >= 4.5)
        stage = demoStore.masters.maturityStages[4];
    else if (overall >= 3.5)
        stage = demoStore.masters.maturityStages[3];
    else if (overall >= 2.5)
        stage = demoStore.masters.maturityStages[2];
    else if (overall >= 1.5)
        stage = demoStore.masters.maturityStages[1];
    return stage;
}
function buildBenchmarkComparison(assessmentId, driverScores) {
    const assessment = demoStore.assessments.find((a) => a.id === assessmentId);
    const client = assessment ? demoStore.clients.find((c) => c.id === assessment.client_id) : null;
    const benchmark = demoStore.masters.benchmarks.find((b) => b.industry_id === client?.industry_id);
    if (!benchmark)
        return null;
    const industryAvg = benchmark.avg_driver_scores;
    const delta = {};
    for (const key of Object.keys(driverScores)) {
        delta[key] = Math.round((driverScores[key] - (industryAvg[key] ?? 0)) * 100) / 100;
    }
    return {
        industry_avg: industryAvg,
        client_scores: driverScores,
        your_scores: driverScores,
        delta,
        industry_maturity_pct: benchmark.percentage,
    };
}
function aggregateDriverScores(questions, analyses) {
    const driverScores = {};
    const driverCounts = {};
    for (const q of questions) {
        const driver = demoStore.masters.drivers.find((d) => d.id === q.driver_id);
        if (!driver)
            continue;
        const analysis = analyses.find((a) => a.question_id === q.id);
        if (!analysis)
            continue;
        driverScores[driver.driver_key] = (driverScores[driver.driver_key] || 0) + analysis.score;
        driverCounts[driver.driver_key] = (driverCounts[driver.driver_key] || 0) + 1;
    }
    for (const key of Object.keys(driverScores)) {
        driverScores[key] = Math.round((driverScores[key] / driverCounts[key]) * 100) / 100;
    }
    return driverScores;
}
export async function scoreSessionWithAI(assessmentId, sessionId) {
    const ctx = getAssessmentContext(assessmentId);
    if (!ctx)
        throw new Error('Assessment not found');
    const session = demoStore.sessions.find((s) => s.id === sessionId);
    if (!session)
        throw new Error('Session not found');
    const questions = demoStore.questions.filter((q) => q.assessment_id === assessmentId && q.session_status === 'active');
    const answers = demoStore.answers.filter((a) => a.session_id === sessionId);
    const qaPayload = questions.map((q, i) => {
        const driver = demoStore.masters.drivers.find((d) => d.id === q.driver_id);
        const answer = answers.find((a) => a.question_id === q.id);
        return {
            question_id: q.id,
            index: i + 1,
            driver: driver?.driver_name || 'General',
            driver_key: driver?.driver_key || 'general',
            type: q.question_type,
            question: q.question_text,
            expected_benchmark: q.expected_answer || '(not set)',
            client_response: formatClientAnswer(q, answer) || '(no answer)',
        };
    });
    const { client, industryName, businessDomains, assessment } = ctx;
    let questionAnalyses = [];
    let executive_summary = '';
    let key_findings = [];
    let recommendations = [];
    if (isGeminiConfigured() && qaPayload.length > 0) {
        const prompt = `You are a senior AI readiness assessor scoring a COMPLETED live client session.

CLIENT: ${client.company_name} (${industryName})
DOMAINS: ${businessDomains.join(', ') || 'General'}
RESEARCH CONTEXT: ${(assessment.pre_assessment_notes || '').slice(0, 3000)}

For EACH question below, compare the client's actual response against the manager's expected benchmark.
Score 1-5 (1=immature/no alignment, 3=partial, 5=exceeds benchmark).
Provide honest, specific analysis referencing their actual words.

QUESTIONS & RESPONSES:
${JSON.stringify(qaPayload, null, 2)}

Return JSON with:
- executive_summary: 3-4 sentence overall assessment for ${client.company_name}
- key_findings: 4-6 bullet insights from the session
- recommendations: 3-5 prioritized next steps
- question_analyses: one entry per question_id with score, analysis, strengths[], gaps[], client_answer_summary`;
        try {
            const result = await geminiGenerateJSON(prompt, SESSION_SCORE_SCHEMA);
            executive_summary = result.executive_summary || '';
            key_findings = result.key_findings || [];
            recommendations = result.recommendations || [];
            questionAnalyses = (result.question_analyses || []).map((a) => {
                const q = questions.find((qq) => qq.id === a.question_id);
                const driver = q ? demoStore.masters.drivers.find((d) => d.id === q.driver_id) : null;
                return {
                    question_id: a.question_id,
                    question_text: q?.question_text,
                    driver_key: driver?.driver_key,
                    driver_name: driver?.driver_name,
                    score: Math.min(5, Math.max(1, Math.round(a.score * 10) / 10)),
                    analysis: a.analysis,
                    strengths: a.strengths || [],
                    gaps: a.gaps || [],
                    client_answer_summary: a.client_answer_summary,
                    expected_answer: q?.expected_answer ?? null,
                };
            });
        }
        catch {
            /* fall through to heuristic */
        }
    }
    if (questionAnalyses.length === 0) {
        questionAnalyses = questions.map((q) => {
            const answer = answers.find((a) => a.question_id === q.id);
            const driver = demoStore.masters.drivers.find((d) => d.id === q.driver_id);
            const h = heuristicQuestionScore(q, answer);
            return {
                question_id: q.id,
                question_text: q.question_text,
                driver_key: driver?.driver_key,
                driver_name: driver?.driver_name,
                score: h.score,
                analysis: h.analysis,
                strengths: h.score >= 4 ? ['Response aligns with expected benchmark'] : [],
                gaps: h.score <= 2 ? ['Gap vs expected benchmark or incomplete answer'] : [],
                client_answer_summary: h.summary,
                expected_answer: q.expected_answer ?? null,
            };
        });
        executive_summary = `${client.company_name} completed a live AI readiness session across ${questions.length} questions. Overall maturity reflects current responses vs manager benchmarks.`;
        key_findings = questionAnalyses.filter((a) => a.score <= 2).slice(0, 3).map((a) => `Gap identified: ${a.driver_name || 'area'} — ${a.analysis}`);
        if (key_findings.length === 0)
            key_findings = ['Session captured responses across all active assessment drivers.'];
        recommendations = ['Review driver scores below industry benchmark', 'Prioritize gap analysis and solution mapping', 'Schedule follow-up on lowest-scoring areas'];
    }
    const driver_scores = aggregateDriverScores(questions, questionAnalyses);
    const values = Object.values(driver_scores);
    const overall_score = values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        : Math.round((questionAnalyses.reduce((s, a) => s + a.score, 0) / Math.max(questionAnalyses.length, 1)) * 100) / 100;
    const stage = resolveMaturityStage(overall_score);
    return {
        driver_scores,
        overall_score,
        maturity_stage_id: stage.id,
        maturity_stage_name: stage.stage_name,
        executive_summary,
        key_findings,
        recommendations,
        question_analyses: questionAnalyses,
        benchmark_comparison: buildBenchmarkComparison(assessmentId, driver_scores),
    };
}
export async function transcribeSessionAudio(audioBase64, mimeType, questionText, companyName) {
    const contextPrompt = `Transcribe this client spoken answer during an AI readiness live assessment for ${companyName}.
Question asked: "${questionText}"
Return ONLY the verbatim transcription of what the client said. No commentary.`;
    if (isGeminiConfigured()) {
        try {
            return await geminiTranscribeAudio(audioBase64, mimeType, contextPrompt);
        }
        catch { /* fallback below */ }
    }
    return `Client verbal response regarding: ${questionText.slice(0, 120)}... (Configure GEMINI_API_KEY for real transcription)`;
}
