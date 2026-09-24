import type {
  AssessmentQuestion,
  DriverHeatmap,
  Executive,
  Lead,
  UseCase,
} from '../types'

export const CURRENT_USER = {
  name: 'Sarah Chen',
  role: 'account_executive' as const,
  email: 'sarah.chen@firm.com',
}

export const executives: Executive[] = [
  {
    id: 'ex-1',
    name: 'Sarah Chen',
    role: 'account_executive',
    region: 'APAC',
    lastLogin: '2026-06-04T09:12:00',
    activeQuestionnaires: 4,
    leadsProcessed: 28,
    conversionRate: 0.32,
  },
  {
    id: 'ex-2',
    name: 'Marcus Webb',
    role: 'team_lead',
    region: 'EMEA',
    lastLogin: '2026-06-03T16:45:00',
    activeQuestionnaires: 7,
    leadsProcessed: 41,
    conversionRate: 0.38,
  },
  {
    id: 'ex-3',
    name: 'Elena Vasquez',
    role: 'super_admin',
    region: 'Global',
    lastLogin: '2026-06-04T08:00:00',
    activeQuestionnaires: 12,
    leadsProcessed: 89,
    conversionRate: 0.41,
  },
]

export const initialLeads: Lead[] = []

export const generatedQuestions: AssessmentQuestion[] = [
  {
    id: 'q-1',
    sortOrder: 0,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: 'Data catalog maturity',
    category: 'Data Readiness',
    text: 'How mature is your enterprise data catalog and lineage tracking across operational systems?',
    type: 'slider',
    suggestedOptions: ['Ad-hoc spreadsheets', 'Partial catalog', 'Enterprise MDM'],
  },
  {
    id: 'q-2',
    sortOrder: 1,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: 'Data silos',
    category: 'Data Readiness',
    text: 'Which data quality issues most frequently block analytics or ML initiatives?',
    type: 'multiselect',
    options: ['Incomplete records', 'Stale timestamps', 'Siloed warehouses', 'PII consent gaps'],
    suggestedOptions: ['Schema drift', 'Duplicate customer IDs', 'Unstructured document backlog'],
  },
  {
    id: 'q-3',
    sortOrder: 2,
    taxonomyPillar: 'Process Improvements',
    domainContext: 'Manual fulfillment workflows',
    category: 'Operational Efficiency',
    text: 'Rate the level of manual intervention in your core fulfillment workflows.',
    type: 'slider',
  },
  {
    id: 'q-4',
    sortOrder: 3,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: 'Warehouse infrastructure',
    category: 'Operational Efficiency',
    text: 'Select infrastructure realities that match your current warehouse operations.',
    type: 'multiselect',
    options: ['WMS cloud-native', 'Legacy on-prem WMS', 'RFID partial rollout', 'No real-time visibility'],
    suggestedOptions: ['Hybrid edge gateways', 'Third-party 3PL APIs'],
  },
  {
    id: 'q-5',
    sortOrder: 4,
    taxonomyPillar: 'Non-Technical / Operational Pain Areas',
    domainContext: 'AI governance',
    category: 'Governance & Compliance',
    text: 'Describe your AI governance council structure and approval cadence.',
    type: 'richtext',
  },
  {
    id: 'q-6',
    sortOrder: 5,
    taxonomyPillar: 'Non-Technical / Operational Pain Areas',
    domainContext: 'Regulatory compliance',
    category: 'Governance & Compliance',
    text: 'Which regulatory frameworks directly constrain AI deployment in your jurisdiction?',
    type: 'multiselect',
    options: ['GDPR', 'EU AI Act', 'SOC 2', 'Industry-specific (PCI/HIPAA)'],
  },
  {
    id: 'q-7',
    sortOrder: 6,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: 'Cloud analytics posture',
    category: 'Technology Stack',
    text: 'What is your current cloud posture for analytics workloads?',
    type: 'multiselect',
    options: ['AWS', 'Azure', 'GCP', 'Private cloud only', 'Multi-cloud'],
  },
  {
    id: 'q-8',
    sortOrder: 7,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: 'ERP-CRM-lake integration',
    category: 'Technology Stack',
    text: 'Rate integration readiness between ERP, CRM, and data lake layers.',
    type: 'rating',
  },
  {
    id: 'q-9',
    sortOrder: 8,
    taxonomyPillar: 'Non-Technical / Operational Pain Areas',
    domainContext: 'AI literacy',
    category: 'Talent & Culture',
    text: 'How would you characterize internal AI literacy among operations leaders?',
    type: 'slider',
  },
  {
    id: 'q-10',
    sortOrder: 9,
    taxonomyPillar: 'Non-Technical / Operational Pain Areas',
    domainContext: 'Change management',
    category: 'Talent & Culture',
    text: 'Select change-management blockers observed in prior digital programs.',
    type: 'multiselect',
    options: ['Union negotiations', 'Skills gap', 'Executive sponsorship turnover', 'Budget cycles'],
  },
  {
    id: 'q-11',
    sortOrder: 10,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: 'Inaccessible datasets',
    category: 'Data Readiness',
    text: 'Provide examples of high-value datasets not yet accessible to data science teams.',
    type: 'richtext',
  },
  {
    id: 'q-12',
    sortOrder: 11,
    taxonomyPillar: 'Process Improvements',
    domainContext: 'OTIF benchmarking',
    category: 'Operational Efficiency',
    text: 'Benchmark: How does your OTIF performance compare to top-quartile peers in your vertical?',
    type: 'rating',
    suggestedOptions: ['Below median', 'Median', 'Top quartile', 'Unknown'],
  },
]

export const useCases: UseCase[] = [
  {
    id: 'uc-1',
    gap: 'Manual demand forecasting across 12 regions',
    solution: 'Agentic demand sensing with probabilistic SKU forecasts',
    horizon: 'pilot',
    impact: 'high',
  },
  {
    id: 'uc-2',
    gap: 'No unified customer 360 for loyalty programs',
    solution: 'Real-time feature store + personalization agents',
    horizon: 'long_term',
    impact: 'high',
  },
  {
    id: 'uc-3',
    gap: 'Document-heavy compliance reviews',
    solution: 'RAG-assisted policy alignment with human-in-the-loop',
    horizon: 'pilot',
    impact: 'medium',
  },
]

export const driverHeatmap: DriverHeatmap[] = [
  { driver: 'Data Readiness', count: 42 },
  { driver: 'Operational Efficiency', count: 38 },
  { driver: 'Technology Stack', count: 31 },
  { driver: 'Governance & Compliance', count: 27 },
  { driver: 'Talent & Culture', count: 19 },
]

export const funnelStages = [
  { key: 'intake', label: 'Lead Intake' },
  { key: 'research', label: 'Agent Research' },
  { key: 'review', label: 'Assessment' },
  { key: 'client_portal', label: 'Client Portal' },
  { key: 'analysis', label: 'Gap Analysis' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'converted', label: 'Converted' },
] as const

export const architectureBlueprint = {
  hosting: 'Hybrid — Azure landing zone with on-prem edge gateways for OT systems',
  pipelines: 'Event-driven ingestion (Kafka) → medallion lakehouse → feature store',
  access: 'RBAC via Entra ID, workload identity for agents, column-level masking on PII',
  security: 'Zero-trust network, private endpoints, model cards + bias monitoring in MLflow',
}
