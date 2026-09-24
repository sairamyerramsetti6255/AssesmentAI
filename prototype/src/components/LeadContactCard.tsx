import type { Lead } from '../types'
import { leadStatusOptions, leadTypeOptions } from '../data/constants'

function labelFor<T extends { value: string; label: string }>(options: T[], value?: string) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

interface Props {
  lead: Lead
  compact?: boolean
}

export function LeadContactCard({ lead, compact }: Props) {
  const rows = [
    { label: 'Primary email', value: lead.clientEmail },
    { label: 'Phone', value: lead.clientPhone },
    { label: 'Available time', value: lead.availableTime },
    { label: 'Lead status', value: labelFor(leadStatusOptions, lead.leadStatus) },
    { label: 'Lead type', value: labelFor(leadTypeOptions, lead.leadType) },
    { label: 'Assigned executive', value: lead.assignedExecutive },
    ...(lead.intakeRemarks ? [{ label: 'Intake remarks', value: lead.intakeRemarks }] : []),
  ].filter((r) => r.value)

  if (rows.length === 0) return null

  if (compact) {
    return (
      <p className="text-xs text-slate-600">
        {lead.clientEmail && <span>{lead.clientEmail}</span>}
        {lead.clientPhone && <span>{lead.clientEmail ? ' · ' : ''}{lead.clientPhone}</span>}
        {lead.assignedExecutive && <span> · Exec: {lead.assignedExecutive}</span>}
      </p>
    )
  }

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className={row.label === 'Intake remarks' ? 'sm:col-span-2' : ''}>
          <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
          <dd className="mt-0.5 text-slate-800">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
