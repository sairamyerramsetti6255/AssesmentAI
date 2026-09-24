import type { AssessmentQuestion, Lead } from '../types'
import { sortQuestions } from './questions'
import { inputTypeLabel } from './question-types'

export interface ClientResponseRow {
  id: string
  questionId: string
  questionText: string
  taxonomyPillar: string
  responseType: string
  answerDisplay: string
  sortOrder: number
  answeredAt: string
}

export interface ClientResponsesPayload {
  leadId: string
  companyName: string
  clientProgress: number
  assessmentStartedAt: string | null
  assessmentSubmittedAt: string | null
  assessmentUpdatedAt: string | null
  responses: ClientResponseRow[]
}

function formatAnswer(
  q: AssessmentQuestion,
  answers: Record<string, string | number | string[]>,
  richtext: Record<string, string>,
  otherText: Record<string, string>,
): string {
  const r = richtext[q.id]
  if (r?.trim()) return r.trim()
  const a = answers[q.id]
  if (a === undefined || a === '') return ''
  if (Array.isArray(a)) {
    return a
      .map((x) => (x === 'Other' && otherText[q.id] ? `Other: ${otherText[q.id]}` : x))
      .join('; ')
  }
  return String(a)
}

/** Build rows from lead + questions (fallback when DB table empty). */
export function buildClientResponseRowsFromLead(
  lead: Lead,
  questions: AssessmentQuestion[],
): ClientResponseRow[] {
  const answers = lead.clientAnswers ?? {}
  const richtext = lead.clientRichtext ?? {}
  const otherText = lead.clientOtherText ?? {}
  const updatedAt = lead.clientAssessmentUpdatedAt ?? new Date().toISOString()

  const rows: ClientResponseRow[] = []
  for (const q of sortQuestions(questions)) {
    const display = formatAnswer(q, answers, richtext, otherText)
    if (!display) continue
    rows.push({
      id: q.id,
      questionId: q.id,
      questionText: q.text,
      taxonomyPillar: q.taxonomyPillar,
      responseType: inputTypeLabel(q.type),
      answerDisplay: display,
      sortOrder: q.sortOrder,
      answeredAt: updatedAt,
    })
  }
  return rows
}

/** Full text summary for AI proposal — every question and answer. */
export function buildFullClientAnswersSummary(
  lead: Lead,
  questions: AssessmentQuestion[],
): string {
  const rows = buildClientResponseRowsFromLead(lead, questions)
  if (rows.length === 0) {
    return 'No client portal responses recorded yet.'
  }

  const header = [
    `Company: ${lead.companyName}`,
    `Assessment progress: ${lead.clientProgress ?? 0}%`,
    lead.clientAssessmentSubmittedAt
      ? `Submitted: ${new Date(lead.clientAssessmentSubmittedAt).toLocaleString()}`
      : lead.clientAssessmentStartedAt
        ? `Started: ${new Date(lead.clientAssessmentStartedAt).toLocaleString()}`
        : '',
    '',
    '--- Client responses (all questions) ---',
  ]
    .filter(Boolean)
    .join('\n')

  const body = rows
    .map(
      (r, i) =>
        `${i + 1}. [${r.taxonomyPillar}] ${r.questionText}\n   Type: ${r.responseType}\n   Answer: ${r.answerDisplay}`,
    )
    .join('\n\n')

  return `${header}\n\n${body}`
}

export function formatAssessmentTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
