import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExecutiveAssessmentTools } from '../components/ExecutiveAssessmentTools'
import { QuestionGovernanceEditor } from '../components/QuestionGovernanceEditor'
import { useApp } from '../context/AppContext'
import {
  generateAssessmentQuestions,
  generateDemoClientAnswers,
  rewriteAssessmentQuestion,
} from '../lib/ai-services'
import { OpenRouterApiError } from '../lib/openrouter'
import { mergeMandatoryQuestions } from '../lib/questions'
import { Badge, Button, Card, PageHeader, Select } from '../components/ui'

export function ReviewWorkspace() {
  const {
    questions,
    mandatoryQuestions,
    selectedLeadId,
    setSelectedLeadId,
    selectedLead,
    leads,
    setQuestions,
    setLeadTaxonomy,
    updateQuestion,
    deleteQuestion,
    moveQuestionUp,
    moveQuestionDown,
    addQuestion,
    setAssessmentStatus,
    saveClientResponses,
  } = useApp()
  const [loading, setLoading] = useState<'questions' | 'answers' | null>(null)
  const [rewritingId, setRewritingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const approve = () => {
    if (selectedLead) setAssessmentStatus(selectedLead.id, 'approved')
  }

  const runGenerateQuestions = async () => {
    if (!selectedLead?.aiResearch) {
      setError('Run AI research on Lead Intake first (needs website scrape + brief).')
      return
    }
    setLoading('questions')
    setError(null)
    try {
      const result = await generateAssessmentQuestions(selectedLead, selectedLead.aiResearch)
      setQuestions(mergeMandatoryQuestions(result.questions, mandatoryQuestions))
      setLeadTaxonomy(selectedLead.id, result.taxonomy)
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Question generation failed')
    } finally {
      setLoading(null)
    }
  }

  const runRewriteQuestion = async (questionId: string) => {
    if (!selectedLead?.aiResearch) {
      setError('Run AI research on Lead Intake first (needs website scrape + brief).')
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

  const runGenerateDemoAnswers = async () => {
    if (!selectedLead?.aiResearch) {
      setError('Run AI research on Lead Intake first.')
      return
    }
    setLoading('answers')
    setError(null)
    try {
      const demo = await generateDemoClientAnswers(
        selectedLead,
        selectedLead.aiResearch,
        questions,
      )
      saveClientResponses(selectedLead.id, demo.answers, demo.richtext, 90)
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Answer generation failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Executive Control Panel"
        description="Module 2 — AI auto-picks question type and answer options. Review one question at a time, then approve for clients."
        actions={
          <>
            <Select
              value={selectedLeadId ?? ''}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              options={leads.map((l) => ({ value: l.id, label: l.companyName }))}
            />
            <Button
              variant="secondary"
              disabled={loading !== null || rewritingId !== null}
              onClick={runGenerateQuestions}
            >
              {loading === 'questions' ? 'Generating…' : 'Generate questions (AI)'}
            </Button>
            <Button
              variant="secondary"
              disabled={loading !== null || rewritingId !== null || questions.length === 0}
              onClick={runGenerateDemoAnswers}
            >
              {loading === 'answers' ? 'Generating…' : 'Generate demo answers (AI)'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectedLead && setAssessmentStatus(selectedLead.id, 'draft')}
            >
              Set Draft
            </Button>
            <Button onClick={approve} disabled={selectedLead?.assessmentStatus === 'approved'}>
              Approve & portal link
            </Button>
          </>
        }
      />
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {selectedLead?.portalToken && selectedLead.assessmentStatus === 'approved' && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Secure portal link:{' '}
          <Link className="font-mono font-semibold underline" to={`/portal/${selectedLead.portalToken}`}>
            /portal/{selectedLead.portalToken}
          </Link>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={selectedLead?.assessmentStatus === 'approved' ? 'emerald' : 'amber'}>
          {selectedLead?.assessmentStatus ?? 'draft'}
        </Badge>
        <Badge tone="indigo">{questions.length} questions</Badge>
        {selectedLead?.aiResearch && <Badge tone="emerald">AI research on file</Badge>}
      </div>

      {selectedLead && (
        <div className="mb-6">
          <ExecutiveAssessmentTools lead={selectedLead} />
        </div>
      )}

      <Card title="Question review (one at a time)">
        <QuestionGovernanceEditor
          questions={questions}
          taxonomy={selectedLead?.assessmentTaxonomy}
          rewritingId={rewritingId}
          onRewrite={runRewriteQuestion}
          onUpdate={updateQuestion}
          onDelete={deleteQuestion}
          onMoveUp={moveQuestionUp}
          onMoveDown={moveQuestionDown}
          onAdd={addQuestion}
        />
      </Card>
    </div>
  )
}
