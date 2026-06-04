import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSkeleton';
import { NextStepBanner } from '@/components/AssessmentJourney';
import { AssessmentDeliverablesRoadmap } from '@/components/AssessmentDeliverablesRoadmap';
import { useDemoHydrate } from '@/hooks/useDemoHydrate';
import { PocLetterSection } from '@/components/PocLetterSection';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { Sparkles, Target, Lightbulb, FileText, Loader2 } from 'lucide-react';

export default function GapAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  useDemoHydrate(id);

  const { data: gap, isLoading } = useQuery({
    queryKey: ['gap-analysis', id],
    queryFn: () => api.getGapAnalysis(id!),
    enabled: !!id,
  });

  const { data: poc } = useQuery({
    queryKey: ['poc', id],
    queryFn: () => api.getPoc(id!),
    enabled: !!id,
  });

  const { data: results } = useQuery({
    queryKey: ['results', id],
    queryFn: () => api.getResults(id!),
    enabled: !!id,
  });

  const hasScore = !!results?.score;

  const generateMutation = useMutation({
    mutationFn: () => api.generateGapAnalysis(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gap-analysis', id] }),
  });

  const pocMutation = useMutation({
    mutationFn: () => api.generatePoc(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poc', id] }),
  });

  if (isLoading) return <Layout><PageLoading /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Gap Analysis"
        subtitle="Prioritized gaps and Pbshope solution mapping — then generate your PoC letter"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {gap ? 'Regenerate' : 'Generate'} analysis
            </Button>
            {gap && (
              <Button variant="outline" onClick={() => pocMutation.mutate()} disabled={pocMutation.isPending}>
                {pocMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {poc ? 'Regenerate' : 'Generate'} PoC letter
              </Button>
            )}
          </div>
        }
      />

      <AssessmentDeliverablesRoadmap assessmentId={id!} highlight="gap" compact className="mb-4" />

      {!hasScore ? (
        <div className="section-panel py-12 text-center">
          <Target className="mx-auto mb-4 h-10 w-10 text-brand-slate" />
          <p className="mx-auto max-w-lg text-brand-slate">
            Gap analysis needs readiness scores. Complete the rep&apos;s <strong>live session</strong>, or on Step 5 use
            <strong> Prepare demo deliverables</strong> for a manager-only preview.
          </p>
        </div>
      ) : !gap ? (
        <div className="section-panel py-16 text-center">
          <Target className="mx-auto mb-4 h-10 w-10 text-brand-slate" />
          <p className="text-brand-slate">Click <strong>Generate analysis</strong> above to unlock recommendations and the PoC letter.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="section-panel">
              <h2 className="section-panel-title">
                <Target className="h-4 w-4" /> Identified gaps
              </h2>
              <div className="space-y-3">
                {gap.gaps.map((g, i) => (
                  <div key={i} className="gap-item">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-brand-navy">{g.driver}</span>
                      <Badge
                        className={
                          g.severity === 'high'
                            ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                            : g.severity === 'medium'
                              ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
                              : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                        }
                      >
                        {g.severity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-brand-slate">{g.gap}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="section-panel">
              <h2 className="section-panel-title">
                <Lightbulb className="h-4 w-4" /> Recommended solutions
              </h2>
              <div className="space-y-3">
                {gap.recommended_solutions.map((s, i) => (
                  <div key={i} className="gap-item border-l-4 border-l-brand-primary">
                    <p className="font-semibold text-brand-primary">{s.solution_name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-brand-slate">{s.rationale}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {(poc || pocMutation.isPending) && (
            <section className="mt-4">
              <div className="mb-8 text-center sm:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-brand-navy">Proof of concept letter</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-brand-slate sm:mx-0">
                  Client-ready executive document — objectives, scope, timeline, and success metrics in a formal
                  letter layout.
                </p>
              </div>
              <PocLetterSection
                assessmentId={id!}
                poc={poc}
                isGenerating={pocMutation.isPending}
                onRegenerate={() => pocMutation.mutate()}
              />
            </section>
          )}

          <NextStepBanner
            title={poc ? 'Next: client proposal' : 'Add a PoC letter, then build the proposal'}
            description={
              poc
                ? 'Your gaps, solutions, and PoC letter roll into a polished proposal.'
                : 'Generate the PoC letter above to strengthen the pitch.'
            }
            actionLabel="Go to proposal"
            to={`/assessments/${id}/proposal`}
            secondary={{ label: 'Back to results', to: `/assessments/${id}/results` }}
          />
        </div>
      )}
    </Layout>
  );
}
