import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { runResearchPipeline } from '../lib/ai-services'
import { OpenRouterApiError } from '../lib/openrouter'
import { UploadedDocumentsTable } from '../components/UploadedDocumentsTable'
import { LeadContextBar, PageSection } from '../components/page-layout'
import { Badge, Button, PageHeader, ProgressBar } from '../components/ui'

type AgentStep = 'Document Extractor' | 'Web Scraping' | 'Competitive Intelligence' | 'Executive Brief'

export function LeadResearch() {
  const navigate = useNavigate()
  const {
    leads,
    selectedLeadId,
    setSelectedLeadId,
    selectedLead,
    startResearch,
    finishResearch,
  } = useApp()
  const [agents, setAgents] = useState<{ name: AgentStep; status: string }[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

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
      const research = await runResearchPipeline(selectedLead)
      setAgentStatus('Web Scraping', 'done')
      setAgentStatus('Document Extractor', 'done')
      setAgentStatus('Competitive Intelligence', 'done')
      setAgentStatus('Executive Brief', 'done')

      await finishResearch(selectedLead.id, research)
    } catch (e) {
      setAiError(
        e instanceof OpenRouterApiError
          ? e.message
          : 'AI pipeline failed. Check OPENROUTER_API_KEY on the API server and retry.',
      )
      setAgents((a) => a.map((x) => (x.status === 'running' ? { ...x, status: 'error' } : x)))
    } finally {
      setAiLoading(false)
    }
  }

  const research = selectedLead?.aiResearch

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agent Research"
        description="Run AI discovery for a lead — website scrape, competitive intelligence, and executive brief."
      />

      <LeadContextBar
        leads={leads}
        selectedLeadId={selectedLeadId}
        onSelectLead={(id: string) => setSelectedLeadId(id || null)}
        selectedLead={selectedLead}
      />

      {!selectedLead ? (
        <PageSection title="Select a lead" description="Choose a lead above, or create one in Lead Intake first.">
          <p className="text-sm text-slate-600">
            No lead selected.{' '}
            <Link to="/intake" className="font-medium text-pbs-600 hover:underline">
              Go to Lead Intake →
            </Link>
          </p>
        </PageSection>
      ) : (
        <>
          {aiError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {aiError}
            </div>
          )}

          <PageSection
            title="AI research pipeline"
            description="Scrapes the client website and generates a discovery brief. Generate assessment questions separately in Assessment Workspace."
          >
            <div className="mx-auto max-w-xl space-y-4">
              <ProgressBar value={selectedLead.researchProgress} label="Research progress" />
              <Button
                onClick={runAgents}
                disabled={aiLoading || !selectedLead.domain}
              >
                {aiLoading
                  ? 'Running AI agents…'
                  : selectedLead.researchProgress >= 100
                    ? 'Re-run AI research'
                    : 'Run scrape + research + brief'}
              </Button>
              {aiLoading && (
                <p className="text-xs text-slate-500">Usually takes 15–45 seconds.</p>
              )}
              {agents.length > 0 && (
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
                              ? 'brand'
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
              {selectedLead.researchProgress >= 100 && (
                <Button variant="secondary" onClick={() => navigate('/assessment')}>
                  Continue to Assessment Workspace →
                </Button>
              )}
            </div>
          </PageSection>

          <PageSection title="Research output" description="AI-generated insights from website and documents.">
            {!research ? (
              <p className="text-sm text-slate-500">Run the pipeline above to generate research output.</p>
            ) : (
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-700">Scraped:</span> {research.webScrapeUrl}
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
                    <p className="font-semibold text-slate-700">Document themes</p>
                    <ul className="mt-1 list-inside list-disc">
                      {research.documentInsights.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                  {research.executiveBrief}
                </pre>
              </div>
            )}
          </PageSection>

          <PageSection title="Intake documents" description="Files uploaded when the lead was created.">
            {selectedLead.documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents on file for this lead.</p>
            ) : (
              <UploadedDocumentsTable leadId={selectedLead.id} documents={selectedLead.documents} />
            )}
          </PageSection>
        </>
      )}
    </div>
  )
}
