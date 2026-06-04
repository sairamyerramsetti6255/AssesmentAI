import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  defaultLeadIntakeForm,
  leadIntakeFormSamples,
} from '../data/testData'
import { generateAssessmentQuestions, runResearchPipeline } from '../lib/ai-services'
import { mergeMandatoryQuestions } from '../lib/questions'
import { OpenRouterApiError } from '../lib/openrouter'
import { IndustryVerticalField } from '../components/IndustryVerticalField'
import { resolveIndustryVertical } from '../data/industry-verticals'
import { Badge, Button, Card, Input, PageHeader, ProgressBar, Select } from '../components/ui'

type AgentStep = 'Document Extractor' | 'Web Scraping' | 'Competitive Intelligence' | 'Executive Brief'

export function LeadIntake() {
  const navigate = useNavigate()
  const {
    leads,
    selectedLeadId,
    setSelectedLeadId,
    selectedLead,
    addLead,
    startResearch,
    finishResearch,
    setQuestions,
    setLeadTaxonomy,
    mandatoryQuestions,
    currentUser,
  } = useApp()
  const [form, setForm] = useState({
    companyName: '',
    industry: 'Supply Chain & Logistics',
    industryOther: '',
    domain: '',
    country: '',
  })
  const [files, setFiles] = useState<string[]>([])
  const [agents, setAgents] = useState<{ name: AgentStep; status: string }[]>([])
  const [sampleIndex, setSampleIndex] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [generateQuestions, setGenerateQuestions] = useState(true)

  const fillTestData = (index = sampleIndex) => {
    const sample = leadIntakeFormSamples[index % leadIntakeFormSamples.length]
    setForm({
      companyName: sample.companyName,
      industry: sample.industry,
      industryOther: sample.industry.startsWith('Other') ? sample.industry : '',
      domain: sample.domain,
      country: sample.country,
    })
    setFiles([...sample.documents])
    setSampleIndex((index + 1) % leadIntakeFormSamples.length)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const industry = resolveIndustryVertical(form.industry, form.industryOther)
    addLead({
      companyName: form.companyName,
      industry,
      domain: form.domain,
      country: form.country,
      assignedExecutive: currentUser?.name ?? 'Unassigned',
      documents: files,
    })
    setForm({
      companyName: '',
      industry: 'Supply Chain & Logistics',
      industryOther: '',
      domain: '',
      country: '',
    })
    setFiles([])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const names = Array.from(e.dataTransfer.files).map((f) => f.name)
    setFiles((prev) => [...prev, ...names])
  }

  const setAgentStatus = (name: AgentStep, status: string) => {
    setAgents((prev) => {
      const existing = prev.find((a) => a.name === name)
      if (existing) return prev.map((a) => (a.name === name ? { ...a, status } : a))
      return [...prev, { name, status }]
    })
  }

  const runAgents = async () => {
    if (!selectedLead) return
    setAiError(null)
    setAiLoading(true)
    startResearch(selectedLead.id)

    setAgents([
      { name: 'Web Scraping', status: 'running' },
      { name: 'Document Extractor', status: 'queued' },
      { name: 'Competitive Intelligence', status: 'queued' },
      { name: 'Executive Brief', status: 'queued' },
    ])

    try {
      setAgentStatus('Web Scraping', 'running')
      const research = await runResearchPipeline(selectedLead)
      setAgentStatus('Web Scraping', 'done')
      setAgentStatus('Document Extractor', 'done')
      setAgentStatus('Competitive Intelligence', 'done')
      setAgentStatus('Executive Brief', 'running')

      finishResearch(selectedLead.id, research)

      if (generateQuestions) {
        const generated = await generateAssessmentQuestions(selectedLead, research)
        setQuestions(mergeMandatoryQuestions(generated.questions, mandatoryQuestions))
        setLeadTaxonomy(selectedLead.id, generated.taxonomy)
      }

      setAgentStatus('Executive Brief', 'done')
    } catch (e) {
      setAiError(
        e instanceof OpenRouterApiError
          ? e.message
          : 'AI pipeline failed. Check OPENROUTER_API_KEY in .env (no quotes) and restart npm run dev.',
      )
      setAgents((a) => a.map((x) => (x.status === 'running' ? { ...x, status: 'error' } : x)))
    } finally {
      setAiLoading(false)
    }
  }

  const research = selectedLead?.aiResearch

  return (
    <div>
      <PageHeader
        title="Lead Intake & Agentic Research"
        description="Module 1 — AI agents scrape the client website, analyze documents, and generate discovery output."
        actions={
          <Button variant="secondary" onClick={() => fillTestData()}>
            Fill test data
          </Button>
        }
      />
      {aiError && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {aiError}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Lead onboarding form">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Company name"
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
            <IndustryVerticalField
              value={form.industry}
              otherDetail={form.industryOther}
              onChange={(industry) => setForm({ ...form, industry })}
              onOtherDetailChange={(industryOther) => setForm({ ...form, industryOther })}
            />
            <Input
              label="Domain / URL"
              placeholder="example.com"
              required
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
            <Input
              label="Country of operation"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
            >
              <p className="text-sm font-medium text-slate-700">Document ingestion port</p>
              <p className="mt-1 text-xs text-slate-500">Drag PDF or DOCX (filenames used for AI context)</p>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 !text-xs"
                onClick={() => setFiles([...defaultLeadIntakeForm.documents])}
              >
                Add sample documents
              </Button>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1 text-left text-xs text-slate-600">
                  {files.map((f) => (
                    <li key={f}>📄 {f}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Create lead
              </Button>
              <Button type="button" variant="secondary" onClick={() => fillTestData()}>
                Load sample
              </Button>
            </div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card title="AI multi-agent pipeline">
            <Select
              label="Active leads"
              value={selectedLeadId ?? ''}
              onChange={(e) => setSelectedLeadId(e.target.value || null)}
              options={[
                { value: '', label: '— Select —' },
                ...leads.map((l) => ({ value: l.id, label: l.companyName })),
              ]}
            />
            {selectedLead && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge>{selectedLead.industry}</Badge>
                  <Badge tone="slate">{selectedLead.country}</Badge>
                  <Badge tone="amber">{selectedLead.funnelStatus}</Badge>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={generateQuestions}
                    onChange={(e) => setGenerateQuestions(e.target.checked)}
                  />
                  Also generate assessment questions (Review Workspace)
                </label>
                <ProgressBar value={selectedLead.researchProgress} label="Research pipeline" />
                <Button
                  onClick={runAgents}
                  disabled={aiLoading || !selectedLead.domain}
                  className="w-full"
                >
                  {aiLoading
                    ? 'Running AI agents…'
                    : selectedLead.researchProgress >= 100
                      ? 'Re-run AI research'
                      : 'Run scrape + research + AI brief'}
                </Button>
                {selectedLead.researchProgress >= 100 && (
                  <Button variant="secondary" className="w-full" onClick={() => navigate('/review')}>
                    Open Review Workspace →
                  </Button>
                )}
              </div>
            )}
          </Card>
          <Card title="Agent status">
            {agents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Select a lead with a domain, then run the pipeline. Website text is scraped server-side for AI analysis.
              </p>
            ) : (
              <ul className="space-y-2">
                {agents.map((a) => (
                  <li
                    key={a.name}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{a.name}</span>
                    <Badge
                      tone={
                        a.status === 'done'
                          ? 'emerald'
                          : a.status === 'running'
                            ? 'indigo'
                            : a.status === 'error'
                              ? 'rose'
                              : 'slate'
                      }
                    >
                      {a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {research && (
            <Card title="AI research output">
              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-700">Scraped:</span>{' '}
                  {research.webScrapeUrl}
                  {research.webScrapeError && (
                    <span className="text-amber-700"> ({research.webScrapeError})</span>
                  )}
                </p>
                <div>
                  <p className="font-semibold text-slate-700">Web insights</p>
                  <ul className="mt-1 list-inside list-disc">
                    {research.webInsights.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Competitive intelligence</p>
                  <ul className="mt-1 list-inside list-disc">
                    {research.competitors.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                {research.documentInsights.length > 0 && (
                  <div>
                    <p className="font-semibold text-slate-700">Document extractor</p>
                    <ul className="mt-1 list-inside list-disc">
                      {research.documentInsights.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-slate-100">
                  {research.executiveBrief}
                </pre>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
