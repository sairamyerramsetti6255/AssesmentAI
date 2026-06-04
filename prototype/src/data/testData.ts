import type { AssessmentQuestion } from '../types'

/** Values used across slider, rating, multiselect, and richtext fields */
export type FormAnswerValue = string | number | string[]

export interface LeadIntakeFormData {
  companyName: string
  industry: string
  domain: string
  country: string
  documents: string[]
}

export interface ClientAssessmentFormData {
  answers: Record<string, FormAnswerValue>
  richtext: Record<string, string>
  voiceTranscript?: string
}

/** Lead onboarding form — primary demo prefill */
export const defaultLeadIntakeForm: LeadIntakeFormData = {
  companyName: 'Aurora Health Systems',
  industry: 'Healthcare',
  domain: 'aurorahealth.io',
  country: 'Canada',
  documents: [
    'clinical-data-map-v2.pdf',
    'hipaa-gap-assessment.docx',
    'legacy-ehr-integration-diagram.pdf',
  ],
}

/** Additional intake form samples (cycle via UI) */
export const leadIntakeFormSamples: LeadIntakeFormData[] = [
  defaultLeadIntakeForm,
  {
    companyName: 'Velocity Freight Co.',
    industry: 'Supply Chain',
    domain: 'velocityfreight.de',
    country: 'Germany',
    documents: ['fleet-telematics-export.pdf', 'warehouse-sop-2025.docx'],
  },
  {
    companyName: 'Brightline Media',
    industry: 'Retail',
    domain: 'brightlinemedia.co.jp',
    country: 'Japan',
    documents: ['cdp-architecture.pdf', 'personalization-rfp-responses.docx'],
  },
  {
    companyName: 'Copper Ridge Energy',
    industry: 'Manufacturing',
    domain: 'copperridge.energy',
    country: 'United States',
    documents: ['scada-asset-registry.pdf', 'predictive-maintenance-pilot-notes.docx'],
  },
  {
    companyName: 'Harbor Capital Partners',
    industry: 'Financial Services',
    domain: 'harborcapital.lu',
    country: 'Luxembourg',
    documents: ['model-risk-management-policy.pdf', 'aml-transaction-monitoring-audit.pdf'],
  },
]

/** Suggested pipeline / CRM remark snippets */
export const pipelineRemarkSamples: string[] = [
  'CFO aligned on 90-day pilot budget; legal reviewing DPA addendum.',
  'Competitor benchmark shared — client prefers phased rollout vs. big-bang.',
  'Data steward identified; catalog refresh scheduled before model training.',
  'Risk committee flagged EU AI Act high-risk classification for credit scoring use case.',
  'Follow-up call 12 Jun — demo agentic workflow on sample shipment dataset.',
  'Champion (VP Ops) leaving in Q3; need succession sponsor before proposal sign-off.',
]

/** Full client assessment responses keyed by portal token */
export const clientAssessmentByToken: Record<string, ClientAssessmentFormData> = {
  'prt-demo-8f3a': {
    answers: {
      'q-1': 6,
      'q-2': ['Incomplete records', 'Siloed warehouses', 'PII consent gaps'],
      'q-3': 7,
      'q-4': ['Legacy on-prem WMS', 'RFID partial rollout'],
      'q-6': ['GDPR', 'Industry-specific (PCI/HIPAA)'],
      'q-7': ['AWS', 'Multi-cloud'],
      'q-8': 3,
      'q-9': 5,
      'q-10': ['Skills gap', 'Budget cycles'],
      'q-12': 2,
    },
    richtext: {
      'q-5':
        'Quarterly AI governance board chaired by CIO; use cases >$50k require legal + risk sign-off within 10 business days.',
      'q-11':
        'Store-level basket affinity and real-time promo elasticity data remain in regional POS silos—not yet in the lakehouse.',
    },
    voiceTranscript:
      'Recorded 3 Jun: Operations lead noted RFID coverage at 41% of DCs; prioritizing inventory AI after WMS upgrade in October.',
  },
  'sfs-demo-2c91': {
    answers: {
      'q-1': 8,
      'q-2': ['Stale timestamps', 'Duplicate customer IDs'],
      'q-3': 4,
      'q-4': ['WMS cloud-native'],
      'q-6': ['GDPR', 'EU AI Act', 'SOC 2'],
      'q-7': ['Azure', 'Private cloud only'],
      'q-8': 4,
      'q-9': 7,
      'q-10': ['Executive sponsorship turnover'],
      'q-12': 4,
    },
    richtext: {
      'q-5':
        'Model risk management forum meets monthly; all LLM deployments require documented fallback and human review for client communications.',
      'q-11':
        'Trade surveillance alerts and correspondent banking KYC files are high-value but restricted to on-prem analytics VLAN.',
    },
    voiceTranscript:
      'Recorded 28 May: MD sponsor wants RAG on policy corpus first; scoring models deferred to 2027 roadmap.',
  },
}

/** Partial in-progress responses for leads still in review (no portal yet) */
export const clientAssessmentByLeadId: Record<string, ClientAssessmentFormData> = {
  'lead-1': {
    answers: {
      'q-1': 5,
      'q-2': ['Incomplete records', 'Stale timestamps'],
      'q-3': 8,
      'q-4': ['No real-time visibility', 'Legacy on-prem WMS'],
    },
    richtext: {
      'q-5': 'Steering committee ad hoc; formal AI policy draft expected Q4.',
    },
  },
}

/** Build answers for any question set (used when token has no explicit entry) */
export function buildDefaultClientAnswers(
  questions: AssessmentQuestion[],
): ClientAssessmentFormData {
  const answers: Record<string, FormAnswerValue> = {}
  const richtext: Record<string, string> = {}

  for (const q of questions) {
    switch (q.type) {
      case 'slider':
        answers[q.id] = 6
        break
      case 'rating':
        answers[q.id] = 4
        break
      case 'multiselect':
        answers[q.id] = q.options?.slice(0, 2) ?? []
        break
      case 'richtext':
        richtext[q.id] =
          'Test response: Lorem operational context — legacy integrations, manual handoffs, and pending data catalog initiative.'
        break
    }
  }

  return {
    answers,
    richtext,
    voiceTranscript:
      'Test voice note (transcribed): Stakeholders confirmed workshop date and shared sample datasets via secure link.',
  }
}

export function getClientTestData(
  token: string | undefined,
  leadId: string | undefined,
  questions: AssessmentQuestion[],
): ClientAssessmentFormData {
  if (token && clientAssessmentByToken[token]) {
    return clientAssessmentByToken[token]
  }
  if (leadId && clientAssessmentByLeadId[leadId]) {
    return clientAssessmentByLeadId[leadId]
  }
  return buildDefaultClientAnswers(questions)
}

/** Agent research output snapshots (display-only) */
export const agentResearchSnapshots: Record<
  string,
  { web: string[]; competitors: string[]; documents: string[] }
> = {
  'lead-1': {
    web: [
      '12 regional DCs; sustainability report cites 18% YoY volume growth',
      'Careers page lists 40+ data engineer openings',
    ],
    competitors: ['DHL Supply Chain AI', 'Maersk warehouse robotics program'],
    documents: ['Extracted 14 entities from architecture-overview.pdf'],
  },
  'lead-2': {
    web: ['Omnichannel rollout in ANZ; Shopify Plus mentioned in press release'],
    competitors: ['Woolworths micro-fulfillment', 'Coles RFID initiative'],
    documents: ['Governance framework maps 6 data domains'],
  },
  'lead-3': {
    web: ['ISO 9001 recertified 2025; IoT pilot on assembly line 4'],
    competitors: ['Siemens predictive maintenance suite', 'GE Digital twins'],
    documents: [],
  },
  'lead-4': {
    web: ['FCA-regulated; annual report highlights GenAI policy taskforce'],
    competitors: ['Revolut ML fraud stack', 'Monzo customer intelligence'],
    documents: ['Risk assessment flags 3 high-risk AI use cases'],
  },
}
