import type { FunnelStatus, LeadStatus, LeadType } from '../types'

export const leadStatusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'nurturing', label: 'Nurturing' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'unqualified', label: 'Unqualified' },
]

export const leadTypeOptions: { value: LeadType; label: string }[] = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'referral', label: 'Referral' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'mid_market', label: 'Mid-market' },
  { value: 'partner', label: 'Partner' },
]

/** Static funnel stage labels — not stored in DB */
export const funnelStages: { key: FunnelStatus; label: string }[] = [
  { key: 'intake', label: 'Lead Intake' },
  { key: 'research', label: 'Agent Research' },
  { key: 'review', label: 'Assessment' },
  { key: 'client_portal', label: 'Client Portal' },
  { key: 'analysis', label: 'Gap Analysis' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'converted', label: 'Converted' },
]
