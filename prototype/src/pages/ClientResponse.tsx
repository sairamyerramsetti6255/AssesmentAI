import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ClientResponsesTable } from '../components/ClientResponsesTable'
import { ExecutiveAssessmentTools } from '../components/ExecutiveAssessmentTools'
import { UploadedDocumentsTable } from '../components/UploadedDocumentsTable'
import { LeadContextBar, PageSection } from '../components/page-layout'
import * as api from '../lib/api'
import {
  buildClientResponseRowsFromLead,
  type ClientResponseRow,
} from '../lib/client-responses'
import { Badge, Button, PageHeader } from '../components/ui'

export function ClientResponse() {
  const { leads, selectedLeadId, setSelectedLeadId, selectedLead, questions, refreshLeads } =
    useApp()
  const [clientResponses, setClientResponses] = useState<ClientResponseRow[]>([])
  const [responseMeta, setResponseMeta] = useState({
    startedAt: null as string | null,
    submittedAt: null as string | null,
    updatedAt: null as string | null,
    progress: 0,
  })
  const [loadingResponses, setLoadingResponses] = useState(false)

  const loadResponses = () => {
    if (!selectedLeadId || !selectedLead) return
    setLoadingResponses(true)
    api
      .getClientResponses(selectedLeadId)
      .then((payload) => {
        setResponseMeta({
          startedAt: payload.assessmentStartedAt,
          submittedAt: payload.assessmentSubmittedAt,
          updatedAt: payload.assessmentUpdatedAt,
          progress: payload.clientProgress,
        })
        setClientResponses(
          payload.responses.length > 0
            ? payload.responses
            : selectedLead.clientAnswers
              ? buildClientResponseRowsFromLead(selectedLead, questions)
              : [],
        )
      })
      .catch(() => {
        if (selectedLead.clientAnswers) {
          setClientResponses(buildClientResponseRowsFromLead(selectedLead, questions))
        }
        setResponseMeta({
          startedAt: selectedLead.clientAssessmentStartedAt ?? null,
          submittedAt: selectedLead.clientAssessmentSubmittedAt ?? null,
          updatedAt: selectedLead.clientAssessmentUpdatedAt ?? null,
          progress: selectedLead.clientProgress ?? 0,
        })
      })
      .finally(() => setLoadingResponses(false))
  }

  useEffect(() => {
    loadResponses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId, selectedLead?.clientProgress, questions.length])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Client Response"
        description="View portal progress, submitted answers, and client uploads in one place."
      />

      <LeadContextBar
        leads={leads}
        selectedLeadId={selectedLeadId}
        onSelectLead={(id: string) => setSelectedLeadId(id || null)}
        selectedLead={selectedLead}
      />

      {!selectedLead ? (
        <PageSection title="Select a lead">
          <p className="text-sm text-slate-600">
            Choose a lead above to view client response status.
          </p>
        </PageSection>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Badge tone={(selectedLead.clientProgress ?? 0) === 100 ? 'emerald' : 'brand'}>
              Portal {selectedLead.clientProgress ?? 0}%
            </Badge>
            <Badge tone={selectedLead.assessmentStatus === 'approved' ? 'emerald' : 'amber'}>
              {selectedLead.assessmentStatus}
            </Badge>
            {selectedLead.portalToken && selectedLead.assessmentStatus === 'approved' && (
              <Link
                to={`/portal/${selectedLead.portalToken}`}
                className="text-sm font-medium text-pbs-600 hover:underline"
              >
                Open client portal →
              </Link>
            )}
            <Button
              variant="secondary"
              className="!text-xs ml-auto"
              onClick={() => {
                void refreshLeads()
                loadResponses()
              }}
            >
              Refresh
            </Button>
          </div>

          <PageSection
            title="Submitted responses"
            description="Every question the client answered in the portal, with timestamps."
          >
            <ClientResponsesTable
              responses={clientResponses}
              clientProgress={responseMeta.progress || selectedLead.clientProgress}
              assessmentStartedAt={responseMeta.startedAt ?? selectedLead.clientAssessmentStartedAt}
              assessmentSubmittedAt={responseMeta.submittedAt ?? selectedLead.clientAssessmentSubmittedAt}
              assessmentUpdatedAt={responseMeta.updatedAt ?? selectedLead.clientAssessmentUpdatedAt}
              loading={loadingResponses}
            />
          </PageSection>

          {selectedLead.clientUploadedDocuments && selectedLead.clientUploadedDocuments.length > 0 && (
            <PageSection title="Client uploads">
              <UploadedDocumentsTable
                leadId={selectedLead.id}
                documents={selectedLead.clientUploadedDocuments}
              />
            </PageSection>
          )}

          <PageSection title="Export assessment" description="Download Word or PDF for executives.">
            <ExecutiveAssessmentTools lead={selectedLead} />
          </PageSection>
        </>
      )}
    </div>
  )
}
