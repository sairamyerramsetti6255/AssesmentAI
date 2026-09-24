import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { funnelStages } from '../data/constants'
import { pipelineRemarkSamples } from '../data/testData'
import type { FunnelStatus, Lead } from '../types'
import { LeadContactCard } from '../components/LeadContactCard'
import { LeadContextBar, PageSection } from '../components/page-layout'
import { Badge, Button, Input, PageHeader } from '../components/ui'

const columns: { status: FunnelStatus; label: string }[] = [
  { status: 'intake', label: 'Intake' },
  { status: 'research', label: 'Research' },
  { status: 'review', label: 'Assessment' },
  { status: 'client_portal', label: 'Client Portal' },
  { status: 'analysis', label: 'Analysis' },
  { status: 'proposal', label: 'Proposal' },
  { status: 'converted', label: 'Converted' },
]

export function Pipeline() {
  const { leads, selectedLeadId, setSelectedLeadId, selectedLead, addRemark, moveLeadStatus } =
    useApp()
  const [note, setNote] = useState('')
  const [sampleRemark, setSampleRemark] = useState(pipelineRemarkSamples[0])

  const insertSampleRemark = () => {
    setNote(sampleRemark)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Opportunity Pipeline"
        description="Kanban view of lead lifecycle and executive follow-up notes."
      />

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.funnelStatus === col.status)
          return (
            <div
              key={col.status}
              className="min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-slate-50/80"
            >
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-slate-600">{col.label}</p>
                <p className="text-lg font-bold text-slate-900">{colLeads.length}</p>
              </div>
              <div className="space-y-2 p-2">
                {colLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full rounded-lg border bg-white p-3 text-left text-sm shadow-sm transition hover:border-pbs-300 ${
                      selectedLeadId === lead.id ? 'border-pbs-500 ring-2 ring-pbs-500/20' : 'border-slate-200'
                    }`}
                  >
                    <p className="font-semibold text-slate-800">{lead.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.industry}</p>
                    {lead.clientProgress !== undefined && lead.clientProgress > 0 && (
                      <p className="mt-1 text-xs text-pbs-600">Portal {lead.clientProgress}%</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedLead && (
        <PageSection title="Lead follow-up" description="Contact details, CRM remarks, and stage changes.">
          <div className="space-y-6">
            <LeadContextBar
              leads={leads}
              selectedLeadId={selectedLeadId}
              onSelectLead={(id: string) => setSelectedLeadId(id || null)}
              selectedLead={selectedLead}
            />

            <LeadContactCard lead={selectedLead} />

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Created</dt>
                <dd className="font-medium">{selectedLead.createdAt}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Assessment</dt>
                <dd>
                  <Badge tone={selectedLead.assessmentStatus === 'approved' ? 'emerald' : 'amber'}>
                    {selectedLead.assessmentStatus}
                  </Badge>
                </dd>
              </div>
            </dl>

            {(selectedLead.clientProgress ?? 0) > 0 && (
              <p className="text-sm text-slate-600">
                Client portal progress: <strong>{selectedLead.clientProgress}%</strong>.{' '}
                <Link to="/client-response" className="font-medium text-pbs-600 hover:underline">
                  View responses in Client Response →
                </Link>
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Move lifecycle stage</p>
              <div className="flex flex-wrap gap-2">
                {funnelStages.map((s) => (
                  <Button
                    key={s.key}
                    variant={selectedLead.funnelStatus === s.key ? 'primary' : 'secondary'}
                    className="!px-2 !py-1 text-xs"
                    onClick={() => moveLeadStatus(selectedLead.id, s.key as Lead['funnelStatus'])}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">CRM remarks</p>
              <ul className="mb-4 max-h-40 space-y-2 overflow-y-auto text-sm">
                {selectedLead.remarks.length === 0 && (
                  <li className="text-slate-500">No remarks yet.</li>
                )}
                {selectedLead.remarks.map((r, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                    {r}
                  </li>
                ))}
              </ul>
              <label className="mb-2 block text-xs font-medium text-slate-600">
                Insert sample remark
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={sampleRemark}
                  onChange={(e) => setSampleRemark(e.target.value)}
                >
                  {pipelineRemarkSamples.map((r) => (
                    <option key={r} value={r}>
                      {r.length > 48 ? `${r.slice(0, 48)}…` : r}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mb-3 flex gap-2">
                <Button variant="secondary" className="!text-xs" onClick={insertSampleRemark}>
                  Use sample
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Log follow-up, call notes, risk flags…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    addRemark(selectedLead.id, note)
                    setNote('')
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </PageSection>
      )}
    </div>
  )
}
