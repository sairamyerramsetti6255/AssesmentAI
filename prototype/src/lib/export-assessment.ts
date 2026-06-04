import type { AssessmentQuestion, Lead } from '../types'
import { sortQuestions } from './questions'
import { inputTypeLabel } from './question-types'

function formatAnswer(
  q: AssessmentQuestion,
  answers: Record<string, string | number | string[]>,
  richtext: Record<string, string>,
  otherText: Record<string, string>,
): string {
  const r = richtext[q.id]
  if (r?.trim()) return r
  const a = answers[q.id]
  if (a === undefined || a === '') return '—'
  if (Array.isArray(a)) {
    const parts = a.map((x) => (x === 'Other' && otherText[q.id] ? `Other: ${otherText[q.id]}` : x))
    return parts.join('; ')
  }
  return String(a)
}

export function buildAssessmentReportHtml(
  lead: Lead,
  questions: AssessmentQuestion[],
  filledBy?: string,
): string {
  const ordered = sortQuestions(questions)
  const answers = lead.clientAnswers ?? {}
  const richtext = lead.clientRichtext ?? {}
  const otherText = lead.clientOtherText ?? {}
  const rows = ordered
    .map(
      (q, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top">${i + 1}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top">
        <strong>${escapeHtml(q.text)}</strong>
        ${q.isMandatory ? '<br><em style="color:#b45309">Mandatory</em>' : ''}
        <br><span style="color:#64748b;font-size:12px">${escapeHtml(inputTypeLabel(q.type))}</span>
      </td>
      <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top">${escapeHtml(formatAnswer(q, answers, richtext, otherText))}</td>
    </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Assessment — ${escapeHtml(lead.companyName)}</title>
<style>
  body { font-family: Inter, Segoe UI, sans-serif; color: #0f172a; margin: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; text-align: left; padding: 8px; border: 1px solid #e2e8f0; }
</style></head><body>
  <h1>AI Readiness Assessment</h1>
  <p class="meta">
    <strong>${escapeHtml(lead.companyName)}</strong> · ${escapeHtml(lead.industry)} · ${escapeHtml(lead.country)}<br/>
    Status: ${escapeHtml(lead.assessmentStatus)} · Progress: ${lead.clientProgress ?? 0}%<br/>
    ${filledBy ? `Completed by: ${escapeHtml(filledBy)}<br/>` : ''}
    Exported: ${new Date().toLocaleString()}
  </p>
  <table>
    <thead><tr><th>#</th><th>Question</th><th>Response</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3">No responses recorded</td></tr>'}</tbody>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function downloadAssessmentWord(lead: Lead, questions: AssessmentQuestion[], filledBy?: string) {
  const html = buildAssessmentReportHtml(lead, questions, filledBy)
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(lead.companyName)}-assessment.doc`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadAssessmentPdf(lead: Lead, questions: AssessmentQuestion[], filledBy?: string) {
  const html = buildAssessmentReportHtml(lead, questions, filledBy)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    alert('Allow pop-ups to export PDF, or use Export Word instead.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 400)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'assessment'
}

export function portalUrl(token: string, onBehalf = false): string {
  const base = `${window.location.origin}/portal/${token}`
  return onBehalf ? `${base}?onbehalf=1` : base
}
