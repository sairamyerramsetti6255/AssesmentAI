import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getConsultingAssessments, type ConsultingAssessment } from '../lib/api'
import {
  answeredCount,
  assessmentStatus,
  dayCounts,
  hasProposal,
  industryCounts,
  statusLabel,
} from '../lib/assessmentStats'
import { BarChart, ColumnChart, DonutChart } from '../components/charts'
import { Badge, Card, PageHeader, StatCard } from '../components/ui'

export function Analytics() {
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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load analytics')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submitted = rows.filter((row) => assessmentStatus(row) === 'submitted').length
  const inProgress = rows.filter((row) => assessmentStatus(row) === 'progress').length
  const started = rows.filter((row) => assessmentStatus(row) === 'started').length
  const proposals = rows.filter(hasProposal).length
  const answers = rows.reduce((sum, row) => sum + answeredCount(row), 0)
  const questions = rows.reduce((sum, row) => sum + row.questions.length, 0)

  const completion = [...rows]
    .sort((a, b) => b.progress - a.progress)
    .map((row) => ({
      label: row.companyName,
      value: row.progress,
      color: row.progress >= 100 ? '#047857' : row.progress > 0 ? '#b45309' : '#0066b3',
      to: `/assessments/${row.id}`,
    }))

  const industries = industryCounts(rows).map((item) => ({
    label: item.label,
    value: item.value,
    color: '#0066b3',
    to: '/assessments',
  }))

  const days = dayCounts(rows).map((item) => ({
    label: item.label,
    value: item.value,
    color: '#1a7fd4',
    to: '/assessments',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Completion, industry mix, and answer volume for consulting assessments. Click a bar or a row to open that lead."
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assessments" value={rows.length} sub={`${leads.length} workspace leads`} />
        <StatCard label="Answers captured" value={answers} sub={`${questions} questions asked`} />
        <StatCard label="Submitted" value={submitted} sub={`${inProgress} in progress · ${started} started`} />
        <StatCard label="Proposals on file" value={proposals} sub="Generated from discovery" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Status mix">
          <DonutChart
            slices={[
              { label: 'Submitted', value: submitted, color: '#047857', to: '/assessments' },
              { label: 'In progress', value: inProgress, color: '#b45309', to: '/assessments' },
              { label: 'Started', value: started, color: '#0066b3', to: '/assessments' },
            ]}
          />
        </Card>
        <Card title="Assessments by day">
          <ColumnChart slices={days} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Completion by company">
          <BarChart slices={completion} />
        </Card>
        <Card title="Industry">
          <BarChart slices={industries} />
        </Card>
      </div>

      <Card title="Assessment data">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-stone-500">
                <th className="pb-2 pr-3 font-medium">Company</th>
                <th className="pb-2 pr-3 font-medium">Industry</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Answers</th>
                <th className="pb-2 pr-3 font-medium">Progress</th>
                <th className="pb-2 font-medium">Proposal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = assessmentStatus(row)
                return (
                  <tr key={row.id} className="border-b border-stone-100">
                    <td className="py-2.5 pr-3">
                      <Link to={`/assessments/${row.id}`} className="font-medium text-pbs-800 hover:underline">
                        {row.companyName}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-stone-600">{row.industry || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={status === 'submitted' ? 'emerald' : status === 'progress' ? 'amber' : 'brand'}>
                        {statusLabel(status)}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-stone-600">
                      {answeredCount(row)} / {row.questions.length}
                    </td>
                    <td className="py-2.5 pr-3 text-stone-600">{row.progress}%</td>
                    <td className="py-2.5 text-stone-600">{hasProposal(row) ? 'Ready' : '—'}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-stone-500">
                    No consulting assessments to chart yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
