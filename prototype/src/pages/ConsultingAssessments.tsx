import { useEffect, useState } from 'react'
import { getConsultingAssessments, type ConsultingAssessment } from '../lib/api'
import { Badge, Card, PageHeader, ProgressBar } from '../components/ui'

function formatWhen(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusTone(item: ConsultingAssessment): 'emerald' | 'amber' | 'slate' {
  if (item.submittedAt || item.progress >= 100) return 'emerald'
  if (item.progress > 0 || item.questions.some((q) => q.answer)) return 'amber'
  return 'slate'
}

function statusLabel(item: ConsultingAssessment) {
  if (item.submittedAt || item.progress >= 100) return 'Submitted'
  if (item.progress > 0 || item.questions.some((q) => q.answer)) return 'In progress'
  return 'Started'
}

export function ConsultingAssessments() {
  const [rows, setRows] = useState<ConsultingAssessment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getConsultingAssessments()
      .then((data) => {
        if (cancelled) return
        setRows(data)
        setSelectedId(data[0]?.id ?? null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load assessments')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = rows.find((row) => row.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Every assessment completed on the consulting site, with the company details, story, research, and each answer."
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-stone-500">Loading assessments…</p>}

      {!loading && !error && rows.length === 0 && (
        <Card>
          <p className="text-sm text-stone-600">
            No consulting assessments yet. When someone finishes the public assessment form, the full
            record appears here.
          </p>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="space-y-2">
            {rows.map((row) => {
              const active = row.id === selected?.id
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    active
                      ? 'border-pbs-500 bg-white shadow-sm'
                      : 'border-pbs-line bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-pbs-900">{row.companyName}</p>
                    <Badge tone={statusTone(row)}>{statusLabel(row)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-stone-500">{row.industry || 'Industry not set'}</p>
                  <p className="mt-1 text-xs text-stone-400">{formatWhen(row.createdAt)}</p>
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="space-y-4">
              <Card title={selected.companyName} action={<Badge tone={statusTone(selected)}>{statusLabel(selected)}</Badge>}>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Fact label="Contact" value={selected.contactName} />
                  <Fact label="Email" value={selected.email} />
                  <Fact label="Phone" value={selected.phone} />
                  <Fact label="Industry" value={selected.industry} />
                  <Fact label="Website" value={selected.website || 'Not provided'} />
                  <Fact label="Started" value={formatWhen(selected.createdAt)} />
                  <Fact label="Submitted" value={formatWhen(selected.submittedAt)} />
                  <div>
                    <p className="text-xs font-medium text-stone-500">Progress</p>
                    <div className="mt-2">
                      <ProgressBar value={selected.progress} label="Answers saved" />
                    </div>
                  </div>
                </dl>
              </Card>

              <Card title="What they told us">
                <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
                  {selected.story || 'No spoken brief was saved for this assessment.'}
                </p>
              </Card>

              {selected.research && (selected.research.executiveBrief || selected.research.competitors.length > 0) && (
                <Card title="Website research">
                  {selected.research.executiveBrief && (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
                      {selected.research.executiveBrief}
                    </p>
                  )}
                  {selected.research.competitors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-stone-500">Competitors</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                        {selected.research.competitors.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selected.research.webInsights.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-stone-500">From the website</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                        {selected.research.webInsights.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              <Card title="Questions and answers">
                {selected.questions.length === 0 ? (
                  <p className="text-sm text-stone-600">Questions have not been generated yet.</p>
                ) : (
                  <ol className="space-y-4">
                    {selected.questions.map((question, index) => (
                      <li key={question.id} className="rounded-lg border border-pbs-line/80 px-4 py-3">
                        <p className="text-xs font-medium text-stone-400">Question {index + 1}</p>
                        <p className="mt-1 text-sm font-medium text-pbs-900">{question.text}</p>
                        {question.options.length > 0 && (
                          <p className="mt-1 text-xs text-stone-500">Options: {question.options.join(' · ')}</p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                          {question.answer || 'No answer yet'}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-sm text-pbs-900">{value || '—'}</p>
    </div>
  )
}
