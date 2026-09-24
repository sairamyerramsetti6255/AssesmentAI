import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getConsultingAssessments, type ConsultingAssessment } from '../lib/api'
import {
  answeredCount,
  assessmentStatus,
  formatWhen,
  stageLabel,
  statusLabel,
  statusTone,
} from '../lib/assessmentStats'
import { Badge, Button, Card, PageHeader, ProgressBar } from '../components/ui'

export function ConsultingAssessments() {
  const { id } = useParams()
  const [rows, setRows] = useState<ConsultingAssessment[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getConsultingAssessments()
      .then((data) => {
        if (!cancelled) setRows(data)
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

  const selected = id ? rows.find((row) => row.id === id) ?? null : null

  if (id) {
    return (
      <AssessmentDetail
        item={selected}
        loading={loading}
        error={error}
        missing={!loading && !error && !selected}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Every record in the database, including forms submitted on consulting.pbshope.in. Open a row to see the lead, answers, and proposal."
      />

      {error && <ErrorNote message={error} />}
      {loading && <p className="text-sm text-stone-500">Loading assessments…</p>}

      {!loading && !error && rows.length === 0 && (
        <Card>
          <p className="text-sm text-stone-600">No assessments are stored yet.</p>
        </Card>
      )}

      {rows.length > 0 && <AssessmentTable rows={rows} />}
    </div>
  )
}

export function AssessmentTable({ rows }: { rows: ConsultingAssessment[] }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-stone-500">
              <th className="pb-2 pr-3 font-medium">Company</th>
              <th className="pb-2 pr-3 font-medium">Industry</th>
              <th className="pb-2 pr-3 font-medium">Contact</th>
              <th className="pb-2 pr-3 font-medium">Stage</th>
              <th className="pb-2 pr-3 font-medium">Answers</th>
              <th className="pb-2 pr-3 font-medium">Source</th>
              <th className="pb-2 pr-3 font-medium">Started</th>
              <th className="pb-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = assessmentStatus(row)
              return (
                <tr key={row.id} className="border-b border-stone-100">
                  <td className="py-3 pr-3 font-medium text-pbs-900">{row.companyName}</td>
                  <td className="py-3 pr-3 text-stone-600">{row.industry || '—'}</td>
                  <td className="py-3 pr-3 text-stone-600">
                    <div>{row.contactName || '—'}</div>
                    <div className="text-xs text-stone-400">{row.email}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge tone="brand">{stageLabel(row.stage)}</Badge>
                    <div className="mt-1 text-xs text-stone-500">{statusLabel(status)}</div>
                  </td>
                  <td className="py-3 pr-3 text-stone-600">
                    {answeredCount(row)} / {row.questions.length}
                    <div className="text-xs text-stone-400">{row.progress}%</div>
                  </td>
                  <td className="py-3 pr-3 text-stone-600">
                    {row.fromConsulting ? 'consulting.pbshope.in' : 'Workspace'}
                  </td>
                  <td className="py-3 pr-3 text-stone-500">{formatWhen(row.createdAt)}</td>
                  <td className="py-3 text-right">
                    <Link to={`/assessments/${row.id}`} className="font-medium text-pbs-700 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function AssessmentDetail({
  item,
  loading,
  error,
  missing,
}: {
  item: ConsultingAssessment | null
  loading: boolean
  error: string
  missing: boolean
}) {
  const navigate = useNavigate()
  const { setSelectedLeadId } = useApp()

  if (loading) return <p className="text-sm text-stone-500">Loading assessment…</p>
  if (error) return <ErrorNote message={error} />
  if (missing || !item) {
    return (
      <Card>
        <p className="text-sm text-stone-600">This assessment is no longer available.</p>
        <Link to="/assessments" className="mt-3 inline-block text-sm font-medium text-pbs-700 hover:underline">
          Back to the grid
        </Link>
      </Card>
    )
  }

  const status = assessmentStatus(item)
  const openProposal = () => {
    setSelectedLeadId(item.id)
    navigate('/proposal')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/assessments" className="text-sm font-medium text-pbs-700 hover:underline">
          ← All assessments
        </Link>
        <div className="flex flex-wrap gap-2">
          <a href="#answers" className="rounded-md border border-pbs-line bg-white px-3 py-1.5 text-xs font-medium text-pbs-800">
            Answers
          </a>
          <a href="#proposal" className="rounded-md border border-pbs-line bg-white px-3 py-1.5 text-xs font-medium text-pbs-800">
            Proposal
          </a>
        </div>
      </div>

      <Card
        title={item.companyName}
        action={<Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>}
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Contact" value={item.contactName} />
          <Fact label="Email" value={item.email} />
          <Fact label="Phone" value={item.phone} />
          <Fact label="Industry" value={item.industry} />
          <Fact label="Website" value={item.website || 'Not provided'} />
          <Fact label="Started" value={formatWhen(item.createdAt)} />
          <Fact label="Submitted" value={formatWhen(item.submittedAt)} />
          <div className="sm:col-span-2">
            <ProgressBar
              value={item.progress}
              label={`${answeredCount(item)} of ${item.questions.length} answers saved`}
            />
          </div>
        </dl>
      </Card>

      <Card title="What they told us">
        <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">
          {item.story || 'No spoken brief was saved for this assessment.'}
        </p>
      </Card>

      {item.research && (item.research.executiveBrief || item.research.competitors.length > 0 || item.research.webInsights.length > 0) && (
        <Card title="Website research">
          {item.research.executiveBrief && (
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{item.research.executiveBrief}</p>
          )}
          {item.research.competitors.length > 0 && (
            <BulletBlock title="Competitors" items={item.research.competitors} />
          )}
          {item.research.webInsights.length > 0 && (
            <BulletBlock title="From the website" items={item.research.webInsights} />
          )}
        </Card>
      )}

      <div id="answers">
        <Card title="Questions and answers">
          {item.questions.length === 0 ? (
            <p className="text-sm text-stone-600">Questions have not been generated yet.</p>
          ) : (
            <ol className="space-y-3">
              {item.questions.map((question, index) => (
                <li key={question.id} className="rounded-lg border border-pbs-line/80 px-4 py-3">
                  <p className="text-xs font-medium text-stone-400">Question {index + 1}</p>
                  <p className="mt-1 text-sm font-medium text-pbs-900">{question.text}</p>
                  {question.options.length > 0 && (
                    <p className="mt-1 text-xs text-stone-500">Options: {question.options.join(' · ')}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap rounded-md bg-pbs-50 px-3 py-2 text-sm text-pbs-900">
                    {question.answer || 'No answer yet'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div id="proposal">
        <Card
          title="Proposal"
          action={
            <Button variant="secondary" className="!py-1.5 !text-xs" onClick={openProposal}>
              Open proposal workspace
            </Button>
          }
        >
          <ProposalBody item={item} />
        </Card>
      </div>
    </div>
  )
}

function ProposalBody({ item }: { item: ConsultingAssessment }) {
  const proposal = item.proposal
  if (!proposal) {
    return (
      <p className="text-sm text-stone-600">
        No proposal has been prepared for {item.companyName} yet. Open the proposal workspace to generate one from these answers.
      </p>
    )
  }

  const doc = proposal.document
  const solutionName = textField(doc, 'solutionName')
  const phases = arrayField(doc, 'implementationPhases')

  return (
    <div className="space-y-5">
      {solutionName && <p className="text-base font-semibold text-pbs-900">{solutionName}</p>}
      {proposal.summary && <Prose title="Summary" text={proposal.summary} />}
      {textField(doc, 'executiveSummary') && <Prose title="Executive summary" text={textField(doc, 'executiveSummary')} />}
      {textField(doc, 'businessChallenge') && <Prose title="Business challenge" text={textField(doc, 'businessChallenge')} />}
      {stringList(doc, 'businessChallengePoints').length > 0 && (
        <BulletBlock title="Challenge points" items={stringList(doc, 'businessChallengePoints')} />
      )}
      {textField(doc, 'proposedSolution') && <Prose title="Proposed solution" text={textField(doc, 'proposedSolution')} />}
      {proposal.useCases.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-500">Use cases</p>
          <ul className="mt-2 space-y-2">
            {proposal.useCases.map((useCase) => (
              <li key={useCase.id} className="rounded-md border border-pbs-line/80 px-3 py-2 text-sm">
                <p className="font-medium text-pbs-900">{useCase.gap}</p>
                <p className="mt-1 text-stone-700">{useCase.solution}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {useCase.horizon === 'pilot' ? 'Pilot' : 'Long term'} · {useCase.impact} impact
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {phases.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-500">Implementation</p>
          <ol className="mt-2 space-y-2">
            {phases.map((phase, index) => {
              const row = phase && typeof phase === 'object' ? (phase as Record<string, unknown>) : {}
              const activities = Array.isArray(row.activities) ? row.activities.map(String) : []
              return (
                <li key={index} className="text-sm text-stone-700">
                  <span className="font-medium text-pbs-900">{String(row.title ?? `Phase ${index + 1}`)}</span>
                  {row.period ? <span className="text-stone-500"> · {String(row.period)}</span> : null}
                  {activities.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">
                      {activities.map((activity) => (
                        <li key={activity}>{activity}</li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
      {stringList(doc, 'expectedOutcomes').length > 0 && (
        <BulletBlock title="Expected outcomes" items={stringList(doc, 'expectedOutcomes')} />
      )}
      {proposal.nextSteps.length > 0 && <BulletBlock title="Next steps" items={proposal.nextSteps} />}
      {proposal.architecture && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Hosting" value={proposal.architecture.hosting} />
          <Fact label="Pipelines" value={proposal.architecture.pipelines} />
          <Fact label="Access" value={proposal.architecture.access} />
          <Fact label="Security" value={proposal.architecture.security} />
        </dl>
      )}
    </div>
  )
}

function textField(doc: Record<string, unknown> | null, key: string) {
  const value = doc?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(doc: Record<string, unknown> | null, key: string) {
  const value = doc?.[key]
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function arrayField(doc: Record<string, unknown> | null, key: string) {
  const value = doc?.[key]
  return Array.isArray(value) ? value : []
}

function Prose({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-500">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{text}</p>
    </div>
  )
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-stone-500">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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

function ErrorNote({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div>
}
