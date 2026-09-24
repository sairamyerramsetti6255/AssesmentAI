import type { Lead } from '../../types'
import { leadStatusOptions, leadTypeOptions } from '../../data/constants'
import { Badge, Select } from '../ui'

function labelFor<T extends { value: string; label: string }>(options: T[], value?: string) {
  return options.find((o) => o.value === value)?.label
}

interface Props {
  leads: Lead[]
  selectedLeadId: string | null
  onSelectLead: (id: string) => void
  selectedLead?: Lead
}

export function LeadContextBar({ leads, selectedLeadId, onSelectLead, selectedLead }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="min-w-[12rem] flex-1 sm:max-w-xs">
        <Select
          label="Active lead"
          value={selectedLeadId ?? ''}
          onChange={(e) => onSelectLead(e.target.value)}
          options={[
            { value: '', label: '— Select lead —' },
            ...leads.map((l) => ({ value: l.id, label: l.companyName })),
          ]}
        />
      </div>
      {selectedLead && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate">{selectedLead.industry}</Badge>
          {selectedLead.leadStatus && (
            <Badge tone="brand">{labelFor(leadStatusOptions, selectedLead.leadStatus)}</Badge>
          )}
          {selectedLead.leadType && (
            <Badge tone="slate">{labelFor(leadTypeOptions, selectedLead.leadType)}</Badge>
          )}
          <Badge tone="amber">{selectedLead.funnelStatus.replace(/_/g, ' ')}</Badge>
        </div>
      )}
    </div>
  )
}
