import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { UploadedDocumentsTable } from '../components/UploadedDocumentsTable'
import { IndustryVerticalField } from '../components/IndustryVerticalField'
import { PageSection } from '../components/page-layout'
import { resolveIndustryVertical } from '../data/industry-verticals'
import { documentFromFile } from '../lib/documents'
import type { LeadStatus, LeadType } from '../types'
import { leadStatusOptions, leadTypeOptions } from '../data/constants'
import { Button, Input, PageHeader, Select } from '../components/ui'

export function LeadIntake() {
  const navigate = useNavigate()
  const { addLead, currentUser } = useApp()
  const [form, setForm] = useState({
    companyName: '',
    industry: 'Supply Chain & Logistics',
    industryOther: '',
    domain: '',
    country: '',
    clientEmail: '',
    clientPhone: '',
    availableTime: '',
    intakeRemarks: '',
    leadStatus: 'new' as LeadStatus,
    leadType: 'inbound' as LeadType,
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [createdName, setCreatedName] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const industry = resolveIndustryVertical(form.industry, form.industryOther)
    await addLead({
      companyName: form.companyName,
      industry,
      domain: form.domain,
      country: form.country,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      availableTime: form.availableTime,
      intakeRemarks: form.intakeRemarks,
      leadStatus: form.leadStatus,
      leadType: form.leadType,
      assignedExecutive: currentUser?.name ?? 'Unassigned',
      pendingFiles,
      documentRecords: pendingFiles.map((f) => documentFromFile(f, 'intake')),
    })
    setCreatedName(form.companyName)
    setForm({
      companyName: '',
      industry: 'Supply Chain & Logistics',
      industryOther: '',
      domain: '',
      country: '',
      clientEmail: '',
      clientPhone: '',
      availableTime: '',
      intakeRemarks: '',
      leadStatus: 'new',
      leadType: 'inbound',
    })
    setPendingFiles([])
  }

  const addDroppedFiles = (list: FileList | File[]) => {
    setPendingFiles((prev) => [...prev, ...Array.from(list)])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    addDroppedFiles(e.dataTransfer.files)
  }

  const pendingPreview = pendingFiles.map((f) => documentFromFile(f, 'intake'))

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lead Intake"
        description="Register a new company and contact details. Research and assessment happen on the next steps."
      />

      {createdName && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>{createdName}</strong> created successfully.{' '}
          <button
            type="button"
            className="font-medium text-pbs-700 underline"
            onClick={() => navigate('/research')}
          >
            Continue to Agent Research →
          </button>
        </div>
      )}

      <PageSection title="Create new lead" description="One form — company, contact, and intake documents only.">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
          <Input
            label="Company name"
            required
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
          <IndustryVerticalField
            value={form.industry}
            otherDetail={form.industryOther}
            onChange={(industry) => setForm({ ...form, industry })}
            onOtherDetailChange={(industryOther) => setForm({ ...form, industryOther })}
          />
          <Input
            label="Domain / URL"
            placeholder="example.com"
            required
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
          />
          <Input
            label="Country of operation"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Client primary email"
              type="email"
              required
              placeholder="contact@company.com"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            />
            <Input
              label="Phone number"
              type="tel"
              placeholder="+1 555 0100"
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
            />
          </div>
          <Input
            label="Available time / preferred contact window"
            placeholder="e.g. Mon–Fri 9:00–17:00 EST"
            value={form.availableTime}
            onChange={(e) => setForm({ ...form, availableTime: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Lead status"
              value={form.leadStatus}
              onChange={(e) =>
                setForm({ ...form, leadStatus: e.target.value as typeof form.leadStatus })
              }
              options={leadStatusOptions.map((o) => ({ value: o.value, label: o.label }))}
            />
            <Select
              label="Lead type"
              value={form.leadType}
              onChange={(e) =>
                setForm({ ...form, leadType: e.target.value as typeof form.leadType })
              }
              options={leadTypeOptions.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Intake remarks</span>
            <textarea
              className="min-h-[4rem] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-pbs-500 focus:outline-none focus:ring-2 focus:ring-pbs-500/20"
              placeholder="Context, referral source, urgency, decision makers…"
              value={form.intakeRemarks}
              onChange={(e) => setForm({ ...form, intakeRemarks: e.target.value })}
            />
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
          >
            <p className="text-sm font-medium text-slate-700">Document upload</p>
            <p className="mt-1 text-xs text-slate-500">Drag PDF or DOCX (filenames used for AI context)</p>
            <label className="mt-3 inline-block cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-pbs-600 ring-1 ring-pbs-200 hover:bg-pbs-50">
              Choose files
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx,.csv"
                onChange={(e) => {
                  if (e.target.files) addDroppedFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            {pendingPreview.length > 0 && (
              <div className="mt-4 text-left">
                <UploadedDocumentsTable documents={pendingPreview} emptyMessage="" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Create lead
            </Button>
          </div>
        </form>
      </PageSection>

      <p className="text-center text-sm text-slate-500">
        Next step:{' '}
        <Link to="/research" className="font-medium text-pbs-600 hover:underline">
          Agent Research
        </Link>
      </p>
    </div>
  )
}
