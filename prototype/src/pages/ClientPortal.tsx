import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ClientPortalThankYou } from '../components/ClientPortalThankYou'
import { UploadedDocumentsTable } from '../components/UploadedDocumentsTable'
import { QuestionAnswerInput, type AnswerState } from '../components/QuestionAnswerInput'
import * as api from '../lib/api'
import { documentFromFile } from '../lib/documents'
import type { AssessmentQuestion, Lead, LeadDocument } from '../types'
import { sortQuestions } from '../lib/questions'
import { Badge, Button, ProgressBar } from '../components/ui'

function countAnswered(
  ordered: { id: string; type: string }[],
  state: AnswerState,
): number {
  let n = 0
  for (const q of ordered) {
    const a = state.answers[q.id]
    const r = state.richtext[q.id]
    if (r?.trim()) {
      n++
      continue
    }
    if (a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0)) {
      n++
    }
  }
  return n
}

export function ClientPortal() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const onBehalf = searchParams.get('onbehalf') === '1'
  const { saveClientResponses, currentUser, logActivity } = useApp()

  const [portalLead, setPortalLead] = useState<Lead | null>(null)
  const [portalQuestions, setPortalQuestions] = useState<AssessmentQuestion[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(true)

  const orderedQuestions = useMemo(() => sortQuestions(portalQuestions), [portalQuestions])
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [richtext, setRichtext] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<LeadDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  const answerState: AnswerState = { answers, otherText, richtext }

  useEffect(() => {
    if (!token) {
      setLoadError('Invalid portal link.')
      setLoadingPortal(false)
      return
    }
    setLoadingPortal(true)
    setLoadError(null)
    api
      .getPortalData(token)
      .then(({ lead, questions }) => {
        setPortalLead(lead)
        setPortalQuestions(questions)
        if (lead.clientProgress === 100 && lead.clientAnswers) {
          setSubmitted(true)
        }
        if (lead.clientAnswers && Object.keys(lead.clientAnswers).length > 0) {
          setAnswers({ ...lead.clientAnswers })
          setRichtext({ ...(lead.clientRichtext ?? {}) })
          setOtherText({ ...(lead.clientOtherText ?? {}) })
        }
        setUploadedFiles([...(lead.clientUploadedDocuments ?? [])])
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load portal'))
      .finally(() => setLoadingPortal(false))
  }, [token])

  const answered = countAnswered(orderedQuestions, answerState)
  const pct = Math.min(
    100,
    Math.round((answered / Math.max(orderedQuestions.length, 1)) * 100),
  )

  const persist = async (progress: number) => {
    if (!token || !portalLead) return
    const extras = { otherText, uploadedDocuments: uploadedFiles }
    if (onBehalf && currentUser) {
      await saveClientResponses(portalLead.id, answers, richtext, progress, extras)
    } else {
      const updated = await api.savePortalResponses(token, answers, richtext, progress, extras)
      setPortalLead(updated)
      setUploadedFiles([...(updated.clientUploadedDocuments ?? [])])
    }
    void logActivity(
      progress >= 100 ? 'client.portal_submit' : 'client.portal_save',
      onBehalf
        ? `Executive saved on behalf — ${progress}% (${portalLead.companyName})`
        : `Client progress ${progress}% — ${portalLead.companyName}`,
      {
        leadId: portalLead.id,
        companyName: portalLead.companyName,
        actorName: onBehalf ? currentUser?.name : 'Client',
      },
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSubmit = async () => {
    await persist(100)
    if (onBehalf) {
      void logActivity('client.on_behalf_fill', `Assessment submitted on behalf — ${portalLead?.companyName}`, {
        leadId: portalLead?.id,
        companyName: portalLead?.companyName,
      })
    }
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadFiles = async (list: FileList | File[]) => {
    if (!portalLead || !token) return
    setUploading(true)
    try {
      for (const file of Array.from(list)) {
        const meta = documentFromFile(file, 'client')
        if (onBehalf && currentUser) {
          const res = await api.uploadLeadDocument(portalLead.id, file, meta)
          const row = res.document
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: String(row.id),
              name: String(row.name),
              matchStatus: (row.match_status as LeadDocument['matchStatus']) ?? 'unmatched',
              transactionDate: String(row.transaction_date ?? meta.transactionDate),
              uploadedAt: String(row.uploaded_at ?? meta.uploadedAt),
              source: 'client',
              hasFile: true,
            },
          ])
          setPortalLead(api.dbToLead(res.lead as unknown as api.DbLead))
        } else {
          const res = await api.uploadLeadDocument(portalLead.id, file, meta)
          const row = res.document
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: String(row.id),
              name: String(row.name),
              matchStatus: (row.match_status as LeadDocument['matchStatus']) ?? 'unmatched',
              transactionDate: String(row.transaction_date ?? meta.transactionDate),
              uploadedAt: String(row.uploaded_at ?? meta.uploadedAt),
              source: 'client',
              hasFile: true,
            },
          ])
          setPortalLead(api.dbToLead(res.lead as unknown as api.DbLead))
        }
      }
    } finally {
      setUploading(false)
    }
  }

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    void uploadFiles(e.dataTransfer.files)
  }

  if (loadingPortal) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Loading assessment…
      </div>
    )
  }

  if (loadError || !portalLead) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-rose-600">{loadError ?? 'Portal not found'}</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <ClientPortalThankYou
        companyName={portalLead.companyName}
        onBehalf={onBehalf}
        executiveName={currentUser?.name}
      />
    )
  }

  const current = orderedQuestions[step]
  const isDocStep = step === orderedQuestions.length

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {onBehalf && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Executive mode:</strong> You are completing this assessment on behalf of the
          client
          {currentUser ? ` (${currentUser.name})` : ''}. Answers are saved to the same record.
        </div>
      )}
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Secure client assessment
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{portalLead.companyName}</h1>
        <p
          className={`mt-2 min-h-[1.25rem] text-xs font-medium text-emerald-600 ${
            saved ? 'opacity-100' : 'opacity-0'
          }`}
          aria-live="polite"
        >
          Progress saved
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ProgressBar
          value={isDocStep ? 100 : pct}
          label={
            isDocStep
              ? 'Supporting documents'
              : `Question ${step + 1} of ${orderedQuestions.length}`
          }
        />
      </div>

      <div className="flex min-h-[34rem] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {!isDocStep && current && (
          <>
            <div className="shrink-0 min-h-[7.5rem] border-b border-slate-100 pb-4">
              <div className="flex flex-wrap gap-2">
                {current.isMandatory && <Badge tone="amber">Mandatory</Badge>}
                <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {current.taxonomyPillar}
                </span>
              </div>
              <h2 className="mt-3 line-clamp-3 text-lg font-semibold leading-snug text-slate-900">
                {current.text}
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Select the best option(s). Choose <strong className="text-indigo-600">Other</strong>{' '}
                to type your own answer.
              </p>
            </div>
            <div className="mt-4 min-h-[22rem] flex-1 overflow-y-auto pr-1">
              <QuestionAnswerInput
                stableLayout
                question={current}
                state={answerState}
                onChange={(patch) => {
                  if (patch.answers) setAnswers(patch.answers)
                  if (patch.otherText) setOtherText(patch.otherText)
                  if (patch.richtext) setRichtext(patch.richtext)
                }}
              />
            </div>
          </>
        )}

        {isDocStep && (
          <>
            <div className="shrink-0 min-h-[7.5rem] border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Upload supporting documents</h2>
              <p className="mt-2 text-sm text-slate-600">
                Optional — attach architecture diagrams, policies, or discovery files (PDF, DOCX,
                images).
              </p>
            </div>
            <div className="mt-4 min-h-[22rem] flex-1 overflow-y-auto pr-1">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onFileDrop}
                className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
              >
                <p className="text-sm text-slate-600">Drag files here or use the button below</p>
                <label className="mt-4 inline-block cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  Choose files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files) void uploadFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              {uploading && (
                <p className="mt-4 text-sm text-indigo-600">Uploading documents…</p>
              )}
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <UploadedDocumentsTable
                    leadId={portalLead.id}
                    portalToken={token}
                    documents={uploadedFiles}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex shrink-0 justify-between gap-3">
        <Button
          variant="secondary"
          disabled={step === 0}
          onClick={() => {
            void persist(pct)
            setStep((s) => Math.max(0, s - 1))
          }}
        >
          Back
        </Button>
        {!isDocStep ? (
          <Button
            onClick={() => {
              void persist(Math.round(((step + 1) / orderedQuestions.length) * 100))
              if (step < orderedQuestions.length - 1) {
                setStep((s) => s + 1)
              } else {
                setStep(orderedQuestions.length)
              }
            }}
          >
            {step < orderedQuestions.length - 1 ? 'Next' : 'Continue to uploads'}
          </Button>
        ) : (
          <Button onClick={() => void handleSubmit()}>Submit assessment</Button>
        )}
      </div>
    </div>
  )
}
