import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { funnelStages } from '../data/mock'
import { pipelineRemarkSamples } from '../data/testData'
import type { FunnelStatus, Lead } from '../types'
import { UploadedDocumentsTable } from '../components/UploadedDocumentsTable'
import { ExecutiveAssessmentTools } from '../components/ExecutiveAssessmentTools'
import { Badge, Button, Card, Input, PageHeader, Select } from '../components/ui'

const columns: { status: FunnelStatus; label: string }[] = [
  { status: 'intake', label: 'Intake' },
  { status: 'research', label: 'Research' },
  { status: 'review', label: 'Review' },
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
    <div>
      <PageHeader
        title="Opportunity Pipeline CRM"
        description="Module 4 — Kanban lifecycle tracking, assessment ledger, and executive follow-up terminal."
      />
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.funnelStatus === col.status)
          return (
            <div
              key={col.status}
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-slate-50/80"
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
                    className={`w-full rounded-lg border bg-white p-3 text-left text-sm shadow-sm transition hover:border-indigo-300 ${
                      selectedLeadId === lead.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    <p className="font-semibold text-slate-800">{lead.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.industry} · {lead.country}</p>
                    {lead.clientProgress !== undefined && (
                      <p className="mt-1 text-xs text-indigo-600">Portal {lead.clientProgress}%</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {selectedLead && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Assessment ledger & history">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Assigned executive</dt>
                <dd className="font-medium">{selectedLead.assignedExecutive}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Created</dt>
                <dd className="font-medium">{selectedLead.createdAt}</dd>
              </div>
              <div className="col-span-2">
                <dt className="mb-2 text-xs text-slate-500">Uploaded documents</dt>
                <dd>
                  <UploadedDocumentsTable
                    leadId={selectedLead.id}
                    documents={selectedLead.documents}
                  />
                </dd>
              </div>
              {selectedLead.clientUploadedDocuments && selectedLead.clientUploadedDocuments.length > 0 && (
                <div className="col-span-2">
                  <dt className="mb-2 text-xs text-slate-500">Client portal uploads</dt>
                  <dd>
                    <UploadedDocumentsTable
                      leadId={selectedLead.id}
                      documents={selectedLead.clientUploadedDocuments}
                    />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Assessment</dt>
                <dd>
                  <Badge tone={selectedLead.assessmentStatus === 'approved' ? 'emerald' : 'amber'}>
                    {selectedLead.assessmentStatus}
                  </Badge>
                </dd>
              </div>
              {selectedLead.clientAnswers && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Client responses (test data)</dt>
                  <dd className="mt-1 text-xs text-slate-600">
                    {Object.keys(selectedLead.clientAnswers).length} structured answers
                    {selectedLead.clientRichtext
                      ? ` · ${Object.keys(selectedLead.clientRichtext).length} rich-text fields`
                      : ''}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4">
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
          </Card>
          <ExecutiveAssessmentTools lead={selectedLead} />

          <Card title="Interactive update terminal">
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
            <Select
              label="Insert sample remark (test data)"
              value={sampleRemark}
              onChange={(e) => setSampleRemark(e.target.value)}
              options={pipelineRemarkSamples.map((r) => ({
                value: r,
                label: r.length > 48 ? `${r.slice(0, 48)}…` : r,
              }))}
            />
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" className="!text-xs" onClick={insertSampleRemark}>
                Use sample
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
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
          </Card>
        </div>
      )}
    </div>
  )
}
