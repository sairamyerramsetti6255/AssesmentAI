import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSkeleton';
import { NextStepBanner } from '@/components/AssessmentJourney';
import { AssessmentDeliverablesRoadmap } from '@/components/AssessmentDeliverablesRoadmap';
import { useDemoHydrate } from '@/hooks/useDemoHydrate';
import { isDemoMode } from '@/lib/demoMode';
import { ProfessionalDocument } from '@/components/ProfessionalDocument';
import { PocLetterSection } from '@/components/PocLetterSection';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { FileText, CheckCircle, Loader2, Target, Sparkles } from 'lucide-react';

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showSource, setShowSource] = useState(false);
  const isManager = user?.role_name === 'super_admin' || user?.role_name === 'sales_manager';

  useDemoHydrate(id);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => api.getProposal(id!),
    enabled: !!id,
  });

  const { data: poc } = useQuery({
    queryKey: ['poc', id],
    queryFn: () => api.getPoc(id!),
    enabled: !!id,
  });

  const { data: gap } = useQuery({
    queryKey: ['gap-analysis', id],
    queryFn: () => api.getGapAnalysis(id!),
    enabled: !!id,
  });

  const { data: results } = useQuery({
    queryKey: ['results', id],
    queryFn: () => api.getResults(id!),
    enabled: !!id,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateProposal(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposal', id] }),
  });

  const demoMutation = useMutation({
    mutationFn: () => api.generateDemoPackage(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal', id] });
      qc.invalidateQueries({ queryKey: ['gap-analysis', id] });
      qc.invalidateQueries({ queryKey: ['poc', id] });
      qc.invalidateQueries({ queryKey: ['results', id] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.finalizeProposal(id!, proposal?.rendered_html || ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposal', id] }),
  });

  const pocMutation = useMutation({
    mutationFn: () => api.generatePoc(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poc', id] }),
  });

  const displayHtml = proposal?.rendered_html?.trim() || '';
  const isFinalized = proposal?.status === 'finalized';
  const proposalWrapped = displayHtml.includes('proposal-letter-body')
    ? displayHtml
    : displayHtml
      ? `<div class="proposal-letter-body">${displayHtml}</div>`
      : '';

  if (isLoading) return <Layout><PageLoading /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Client proposal"
        subtitle="Executive proposal built from scores, gaps, and your PoC letter"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || isFinalized}>
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {displayHtml ? 'Regenerate' : 'Generate'} proposal
            </Button>
            {displayHtml && !isFinalized && (
              <Button variant="outline" onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> Finalize
              </Button>
            )}
          </div>
        }
      />

      <AssessmentDeliverablesRoadmap assessmentId={id!} highlight="proposal" compact className="mb-4" />

      {!displayHtml && !isDemoMode() ? (
        <div className="section-panel space-y-6 py-12">
          <div className="mx-auto max-w-xl text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-brand-primary/60" />
            <h2 className="text-xl font-bold text-brand-navy">No proposal yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-slate">
              Click Generate proposal above, or use the demo path strip to load sample content.
            </p>
          </div>
          <ol className="mx-auto max-w-md space-y-3 text-sm text-brand-slate">
            <li className="flex gap-2">
              <span className="font-bold text-brand-primary">1.</span>
              <span>
                Complete scoring — rep live session, or{' '}
                {isManager ? (
                  <button
                    type="button"
                    className="font-medium text-brand-primary underline"
                    onClick={() => demoMutation.mutate()}
                    disabled={demoMutation.isPending}
                  >
                    Prepare demo deliverables
                  </button>
                ) : (
                  'ask your manager to run the live session'
                )}
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-primary">2.</span>
              <span>
                Open{' '}
                <Link to={`/assessments/${id}/gap-analysis`} className="font-medium text-brand-primary underline">
                  Gap Analysis
                </Link>{' '}
                and generate gaps + PoC letter.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand-primary">3.</span>
              <span>Return here and click <strong>Generate proposal</strong> in the header.</span>
            </li>
          </ol>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={`/assessments/${id}/gap-analysis`}>
              <Button variant="outline">
                <Target className="mr-2 h-4 w-4" /> Gap analysis
              </Button>
            </Link>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate proposal now
            </Button>
            {isManager && (
              <Button variant="outline" onClick={() => demoMutation.mutate()} disabled={demoMutation.isPending}>
                {demoMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Full demo package
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {poc && (
            <div className="mb-12">
              <h2 className="mb-2 text-xl font-bold text-brand-navy">Proof of concept letter</h2>
              <p className="mb-6 text-sm text-brand-slate">Included in the proposal below — regenerate anytime from Gap Analysis.</p>
              <PocLetterSection
                assessmentId={id!}
                poc={poc}
                isGenerating={pocMutation.isPending}
                onRegenerate={() => pocMutation.mutate()}
              />
            </div>
          )}

          <ProfessionalDocument
            html={proposalWrapped}
            label={`Client proposal${isFinalized ? ' · Finalized' : ''}`}
            toolbarExtra={
              <Button variant="ghost" size="sm" onClick={() => setShowSource((s) => !s)}>
                {showSource ? 'Hide' : 'Show'} HTML
              </Button>
            }
          />
        </>
      )}

      {showSource && displayHtml && (
        <pre className="no-print mt-4 max-h-48 overflow-auto rounded-xl bg-brand-navy p-4 text-xs text-brand-cream">
          {displayHtml}
        </pre>
      )}

      {isFinalized ? (
        <NextStepBanner
          done
          title="Proposal finalized"
          description="This assessment is complete. You can revisit results or start a new client."
          actionLabel="New assessment"
          to="/assessments/new"
          secondary={{ label: 'All assessments', to: '/assessments' }}
        />
      ) : displayHtml ? (
        <NextStepBanner
          title="Finalize when ready"
          description="Review the proposal above, then finalize to lock and mark the assessment complete."
          actionLabel="Finalize proposal"
          onAction={() => finalizeMutation.mutate()}
          loading={finalizeMutation.isPending}
        />
      ) : (
        <NextStepBanner
          title="Need content first?"
          description="Generate gap analysis and a PoC letter, then build the proposal — or use Full demo package for a one-click preview."
          actionLabel="Go to gap analysis"
          to={`/assessments/${id}/gap-analysis`}
          secondary={{ label: 'View results', to: `/assessments/${id}/results` }}
        />
      )}
    </Layout>
  );
}
