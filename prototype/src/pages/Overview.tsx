import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { funnelStages } from '../data/constants'
import { getConsultingAssessments, type ConsultingAssessment } from '../lib/api'
import { assessmentStatus, hasProposal, industryCounts } from '../lib/assessmentStats'
import { AssessmentTable } from './ConsultingAssessments'
import { BarChart, DonutChart } from '../components/charts'
import { Button, Card, PageHeader, StatCard } from '../components/ui'

const STATUS_COLORS = {
  submitted: '#047857',
  progress: '#b45309',
  started: '#0066b3',
}

export function Overview() {
  const { leads } = useApp()
  const [rows, setRows] = useState<ConsultingAssessment[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getConsultingAssessments()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load assessments')
      })
    return () => {
      cancelled = true
    }
  }, [leads.length])

  const submitted = rows.filter((row) => assessmentStatus(row) === 'submitted').length
  const inProgress = rows.filter((row) => assessmentStatus(row) === 'progress').length
  const started = rows.filter((row) => assessmentStatus(row) === 'started').length
  const withProposal = rows.filter(hasProposal).length
  const avg =
    rows.length === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length)

  const statusSlices = [
    { label: 'Submitted', value: submitted, color: STATUS_COLORS.submitted,     to: '/assessments' },
    { label: 'In progress', value: inProgress, color: STATUS_COLORS.progress, to: '/assessments' },
    { label: 'Started', value: started, color: STATUS_COLORS.started, to: '/assessments' },
  ]
  const industries = industryCounts(rows).map((item, index) => ({
    ...item,
    color: index % 2 === 0 ? '#0066b3' : '#1a7fd4',
    to: '/assessments',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Every assessment in the database, including consulting.pbshope.in. The stage column shows where each one sits, and View opens the full record."
        actions={
          <Link to="/intake">
            <Button>+ New Lead</Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Link to="/assessments" className="block">
          <StatCard label="Assessments" value={rows.length} sub="Open the full grid" />
        </Link>
        <Link to="/assessments" className="block">
          <StatCard label="Submitted" value={submitted} sub="Answers complete" />
        </Link>
        <Link to="/assessments" className="block">
          <StatCard label="In progress" value={inProgress} sub="Client still answering" />
        </Link>
        <Link to="/assessments" className="block">
          <StatCard label="Proposals" value={withProposal} sub="Ready to review" />
        </Link>
        <Link to="/analytics" className="block">
          <StatCard label="Avg. completion" value={`${avg}%`} sub="Open analytics" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Assessment status" action={<Link to="/analytics" className="text-xs font-medium text-pbs-700">Analytics</Link>}>
          <DonutChart slices={statusSlices} />
        </Card>
        <Card title="By industry">
          <BarChart slices={industries} />
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-pbs-900">Consulting assessments</h2>
          <Link to="/assessments" className="text-xs font-medium text-pbs-700 hover:underline">
            View grid
          </Link>
        </div>
        {rows.length === 0 ? (
          <Card>
            <p className="text-sm text-stone-600">No assessments are stored yet.</p>
          </Card>
        ) : (
          <AssessmentTable rows={rows} />
        )}
      </div>

      <Card title="Pipeline" action={<Link to="/pipeline" className="text-xs font-medium text-pbs-700">Open pipeline</Link>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {funnelStages.map((stage) => {
            const count = leads.filter((lead) => lead.funnelStatus === stage.key).length
            return (
              <Link
                key={stage.key}
                to="/pipeline"
                className="rounded-lg border border-pbs-line px-3 py-3 hover:border-pbs-400 hover:bg-pbs-50"
              >
                <p className="text-xs text-stone-500">{stage.label}</p>
                <p className="mt-1 text-xl font-semibold text-pbs-900">{count}</p>
              </Link>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">{leads.length} leads in the workspace</p>
      </Card>
    </div>
  )
}
