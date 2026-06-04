import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { architectureBlueprint, useCases as mockUseCases } from '../data/mock'
import { generateProposalFromDiscovery } from '../lib/ai-services'
import { OpenRouterApiError } from '../lib/openrouter'
import type { UseCase } from '../types'
import { Badge, Button, Card, PageHeader, Select } from '../components/ui'

export function Proposal() {
  const { leads, selectedLeadId, setSelectedLeadId, selectedLead } = useApp()
  const [useCases, setUseCases] = useState<UseCase[]>(mockUseCases)
  const [architecture, setArchitecture] = useState(architectureBlueprint)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runGenerate = async () => {
    if (!selectedLead?.aiResearch) {
      setError('Complete AI research on Lead Intake for this lead first.')
      return
    }
    const summary = selectedLead.clientAnswers
      ? JSON.stringify(selectedLead.clientAnswers).slice(0, 2000)
      : 'No client portal responses yet — infer from research brief only.'

    setLoading(true)
    setError(null)
    try {
      const result = await generateProposalFromDiscovery(
        selectedLead,
        selectedLead.aiResearch,
        summary,
      )
      setUseCases(
        result.useCases.map((uc, i) => ({
          id: `uc-ai-${i}`,
          ...uc,
        })),
      )
      setArchitecture(result.architecture)
    } catch (e) {
      setError(e instanceof OpenRouterApiError ? e.message : 'Proposal generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Strategic AI Deployment Blueprint"
        description="Module 5 — AI synthesizes use cases and architecture from discovery research and client answers."
        actions={
          <>
            <Select
              value={selectedLeadId ?? ''}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              options={leads.map((l) => ({ value: l.id, label: l.companyName }))}
            />
            <Button variant="secondary" disabled={loading} onClick={runGenerate}>
              {loading ? 'Generating…' : 'Generate blueprint (AI)'}
            </Button>
            <Button variant="secondary">Preview PDF</Button>
            <Button>Export proposal (Word)</Button>
          </>
        }
      />
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      <Card title="Use case prioritization grid" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="pb-2 pr-4">Operational gap</th>
                <th className="pb-2 pr-4">AI solution</th>
                <th className="pb-2 pr-4">Horizon</th>
                <th className="pb-2">Impact</th>
              </tr>
            </thead>
            <tbody>
              {useCases.map((uc) => (
                <tr key={uc.id} className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-800">{uc.gap}</td>
                  <td className="py-3 pr-4 text-slate-600">{uc.solution}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={uc.horizon === 'pilot' ? 'emerald' : 'indigo'}>
                      {uc.horizon === 'pilot' ? 'Immediate pilot' : 'Long-term scope'}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Badge tone={uc.impact === 'high' ? 'amber' : 'slate'}>{uc.impact}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Implementation architecture synthesizer">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase text-slate-500">Hosting model</dt>
            <dd className="mt-1 text-sm text-slate-800">{architecture.hosting}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase text-slate-500">Data pipelines</dt>
            <dd className="mt-1 text-sm text-slate-800">{architecture.pipelines}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase text-slate-500">Access controls</dt>
            <dd className="mt-1 text-sm text-slate-800">{architecture.access}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase text-slate-500">Security profile</dt>
            <dd className="mt-1 text-sm text-slate-800">{architecture.security}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
