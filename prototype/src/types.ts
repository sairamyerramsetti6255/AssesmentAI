export type UserRole = 'super_admin' | 'team_lead' | 'account_executive'

export interface PlatformUser {
  id: string
  name: string
  email: string
  role: UserRole
  /** Demo-only — not for production */
  password?: string
  lastLogin?: string
}

export type ActivityKind =
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.update'
  | 'user.delete'
  | 'assessment.approve'
  | 'assessment.link_sent'
  | 'assessment.export'
  | 'client.portal_open'
  | 'client.portal_save'
  | 'client.portal_submit'
  | 'client.on_behalf_fill'

export interface ActivityLogEntry {
  id: string
  at: string
  kind: ActivityKind
  actorName: string
  actorRole: UserRole
  summary: string
  leadId?: string
  companyName?: string
}

export type MasterDataCategory =
  | 'industries'
  | 'drivers'
  | 'solutions'
  | 'painPoints'
  | 'maturityStages'

export interface MandatoryQuestion {
  id: string
  text: string
  type: 'singlechoice' | 'multichoice' | 'scale' | 'text'
  options: string[]
}

export type FunnelStatus =
  | 'intake'
  | 'research'
  | 'review'
  | 'client_portal'
  | 'analysis'
  | 'proposal'
  | 'converted'
  | 'lost'

export type AssessmentStatus = 'draft' | 'approved'

/** Legacy driver labels — kept for analytics heatmaps */
export type QuestionCategory =
  | 'Data Readiness'
  | 'Operational Efficiency'
  | 'Governance & Compliance'
  | 'Technology Stack'
  | 'Talent & Culture'

export type TaxonomyPillar =
  | 'Technical Pain Points'
  | 'Non-Technical / Operational Pain Areas'
  | 'Process Improvements'

export interface AssessmentTaxonomy {
  userDomain: string
  technicalPainPoints: string[]
  operationalPainAreas: string[]
  processImprovements: string[]
}

export interface AssessmentQuestion {
  id: string
  sortOrder: number
  taxonomyPillar: TaxonomyPillar
  domainContext: string
  /** Legacy / secondary label for reporting */
  category: QuestionCategory
  text: string
  type:
    | 'singlechoice'
    | 'multichoice'
    | 'scale'
    | 'text'
    | 'slider'
    | 'multiselect'
    | 'richtext'
    | 'rating'
  /** Client-facing choices (always includes "Other" for choice types) */
  options?: string[]
  /** Executive-only smart injections — optional extras */
  suggestedOptions?: string[]
  /** Always included from Admin — cannot be removed in review */
  isMandatory?: boolean
}

export type DocumentMatchStatus = 'matched' | 'unmatched'

export interface LeadDocument {
  id: string
  name: string
  matchStatus: DocumentMatchStatus
  /** Business / statement date on the document */
  transactionDate: string
  uploadedAt: string
  source: 'intake' | 'client'
  /** Set when file is stored on server — used for download */
  hasFile?: boolean
}

export interface Lead {
  id: string
  companyName: string
  industry: string
  domain: string
  country: string
  assignedExecutive: string
  funnelStatus: FunnelStatus
  createdAt: string
  lastInteraction: string
  documents: LeadDocument[]
  researchProgress: number
  assessmentStatus: AssessmentStatus
  portalToken?: string
  clientProgress?: number
  remarks: string[]
  clientAnswers?: Record<string, string | number | string[]>
  /** Free text when client selects "Other" */
  clientOtherText?: Record<string, string>
  clientRichtext?: Record<string, string>
  /** Documents uploaded by client in portal */
  clientUploadedDocuments?: LeadDocument[]
  aiResearch?: {
    webScrapeUrl: string
    webScrapeExcerpt: string
    webScrapeError?: string
    webInsights: string[]
    competitors: string[]
    documentInsights: string[]
    executiveBrief: string
  }
  assessmentTaxonomy?: AssessmentTaxonomy
  proposalUseCases?: UseCase[]
  proposalArchitecture?: {
    hosting: string
    pipelines: string
    access: string
    security: string
  }
}

export interface Executive {
  id: string
  name: string
  role: UserRole
  region: string
  lastLogin: string
  activeQuestionnaires: number
  leadsProcessed: number
  conversionRate: number
}

export interface UseCase {
  id: string
  gap: string
  solution: string
  horizon: 'pilot' | 'long_term'
  impact: 'high' | 'medium'
}

export interface DriverHeatmap {
  driver: QuestionCategory
  count: number
}
