import type { MandatoryQuestion, MasterDataCategory, PlatformUser } from '../types'

export const MASTER_DATA_LABELS: Record<MasterDataCategory, string> = {
  industries: 'Industries',
  drivers: 'Drivers',
  solutions: 'Solutions',
  painPoints: 'Pain Points',
  maturityStages: 'Maturity Stages',
}

/** Demo credentials — shown on login page */
export const DEMO_CREDENTIALS = [
  { email: 'elena@assessment.ai', password: 'admin123', role: 'Super Admin' },
  { email: 'marcus@assessment.ai', password: 'lead123', role: 'Sales Manager' },
  { email: 'sarah@assessment.ai', password: 'exec123', role: 'Sales Rep' },
] as const

export const initialPlatformUsers: PlatformUser[] = [
  {
    id: 'u-1',
    name: 'Elena Vasquez',
    email: 'elena@assessment.ai',
    role: 'super_admin',
    password: 'admin123',
    lastLogin: '2026-06-04T08:00:00',
  },
  {
    id: 'u-2',
    name: 'Marcus Webb',
    email: 'marcus@assessment.ai',
    role: 'team_lead',
    password: 'lead123',
    lastLogin: '2026-06-03T16:45:00',
  },
  {
    id: 'u-3',
    name: 'Sarah Chen',
    email: 'sarah@assessment.ai',
    role: 'account_executive',
    password: 'exec123',
    lastLogin: '2026-06-04T09:12:00',
  },
]

export const initialMasterData: Record<MasterDataCategory, string[]> = {
  industries: [
    'Supply Chain & Logistics',
    'Healthcare & Life Sciences',
    'Financial Services',
    'Government Department',
    'Retail & E-commerce',
  ],
  drivers: [
    'Data readiness',
    'Operational efficiency',
    'Governance & compliance',
    'Technology stack',
    'Talent & culture',
  ],
  solutions: [
    'Predictive analytics',
    'Process automation',
    'GenAI copilots',
    'Computer vision QA',
    'Forecasting & planning',
  ],
  painPoints: [
    'Legacy system integration',
    'Data silos',
    'Manual workflows',
    'Skills gap',
    'Regulatory uncertainty',
  ],
  maturityStages: [
    'Exploring',
    'Piloting',
    'Scaling',
    'Optimizing',
    'Industry-leading',
  ],
}

export const initialMandatoryQuestions: MandatoryQuestion[] = [
  {
    id: 'mq-1',
    text: 'How well is AI integrated into your business strategy?',
    type: 'singlechoice',
    options: [
      'Not considered',
      'Under discussion',
      'Partially integrated',
      'Core to strategy',
      'Industry-leading',
    ],
  },
  {
    id: 'mq-2',
    text: 'What is the current maturity level of business strategy for AI adoption?',
    type: 'singlechoice',
    options: ['Nascent', 'Emerging', 'Defined', 'Managed', 'Optimized'],
  },
  {
    id: 'mq-3',
    text: 'How well is AI integrated into your technology & data landscape?',
    type: 'multichoice',
    options: [
      'No unified data platform',
      'Pilot ML pipelines only',
      'Production APIs for models',
      'Real-time feature store',
      'Full MLOps on multi-cloud',
    ],
  },
  {
    id: 'mq-4',
    text: 'Rate your organization’s overall AI readiness (1–10).',
    type: 'scale',
    options: [],
  },
]
