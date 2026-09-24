import { funnelStages } from '../data/constants'
import type { ConsultingAssessment } from './api'

export type AssessmentStatus = 'submitted' | 'progress' | 'started'

export function assessmentStatus(item: ConsultingAssessment): AssessmentStatus {
  const answered = item.questions.some((question) => question.answer.trim())
  if (item.submittedAt || item.progress >= 100) return 'submitted'
  if (item.progress > 0 || answered) return 'progress'
  return 'started'
}

export function stageLabel(stage: string) {
  return funnelStages.find((item) => item.key === stage)?.label ?? (stage ? stage.replace(/_/g, ' ') : '—')
}

export function statusLabel(status: AssessmentStatus) {
  if (status === 'submitted') return 'Submitted'
  if (status === 'progress') return 'In progress'
  return 'Started'
}

export function statusTone(status: AssessmentStatus): 'emerald' | 'amber' | 'slate' {
  if (status === 'submitted') return 'emerald'
  if (status === 'progress') return 'amber'
  return 'slate'
}

export function hasProposal(item: ConsultingAssessment) {
  return Boolean(item.proposal)
}

export function answeredCount(item: ConsultingAssessment) {
  return item.questions.filter((question) => question.answer.trim()).length
}

export function formatWhen(value: string | null) {
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

export function industryCounts(rows: ConsultingAssessment[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const label = row.industry.trim() || 'Not set'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function dayCounts(rows: ConsultingAssessment[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const date = new Date(row.createdAt)
    const key = Number.isNaN(date.getTime())
      ? 'Unknown'
      : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value }))
}
