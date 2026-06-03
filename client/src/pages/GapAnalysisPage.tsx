import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';

export default function GapAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

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
        title="Gap Analysis & Recommendations"
        subtitle="AI-identified gaps and Pbshope solution mapping"
        actions={
          <>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              <Sparkles className="mr-2 h-4 w-4" /> {gap ? 'Regenerate' : 'Generate'} Analysis
            </Button>
            {gap && (
              <>
                <Button variant="outline" onClick={() => pocMutation.mutate()} disabled={pocMutation.isPending}>
                  {poc ? 'Regenerate' : 'Generate'} PoC Plan
                </Button>
                <Link to={`/assessments/${id}/proposal`}><Button variant="outline">Proposal</Button></Link>
              </>
            )}
          </>
        }
      />

      {!gap ? (
        <Card><CardContent className="py-8 text-center text-slate-500">Generate gap analysis to see recommendations.</CardContent></Card>
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Identified Gaps</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {gap.gaps.map((g, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.driver}</span>
                      <Badge className={g.severity === 'high' ? 'bg-red-100 text-red-700' : g.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                        {g.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{g.gap}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recommended Pbshope Solutions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {gap.recommended_solutions.map((s, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="font-medium text-brand-primary">{s.solution_name}</div>
                    <p className="mt-1 text-sm text-slate-600">{s.rationale}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {(poc || pocMutation.isPending) && (
            <Card>
              <CardHeader>
                <CardTitle>Proof of Concept Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {pocMutation.isPending ? (
                  <p className="text-sm text-slate-500">Generating PoC plan...</p>
                ) : poc?.html_content ? (
                  <div
                    className="prose prose-sm max-w-none rounded-lg border bg-white p-4"
                    dangerouslySetInnerHTML={{ __html: poc.html_content }}
                  />
                ) : poc?.content ? (
                  <div className="space-y-4">
                    {Object.entries(poc.content).map(([key, value]) => (
                      <div key={key} className="rounded-lg border p-4">
                        <h4 className="mb-2 font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                        {Array.isArray(value) ? (
                          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                            {value.map((item, i) => (
                              <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                            ))}
                          </ul>
                        ) : typeof value === 'object' && value !== null ? (
                          <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                              <div key={k}>
                                <dt className="text-slate-500">{k.replace(/_/g, ' ')}</dt>
                                <dd className="font-medium">{String(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-sm text-slate-600">{String(value)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Layout>
  );
}
