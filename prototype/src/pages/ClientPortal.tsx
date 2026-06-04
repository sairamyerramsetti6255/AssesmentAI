import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ClientPortalThankYou } from '../components/ClientPortalThankYou'
import { QuestionAnswerInput, type AnswerState } from '../components/QuestionAnswerInput'
import { getClientTestData } from '../data/testData'
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
  const { leads, questions, saveClientResponses, currentUser, logActivity } = useApp()
  const lead =
    leads.find((l) => l.portalToken === token) ??
    leads.find((l) => l.funnelStatus === 'client_portal')

  const orderedQuestions = useMemo(() => sortQuestions(questions), [questions])
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [richtext, setRichtext] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  const answerState: AnswerState = { answers, otherText, richtext }

  useEffect(() => {
    if (lead?.clientProgress === 100 && lead.clientAnswers) {
      setSubmitted(true)
    }
  }, [lead?.id, lead?.clientProgress])

  useEffect(() => {
    if (lead?.clientAnswers && Object.keys(lead.clientAnswers).length > 0) {
      setAnswers({ ...lead.clientAnswers })
      setRichtext({ ...(lead.clientRichtext ?? {}) })
      setOtherText({ ...(lead.clientOtherText ?? {}) })
      setUploadedFiles([...(lead.clientUploadedDocuments ?? [])])
    } else {
      const data = getClientTestData(token, lead?.id, questions)
      setAnswers({ ...data.answers })
      setRichtext({ ...data.richtext })
    }
  }, [lead?.id, token])

  const answered = countAnswered(orderedQuestions, answerState)
  const pct = Math.min(
    100,
    Math.round((answered / Math.max(orderedQuestions.length, 1)) * 100),
  )

  const persist = (progress: number) => {
    if (!lead) return
    saveClientResponses(lead.id, answers, richtext, progress, {
      otherText,
      uploadedDocuments: uploadedFiles,
    })
    logActivity(
      progress >= 100 ? 'client.portal_submit' : 'client.portal_save',
      onBehalf
        ? `Executive saved on behalf — ${progress}% (${lead.companyName})`
        : `Client progress ${progress}% — ${lead.companyName}`,
      {
        leadId: lead.id,
        companyName: lead.companyName,
        actorName: onBehalf ? currentUser?.name : 'Client',
      },
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSubmit = () => {
    persist(100)
    if (onBehalf) {
      logActivity('client.on_behalf_fill', `Assessment submitted on behalf — ${lead?.companyName}`, {
        leadId: lead?.id,
        companyName: lead?.companyName,
      })
    }
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const names = Array.from(e.dataTransfer.files).map((f) => f.name)
    setUploadedFiles((prev) => [...prev, ...names])
  }

  if (submitted) {
    return (
      <ClientPortalThankYou
        companyName={lead?.companyName ?? 'your organization'}
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
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {lead?.companyName ?? 'Assessment'}
        </h1>
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
                      const names = Array.from(e.target.files ?? []).map((f) => f.name)
                      setUploadedFiles((prev) => [...prev, ...names])
                    }}
                  />
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-slate-700">
                  {uploadedFiles.map((f) => (
                    <li
                      key={f}
                      className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span>📄 {f}</span>
                      <button
                        type="button"
                        className="text-xs text-rose-600 hover:text-rose-700"
                        onClick={() => setUploadedFiles((prev) => prev.filter((x) => x !== f))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
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
            persist(pct)
            setStep((s) => Math.max(0, s - 1))
          }}
        >
          Back
        </Button>
        {!isDocStep ? (
          <Button
            onClick={() => {
              persist(Math.round(((step + 1) / orderedQuestions.length) * 100))
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
          <Button onClick={handleSubmit}>Submit assessment</Button>
        )}
      </div>
    </div>
  )
}
