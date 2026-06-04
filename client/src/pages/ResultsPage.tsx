import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSkeleton';
import { Chatbot } from '@/components/Chatbot';
import { NextStepBanner } from '@/components/AssessmentJourney';
import { AssessmentDeliverablesRoadmap } from '@/components/AssessmentDeliverablesRoadmap';
import { useDemoHydrate } from '@/hooks/useDemoHydrate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

function BenchmarkCard({ benchmark }: { benchmark: Record<string, unknown> }) {
  const industryAvg = benchmark.industry_avg as Record<string, number> | undefined;
  const clientScores = (benchmark.client_scores || benchmark.your_scores) as Record<string, number> | undefined;
  const delta = benchmark.delta as Record<string, number> | undefined;
  const percentage = benchmark.industry_maturity_pct as number | undefined;

  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>Industry Benchmark Comparison</CardTitle></CardHeader>
      <CardContent>
        {percentage != null && (
          <p className="mb-4 text-sm text-brand-slate">
            Industry maturity benchmark: <strong>{percentage}%</strong> of peers at similar stage
          </p>
        )}
        {industryAvg && clientScores ? (
          <div className="space-y-3">
            {Object.keys(clientScores).map((key) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const client = clientScores[key] ?? 0;
              const industry = industryAvg[key] ?? 0;
              const diff = delta?.[key] ?? client - industry;
              return (
                <div key={key} className="rounded-lg border border-brand-cream p-3">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium">
                    <span>{label}</span>
                    <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)} vs industry
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-brand-slate">Your score</span>
                      <div className="mt-1 h-2 rounded-full bg-brand-cream">
                        <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${(client / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs text-brand-slate">{client}/5</span>
                    </div>
                    <div>
                      <span className="text-brand-slate">Industry avg</span>
                      <div className="mt-1 h-2 rounded-full bg-brand-cream">
                        <div className="h-2 rounded-full bg-brand-slate" style={{ width: `${(industry / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs text-brand-slate">{industry}/5</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-brand-slate">No industry benchmark data for this client.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isManager = user?.role_name === 'sales_manager' || user?.role_name === 'super_admin';

  useDemoHydrate(id);

  const { data: results, isLoading } = useQuery({
    queryKey: ['results', id],
    queryFn: () => api.getResults(id!),
    enabled: !!id,
  });

  if (isLoading) return <Layout><PageLoading /></Layout>;

  const score = results?.score;
  const chartData = score
    ? Object.entries(score.driver_scores).map(([key, value]) => {
        const driver = results.drivers.find((d) => d.driver_key === key);
        return { driver: driver?.driver_name || key, score: value, fullMark: 5 };
      })
    : [];

  return (
    <Layout>
      <PageHeader
        title="Assessment Results"
        subtitle="AI-powered session analysis and readiness scores"
        actions={
          <Link to={`/assessments/${id}`}><Button variant="outline">Back to Assessment</Button></Link>
        }
      />

      <AssessmentDeliverablesRoadmap assessmentId={id!} highlight="results" compact className="mb-4" />

      {!score ? (
        <Card>
          <CardContent className="py-8 text-center text-brand-slate">
            No scores yet. Assign a rep for the live session, or use <strong>Prepare demo deliverables</strong> on Step 5
            for a manager preview.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {score.executive_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-primary" /> Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-brand-navy">{score.executive_summary}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Overall Readiness</CardTitle></CardHeader>
              <CardContent className="text-center">
                <div className="text-5xl font-bold text-brand-primary">{score.overall_score}</div>
                <div className="text-brand-slate">out of 5</div>
                {score.maturity_stage_name && (
                  <Badge className="mt-4 bg-brand-soft-light px-4 py-2 text-lg text-brand-navy">{score.maturity_stage_name}</Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Driver Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="driver" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 5]} />
                    <Radar dataKey="score" stroke="#4B5694" fill="#4B5694" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Driver Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chartData.map((d) => (
                    <div key={d.driver} className="flex items-center gap-4">
                      <span className="w-40 text-sm font-medium">{d.driver}</span>
                      <div className="flex-1">
                        <div className="h-3 rounded-full bg-brand-cream">
                          <div className="h-3 rounded-full bg-brand-primary" style={{ width: `${(d.score / 5) * 100}%` }} />
                        </div>
                      </div>
                      <span className="w-12 text-right font-medium">{d.score}/5</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {score.benchmark_comparison && (
              <BenchmarkCard benchmark={score.benchmark_comparison} />
            )}

            {(score.key_findings?.length || score.recommendations?.length) ? (
              <div className="grid gap-6 lg:col-span-2 lg:grid-cols-2">
                {score.key_findings && score.key_findings.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Key Findings</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {score.key_findings.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-brand-navy">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {score.recommendations && score.recommendations.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {score.recommendations.map((r, i) => (
                          <li key={i} className="flex gap-2 text-sm text-brand-navy">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-slate" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}

            {score.question_analyses && score.question_analyses.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Question-by-Question AI Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {score.question_analyses.map((qa, i) => (
                    <div key={qa.question_id} className="rounded-xl border border-brand-cream p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-brand-navy">{i + 1}. {qa.question_text || 'Question'}</p>
                        <Badge className={qa.score >= 4 ? 'bg-brand-primary text-white' : qa.score <= 2 ? 'bg-red-100 text-red-700' : 'bg-brand-cream text-brand-navy'}>
                          {qa.score}/5
                        </Badge>
                      </div>
                      {qa.driver_name && (
                        <p className="mb-2 text-xs text-brand-slate">Driver: {qa.driver_name}</p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-brand-soft-light p-3">
                          <p className="mb-1 text-xs font-semibold uppercase text-brand-slate">Client Response</p>
                          <p className="text-sm text-brand-navy">{qa.client_answer_summary}</p>
                        </div>
                        {qa.expected_answer && (
                          <div className="rounded-lg bg-brand-cream/50 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase text-brand-slate">Benchmark</p>
                            <p className="text-sm text-brand-navy">{qa.expected_answer}</p>
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-brand-navy">{qa.analysis}</p>
                      {(qa.strengths?.length || qa.gaps?.length) ? (
                        <div className="mt-3 flex flex-wrap gap-4 text-xs">
                          {qa.strengths?.map((s) => (
                            <span key={s} className="rounded-full bg-green-50 px-2 py-1 text-green-700">+ {s}</span>
                          ))}
                          {qa.gaps?.map((g) => (
                            <span key={g} className="rounded-full bg-red-50 px-2 py-1 text-red-700">− {g}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {isManager ? (
            <NextStepBanner
              title="Next: build the gap analysis"
              description="Turn these scores into prioritized gaps and matched Pbshope solutions, then generate the client proposal."
              actionLabel="Go to Gap Analysis"
              to={`/assessments/${id}/gap-analysis`}
              secondary={{ label: 'Back to assessments', to: '/assessments' }}
            />
          ) : (
            <NextStepBanner
              title="Session complete — nicely done"
              description="Your manager will take it from here with gap analysis and the client proposal."
              secondary={{ label: 'Back to assessments', to: '/assessments' }}
            />
          )}
        </div>
      )}

      <Chatbot assessmentId={id} />
    </Layout>
  );
}
