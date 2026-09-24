import type { ClientResponseRow } from '../lib/client-responses'
import { formatAssessmentTimestamp } from '../lib/client-responses'
import { Badge } from './ui'

interface Props {
  responses: ClientResponseRow[]
  clientProgress?: number
  assessmentStartedAt?: string | null
  assessmentSubmittedAt?: string | null
  assessmentUpdatedAt?: string | null
  loading?: boolean
}

export function ClientResponsesTable({
  responses,
  clientProgress,
  assessmentStartedAt,
  assessmentSubmittedAt,
  assessmentUpdatedAt,
  loading,
}: Props) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading client responses…</p>
  }

  const hasAny =
    responses.length > 0 ||
    (clientProgress !== undefined && clientProgress > 0)

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No client responses yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Responses appear here when the client saves or submits the portal assessment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-medium text-slate-500">Portal progress</dt>
          <dd className="mt-0.5 font-semibold text-pbs-700">{clientProgress ?? 0}%</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Assessment started</dt>
          <dd className="mt-0.5 text-slate-800">{formatAssessmentTimestamp(assessmentStartedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Last updated</dt>
          <dd className="mt-0.5 text-slate-800">{formatAssessmentTimestamp(assessmentUpdatedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Submitted</dt>
          <dd className="mt-0.5">
            {assessmentSubmittedAt ? (
              <Badge tone="emerald">{formatAssessmentTimestamp(assessmentSubmittedAt)}</Badge>
            ) : (
              <span className="text-slate-600">Not yet submitted</span>
            )}
          </dd>
        </div>
      </dl>

      {responses.length === 0 ? (
        <p className="text-sm text-slate-500">
          Progress recorded but no structured answers synced yet. Ask client to save again, or run migration 007.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Question</th>
                <th className="px-4 py-3 font-semibold">Pillar</th>
                <th className="px-4 py-3 font-semibold">Client response</th>
                <th className="px-4 py-3 font-semibold">Answered at</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.questionText}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">{r.taxonomyPillar}</span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-700">{r.answerDisplay}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatAssessmentTimestamp(r.answeredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
