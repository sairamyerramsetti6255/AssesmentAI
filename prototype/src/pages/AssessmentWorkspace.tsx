import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuestionGovernanceEditor } from '../components/QuestionGovernanceEditor'
import { LeadContextBar, PageSection } from '../components/page-layout'
import { useApp } from '../context/AppContext'
import * as api from '../lib/api'
import {
  generateAssessmentQuestions,
  rewriteAssessmentQuestion,
} from '../lib/ai-services'
import { portalUrl } from '../lib/export-assessment'
import { isResearchReady } from '../lib/lead-research'
import { OpenRouterApiError } from '../lib/openrouter'
import { mergeMandatoryQuestions, normalizeAssessmentTaxonomy } from '../lib/questions'
import type { Lead } from '../types'
import { Badge, Button, LoadingOverlay, PageHeader } from '../components/ui'

function isAdminRole(role?: string) {
  return role === 'super_admin' || role === 'team_lead'
}

export function AssessmentWorkspace() {
  const {
    questions,
    mandatoryQuestions,
    selectedLeadId,
    setSelectedLeadId,
    selectedLead,
    leads,
    currentUser,
    setQuestions,
    setLeadTaxonomy,
    updateQuestion,
    deleteQuestion,
    moveQuestionUp,
    moveQuestionDown,
    addQuestion,
    setAssessmentStatus,
    deleteAssessment,
    logActivity,
    refreshLeads,
    questionsSaveStatus,
    questionsSaveError,
  } = useApp()
  const [leadSnapshot, setLeadSnapshot] = useState<Lead | undefined>(selectedLead)
  const [generating, setGenerating] = useState(false)
  const [generatingPhase, setGeneratingPhase] = useState<'ai' | 'save' | null>(null)
  const [rewritingId, setRewritingId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  const isAdmin = isAdminRole(currentUser?.role)
  const busy = generating || sharing || deleting || rewritingId !== null
  const activeLead = leadSnapshot ?? selectedLead
  const researchReady = isResearchReady(activeLead)

  useEffect(() => {
    setLeadSnapshot(selectedLead)
  }, [selectedLead])

  useEffect(() => {
    if (!selectedLeadId) return
    void refreshLeads()
    void api.getLead(selectedLeadId).then(setLeadSnapshot).catch(() => {})
  }, [selectedLeadId, refreshLeads])

  const resolveLeadForGeneration = async (): Promise<Lead | null> => {
    if (!selectedLeadId) return null
    try {
      const fresh = await api.getLead(selectedLeadId)
      setLeadSnapshot(fresh)
      return fresh
    } catch {
      return activeLead ?? null
    }
  }

  const runGenerateQuestions = async (regenerate = false) => {
    const lead = (await resolveLeadForGeneration()) ?? activeLead
    if (!lead || !isResearchReady(lead)) {
      setError('Run AI research on Agent Research first (needs website scrape + brief).')
      return
    }
    if (!lead.aiResearch) {
      setError('Research data missing — open Agent Research and re-run the pipeline for this lead.')
      return
    }
    if (regenerate && questions.length > 0) {
      const ok = window.confirm(
        'Regenerate will replace all current assessment questions with new AI-generated ones. Continue?',
      )
      if (!ok) return
    }
    setGenerating(true)
    setGeneratingPhase('ai')
    setError(null)
    setShareMsg(null)
    try {
      const result = await generateAssessmentQuestions(lead, lead.aiResearch)
      setGeneratingPhase('save')
      await setQuestions(mergeMandatoryQuestions(result.questions, mandatoryQuestions))
      const taxonomy = normalizeAssessmentTaxonomy(result.taxonomy)
      if (taxonomy) await setLeadTaxonomy(lead.id, taxonomy)
      if (regenerate) {
        await logActivity('assessment.regenerate', `Assessment questions regenerated — ${lead.companyName}`, {
          leadId: lead.id,
          companyName: lead.companyName,
        })
      }
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Question generation failed')
    } finally {
      setGenerating(false)
      setGeneratingPhase(null)
    }
  }

  const runRewriteQuestion = async (questionId: string) => {
    if (!selectedLead?.aiResearch) {
      setError('Run AI research on Agent Research first (needs website scrape + brief).')
      return
    }
    const current = questions.find((q) => q.id === questionId)
    if (!current) return

    setRewritingId(questionId)
    setError(null)
    try {
      const rewritten = await rewriteAssessmentQuestion(
        selectedLead,
        selectedLead.aiResearch,
        current,
        selectedLead.assessmentTaxonomy,
        questions,
      )
      updateQuestion(questionId, {
        text: rewritten.text,
        type: rewritten.type,
        options: rewritten.options,
        suggestedOptions: rewritten.suggestedOptions,
        domainContext: rewritten.domainContext,
        taxonomyPillar: rewritten.taxonomyPillar,
        category: rewritten.category,
      })
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Rewrite failed')
    } finally {
      setRewritingId(null)
    }
  }

  const runDeleteAssessment = async () => {
    if (!selectedLead) return
    const ok = window.confirm(
      `Delete the entire assessment for ${selectedLead.companyName}? This removes all questions, client responses, and the portal link.`,
    )
    if (!ok) return
    setDeleting(true)
    setError(null)
    setShareMsg(null)
    try {
      await deleteAssessment(selectedLead.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete assessment')
    } finally {
      setDeleting(false)
    }
  }

  const runShareToClient = async () => {
    if (!selectedLead) return
    if (questions.length === 0) {
      setError('Generate assessment questions before sharing with the client.')
      return
    }
    setSharing(true)
    setError(null)
    setShareMsg(null)
    try {
      let lead = selectedLead
      if (lead.assessmentStatus !== 'approved' || !lead.portalToken) {
        const updated = await setAssessmentStatus(lead.id, 'approved')
        if (!updated?.portalToken) throw new Error('Could not generate portal link')
        lead = updated
      }
      const url = portalUrl(lead.portalToken!, false)
      const clientEmail = lead.clientEmail?.trim()

      if (clientEmail) {
        const subject = encodeURIComponent(`AI Readiness Assessment — ${lead.companyName}`)
        const body = encodeURIComponent(
          `Please complete your secure assessment:\n\n${url}\n\nThank you,\n${currentUser?.name ?? 'Your account team'}`,
        )
        window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`
        setShareMsg(`Email draft opened for ${clientEmail}`)
      } else {
        await navigator.clipboard.writeText(url)
        setShareMsg('Portal link copied — no client email on file')
      }

      await logActivity('assessment.link_sent', `Assessment shared with client — ${lead.companyName}`, {
        leadId: lead.id,
        companyName: lead.companyName,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share with client')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="space-y-8">
      {(generating || deleting) && (
        <LoadingOverlay
          message={
            deleting
              ? 'Deleting assessment…'
              : generatingPhase === 'save'
                ? 'Saving assessment questions…'
                : 'Generating assessment questions…'
          }
          submessage={
            deleting
              ? 'Removing questions, client responses, and portal link.'
              : generatingPhase === 'save'
                ? 'Writing questions to the database — please wait.'
                : 'AI is drafting questions from research — this may take a minute.'
          }
        />
      )}

      <PageHeader
        title="Assessment Workspace"
        description="Edit assessment questions, answer options, and approval status before sending to clients."
      />

      <LeadContextBar
        leads={leads}
        selectedLeadId={selectedLeadId}
        onSelectLead={(id: string) => setSelectedLeadId(id || null)}
        selectedLead={selectedLead}
      />

      {selectedLead?.clientProgress === 100 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Client submitted — editing options here updates the portal on their next visit.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {shareMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {shareMsg}
        </div>
      )}

      {questionsSaveStatus === 'error' && questionsSaveError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Save failed: {questionsSaveError}
        </div>
      )}

      {selectedLead?.portalToken && selectedLead.assessmentStatus === 'approved' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Secure portal link:{' '}
          <Link className="font-mono font-semibold underline" to={`/portal/${selectedLead.portalToken}`}>
            /portal/{selectedLead.portalToken}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone={selectedLead?.assessmentStatus === 'approved' ? 'emerald' : 'amber'}>
            {selectedLead?.assessmentStatus ?? 'draft'}
          </Badge>
          <Badge tone="brand">{questions.length} questions</Badge>
          {researchReady && <Badge tone="emerald">AI research on file</Badge>}
          {!researchReady && activeLead && (
            <Badge tone="amber">Research required</Badge>
          )}
        </div>

        {activeLead && (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !researchReady}
              onClick={() => runGenerateQuestions(false)}
            >
              {generating ? 'Generating…' : 'Generate assessment questions (AI)'}
            </Button>
            {isAdmin && questions.length > 0 && (
              <Button
                variant="secondary"
                disabled={busy || !researchReady}
                onClick={() => runGenerateQuestions(true)}
              >
                {generating ? 'Regenerating…' : 'Regenerate'}
              </Button>
            )}
            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  disabled={busy || questions.length === 0}
                  onClick={runShareToClient}
                >
                  {sharing ? 'Sharing…' : 'Share to client'}
                </Button>
                <Button variant="danger" disabled={busy} onClick={runDeleteAssessment}>
                  Delete assessment
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {activeLead && !researchReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete{' '}
          <Link to="/research" className="font-semibold text-pbs-700 underline">
            Agent Research
          </Link>{' '}
          for <strong>{activeLead.companyName}</strong> before generating questions.
          {(activeLead.researchProgress ?? 0) > 0 && (activeLead.researchProgress ?? 0) < 100 && (
            <span> Research is {activeLead.researchProgress}% — wait for it to finish or re-run.</span>
          )}
        </div>
      )}

      {!isAdmin && (
        <p className="text-sm text-slate-500">
          Share, regenerate, and delete are managed by your team lead or administrator.
        </p>
      )}

      <PageSection
        title="Assessment questions"
        description="Edit one question at a time — wording, response type, and answer options."
      >
        <div className={busy ? 'pointer-events-none opacity-60' : undefined}>
          <QuestionGovernanceEditor
            questions={questions}
            taxonomy={selectedLead?.assessmentTaxonomy}
            rewritingId={rewritingId}
            saveStatus={questionsSaveStatus}
            saveError={questionsSaveError}
            onRewrite={runRewriteQuestion}
            onUpdate={updateQuestion}
            onDelete={deleteQuestion}
            onMoveUp={moveQuestionUp}
            onMoveDown={moveQuestionDown}
            onAdd={addQuestion}
          />
        </div>
      </PageSection>

      <p className="text-center text-sm text-slate-500">
        After the client completes the portal:{' '}
        <Link to="/client-response" className="font-medium text-pbs-600 hover:underline">
          Client Response →
        </Link>
      </p>
    </div>
  )
}
