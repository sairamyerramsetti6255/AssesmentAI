import { useState } from 'react'
import type { Lead } from '../types'
import { useApp } from '../context/AppContext'
import {
  downloadAssessmentPdf,
  downloadAssessmentWord,
  portalUrl,
} from '../lib/export-assessment'
import { Button, Card } from './ui'

interface Props {
  lead: Lead
  compact?: boolean
}

export function ExecutiveAssessmentTools({ lead, compact }: Props) {
  const { questions, currentUser, logActivity } = useApp()
  const [copied, setCopied] = useState<string | null>(null)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)

  const token = lead.portalToken
  const approved = lead.assessmentStatus === 'approved' && !!token

  const copyLink = async (onBehalf: boolean) => {
    if (!token) {
      setLinkMsg('Approve the assessment first to generate a portal link.')
      return
    }
    const url = portalUrl(token, onBehalf)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(onBehalf ? 'behalf' : 'client')
      setTimeout(() => setCopied(null), 2000)
      logActivity(
        'assessment.link_sent',
        onBehalf
          ? `On-behalf assessment link copied for ${lead.companyName}`
          : `Client assessment link copied for ${lead.companyName}`,
        { leadId: lead.id, companyName: lead.companyName },
      )
    } catch {
      setLinkMsg(url)
    }
  }

  const emailLink = () => {
    if (!token) return
    const url = portalUrl(token, false)
    const subject = encodeURIComponent(`AI Readiness Assessment — ${lead.companyName}`)
    const body = encodeURIComponent(
      `Please complete your secure assessment:\n\n${url}\n\nThank you,\n${currentUser?.name ?? 'Your account team'}`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    logActivity('assessment.link_sent', `Assessment link emailed to client — ${lead.companyName}`, {
      leadId: lead.id,
      companyName: lead.companyName,
    })
  }

  const exportDoc = (format: 'pdf' | 'word') => {
    const filledBy =
      lead.clientProgress === 100
        ? `${currentUser?.name ?? 'Executive'} (export)`
        : undefined
    if (format === 'pdf') downloadAssessmentPdf(lead, questions, filledBy)
    else downloadAssessmentWord(lead, questions, filledBy)
    logActivity('assessment.export', `Exported ${format.toUpperCase()} — ${lead.companyName}`, {
      leadId: lead.id,
      companyName: lead.companyName,
    })
  }

  const openOnBehalf = () => {
    if (!token) return
    window.open(portalUrl(token, true), '_blank', 'noopener,noreferrer')
    logActivity('client.on_behalf_fill', `Executive opened on-behalf portal — ${lead.companyName}`, {
      leadId: lead.id,
      companyName: lead.companyName,
    })
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="!text-xs" disabled={!approved} onClick={() => copyLink(false)}>
          {copied === 'client' ? 'Copied!' : 'Copy client link'}
        </Button>
        <Button variant="secondary" className="!text-xs" disabled={!approved} onClick={openOnBehalf}>
          Fill on behalf
        </Button>
        <Button variant="secondary" className="!text-xs" onClick={() => exportDoc('word')}>
          Export Word
        </Button>
        <Button variant="secondary" className="!text-xs" onClick={() => exportDoc('pdf')}>
          Export PDF
        </Button>
      </div>
    )
  }

  return (
    <Card title="Client assessment delivery">
      {!approved ? (
        <p className="text-sm text-amber-800">
          Approve the assessment in Review Workspace to generate a secure portal link.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Secure portal link</p>
            <p className="mt-1 break-all font-mono text-sm text-indigo-700">{portalUrl(token!, false)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => copyLink(false)}>
              {copied === 'client' ? 'Link copied' : 'Copy link for client'}
            </Button>
            <Button variant="secondary" onClick={emailLink}>
              Send via email
            </Button>
            <Button onClick={openOnBehalf}>Fill on behalf (phone / online)</Button>
          </div>
          <p className="text-xs text-slate-500">
            <strong>On behalf</strong> opens the same questionnaire with an executive banner — use
            while on a call to enter the client&apos;s answers.
          </p>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Export results (local)</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => exportDoc('word')}>
                Download Word (.doc)
              </Button>
              <Button variant="secondary" onClick={() => exportDoc('pdf')}>
                Print / Save as PDF
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              PDF opens your browser print dialog — choose &quot;Save as PDF&quot;. Files stay on
              your machine.
            </p>
          </div>
        </div>
      )}
      {linkMsg && <p className="mt-2 text-xs text-slate-600">{linkMsg}</p>}
    </Card>
  )
}
