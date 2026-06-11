import type { FunnelStatus } from '../types'

/** Static funnel stage labels — not stored in DB */
export const funnelStages: { key: FunnelStatus; label: string }[] = [
  { key: 'intake', label: 'Lead Intake' },
  { key: 'research', label: 'Agent Research' },
  { key: 'review', label: 'Executive Review' },
  { key: 'client_portal', label: 'Client Portal' },
  { key: 'analysis', label: 'Gap Analysis' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'converted', label: 'Converted' },
]
