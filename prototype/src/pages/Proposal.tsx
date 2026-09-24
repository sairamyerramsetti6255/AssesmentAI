import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { generateProposalFromDiscovery } from '../lib/ai-services'
import { OpenRouterApiError } from '../lib/openrouter'
import { buildFullClientAnswersSummary } from '../lib/client-responses'
import { downloadProposalWord } from '../lib/export-proposal'
import { PBS_COMPANY } from '../lib/proposal-branding'
import type { ProposalDocument } from '../lib/proposal-document'
import type { UseCase } from '../types'
import { LeadContactCard } from '../components/LeadContactCard'
import { LeadContextBar, PageSection } from '../components/page-layout'
import { Badge, Button, PageHeader } from '../components/ui'

const emptyArchitecture = {
  hosting: '',
  pipelines: '',
  access: '',
  security: '',
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">—</p>
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  )
}

export function Proposal() {
  const { leads, selectedLeadId, setSelectedLeadId, selectedLead, saveProposal, questions } =
    useApp()
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [architecture, setArchitecture] = useState(emptyArchitecture)
  const [summary, setSummary] = useState('')
  const [nextSteps, setNextSteps] = useState<string[]>([])
  const [proposalDoc, setProposalDoc] = useState<ProposalDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedLead) {
      setUseCases([])
      setArchitecture(emptyArchitecture)
      setSummary('')
      setNextSteps([])
      setProposalDoc(null)
      return
    }
    setUseCases(selectedLead.proposalUseCases ?? [])
    setArchitecture(selectedLead.proposalArchitecture ?? emptyArchitecture)
    setSummary(selectedLead.proposalSummary ?? '')
    setNextSteps(selectedLead.proposalNextSteps ?? [])
    setProposalDoc(selectedLead.proposalDocument ?? null)
  }, [
    selectedLead?.id,
    selectedLead?.proposalUseCases,
    selectedLead?.proposalArchitecture,
    selectedLead?.proposalSummary,
    selectedLead?.proposalNextSteps,
    selectedLead?.proposalDocument,
  ])

  const answerCount = selectedLead?.clientAnswers
    ? Object.keys(selectedLead.clientAnswers).length
    : 0

  const hasProposal = Boolean(proposalDoc || useCases.length > 0)

  const runGenerate = async () => {
    if (!selectedLead?.aiResearch) {
      setError('Complete AI research on Lead Intake for this lead first.')
      return
    }

    const fullSummary = buildFullClientAnswersSummary(selectedLead, questions)
    if (answerCount === 0) {
      setError(
        'No client answers found. Wait for the client to complete the portal, or generate demo answers in Assessment Workspace.',
      )
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await generateProposalFromDiscovery(
        selectedLead,
        selectedLead.aiResearch,
        fullSummary,
      )
      const generated = result.useCases.map((uc, i) => ({
        id: `uc-ai-${selectedLead.id}-${i}`,
        ...uc,
      }))
      setUseCases(generated)
      setArchitecture(result.architecture)
      setSummary(result.summary)
      setNextSteps(result.nextSteps)
      setProposalDoc(result.document)
      await saveProposal(selectedLead.id, generated, result.architecture, {
        summary: result.summary,
        nextSteps: result.nextSteps,
        proposalDocument: result.document,
      })
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Proposal generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadWord = () => {
    if (!selectedLead || !hasProposal) return
    downloadProposalWord(
      selectedLead,
      useCases,
      architecture,
      summary,
      nextSteps,
      proposalDoc ?? undefined,
    )
  }

  const doc = proposalDoc

  return (
    <div className="space-y-8">
      <PageHeader
        title="Blueprint & Proposal"
        description={`PBS scope-of-work format (${PBS_COMPANY.shortName}) with logo, company branding, and client-specific sections.`}
      />

      <LeadContextBar
        leads={leads}
        selectedLeadId={selectedLeadId}
        onSelectLead={(id: string) => setSelectedLeadId(id || null)}
        selectedLead={selectedLead}
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!selectedLead && (
        <p className="text-sm text-slate-500">Select a lead to view or generate a proposal.</p>
      )}

      {selectedLead && (
        <>
          <PageSection title="Client & executive contacts" description="Included on the downloadable scope-of-work document.">
            <LeadContactCard lead={selectedLead} />
          </PageSection>

          <PageSection
            title="Generate scope of work"
            description="AI drafts a PBS-formatted Executive Solution Overview from discovery research and all client answers."
            action={
              <div className="flex flex-wrap gap-2">
                <Button disabled={loading || answerCount === 0} onClick={runGenerate}>
                  {loading ? 'Generating…' : 'Generate proposal (AI)'}
                </Button>
                {hasProposal && (
                  <Button variant="secondary" onClick={handleDownloadWord}>
                    Download Word (.doc)
                  </Button>
                )}
              </div>
            }
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">Client answers loaded</dt>
                <dd className="font-semibold text-slate-800">{answerCount} responses</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">Portal progress</dt>
                <dd className="font-semibold text-slate-800">{selectedLead.clientProgress ?? 0}%</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">Prepared by</dt>
                <dd className="font-semibold text-slate-800">{PBS_COMPANY.shortName}</dd>
              </div>
            </dl>
            {answerCount === 0 && (
              <p className="mt-3 text-sm text-amber-800">
                Client must submit the portal assessment before generating an accurate proposal.
              </p>
            )}
          </PageSection>

          {doc && (
            <PageSection
              title={doc.solutionName}
              description="Executive Solution Overview & Scope of Work"
            >
              <p className="text-xs text-slate-500">
                Prepared for {selectedLead.companyName} · {PBS_COMPANY.legalName}
              </p>
            </PageSection>
          )}

          {(doc?.executiveSummary || summary) && (
            <PageSection title="Executive summary">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {doc?.executiveSummary || summary}
              </p>
            </PageSection>
          )}

          {doc?.businessChallenge && (
            <PageSection title="Business challenge">
              <p className="text-sm leading-relaxed text-slate-700">{doc.businessChallenge}</p>
              <div className="mt-3">
                <BulletList items={doc.businessChallengePoints} />
              </div>
            </PageSection>
          )}

          {doc?.proposedSolution && (
            <PageSection title="Proposed solution">
              <p className="text-sm leading-relaxed text-slate-700">{doc.proposedSolution}</p>
              <div className="mt-3">
                <BulletList items={doc.proposedSolutionPoints} />
              </div>
            </PageSection>
          )}

          {doc?.strategicObjectives && doc.strategicObjectives.length > 0 && (
            <PageSection title="Strategic objectives">
              <BulletList items={doc.strategicObjectives} />
            </PageSection>
          )}

          {doc?.mrpApproach && (
            <PageSection title="MRP approach">
              <p className="text-sm leading-relaxed text-slate-700">{doc.mrpApproach}</p>
              <div className="mt-3">
                <BulletList items={doc.mrpBenefits} />
              </div>
              <p className="mt-4 text-sm font-semibold text-pbs-700">{doc.mrpWorkflowFocus}</p>
            </PageSection>
          )}

          {doc?.functionalCapabilities && doc.functionalCapabilities.length > 0 && (
            <PageSection title="Functional capabilities">
              <div className="space-y-4">
                {doc.functionalCapabilities.map((cap, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-semibold text-slate-900">{cap.title}</h4>
                    <p className="mt-2 text-sm text-slate-600">{cap.intro}</p>
                    <div className="mt-2">
                      <BulletList items={cap.bullets} />
                    </div>
                  </div>
                ))}
              </div>
            </PageSection>
          )}

          {!doc && useCases.length > 0 && (
            <PageSection title="Prioritized use cases">
              <div className="space-y-4">
                {useCases.map((uc, i) => (
                  <div
                    key={uc.id}
                    className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/80 p-5"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-pbs-600">
                        Use case {i + 1}
                      </span>
                      <Badge tone={uc.horizon === 'pilot' ? 'emerald' : 'brand'}>
                        {uc.horizon === 'pilot' ? 'Immediate pilot' : 'Long-term'}
                      </Badge>
                      <Badge tone={uc.impact === 'high' ? 'amber' : 'slate'}>
                        {uc.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{uc.gap}</p>
                    <p className="mt-2 text-sm text-slate-600">{uc.solution}</p>
                  </div>
                ))}
              </div>
            </PageSection>
          )}

          {doc && (doc.securityPrinciples.length > 0 || doc.governancePrinciples.length > 0) && (
            <PageSection title="Security & governance">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500">Security principles</h4>
                  <div className="mt-2">
                    <BulletList items={doc.securityPrinciples} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500">Governance principles</h4>
                  <div className="mt-2">
                    <BulletList items={doc.governancePrinciples} />
                  </div>
                </div>
              </div>
            </PageSection>
          )}

          {!doc && architecture.hosting && (
            <PageSection title="Implementation architecture">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Hosting & infrastructure</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-800">{architecture.hosting}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Data pipelines</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-800">{architecture.pipelines}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Access & governance</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-800">{architecture.access}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Security & compliance</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-800">{architecture.security}</dd>
                </div>
              </dl>
            </PageSection>
          )}

          {doc?.implementationPhases && doc.implementationPhases.length > 0 && (
            <PageSection title="Implementation timeline (30 days)">
              <div className="space-y-4">
                {doc.implementationPhases.map((phase, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{phase.title}</h4>
                      <Badge tone="brand">{phase.period}</Badge>
                    </div>
                    <div className="mt-2">
                      <BulletList items={phase.activities} />
                    </div>
                  </div>
                ))}
              </div>
            </PageSection>
          )}

          {doc?.expectedOutcomes && doc.expectedOutcomes.length > 0 && (
            <PageSection title="Expected outcomes">
              <BulletList items={doc.expectedOutcomes} />
            </PageSection>
          )}

          {doc?.successIndicators && doc.successIndicators.length > 0 && (
            <PageSection title="Success indicators">
              <BulletList items={doc.successIndicators} />
            </PageSection>
          )}

          {doc?.futureEnhancements && doc.futureEnhancements.length > 0 && (
            <PageSection title="Future enhancements">
              <BulletList items={doc.futureEnhancements} />
            </PageSection>
          )}

          {(doc?.discussionItems?.length || nextSteps.length > 0) && (
            <PageSection title="Discussion & alignment">
              <BulletList items={doc?.discussionItems ?? nextSteps} />
            </PageSection>
          )}

          {doc?.closingStatement && (
            <PageSection title="Closing statement">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{doc.closingStatement}</p>
              <p className="mt-4 text-sm font-semibold text-pbs-700">
                {PBS_COMPANY.legalName} ({PBS_COMPANY.shortName})
              </p>
              <p className="text-xs tracking-wide text-pbs-600">{PBS_COMPANY.tagline}</p>
            </PageSection>
          )}

          {hasProposal && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleDownloadWord}>
                Download PBS scope of work (Word)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
