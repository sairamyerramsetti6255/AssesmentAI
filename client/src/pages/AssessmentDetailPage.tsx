import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api, QUESTION_TYPES, Question, type Assessment } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageLoading } from '@/components/LoadingSkeleton';
import { Chatbot } from '@/components/Chatbot';
import { AssessmentStepper, ASSESSMENT_WIZARD_STEPS } from '@/components/AssessmentStepper';
import { NextStepBanner } from '@/components/AssessmentJourney';
import { AssessmentWorkflowHelp } from '@/components/AssessmentWorkflowHelp';
import { AssessmentDeliverablesRoadmap } from '@/components/AssessmentDeliverablesRoadmap';
import { MultiTagInput, BUSINESS_DOMAIN_SUGGESTIONS } from '@/components/MultiTagInput';
import { DocumentUploadZone } from '@/components/DocumentUploadZone';
import { QuestionAnswerCard } from '@/components/QuestionAnswerCard';
import { ResearchPanel, WizardHero } from '@/components/ResearchPanel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import { cleanBenchmarkDrafts, isGenericBenchmark } from '@/lib/benchmarkUtils';
import {
  Sparkles, UserPlus, BarChart3,
  Plus, Trash2, Save, ChevronLeft, ChevronRight, CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react';

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [repId, setRepId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [questionGenError, setQuestionGenError] = useState('');
  const [researchError, setResearchError] = useState('');
  const [stepError, setStepError] = useState('');

  const [clientForm, setClientForm] = useState({
    company_name: '', business_domains: [] as string[], website_url: '', website_details: '',
    contact_name: '', contact_email: '', contact_phone: '', industry_id: '', country_of_operation: '',
  });
  const [generatingBenchmarks, setGeneratingBenchmarks] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [researchForm, setResearchForm] = useState({ research_notes: '', pain_point_ids: [] as string[] });
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'rating' as 'rating' | 'text' | 'voice' | 'multi_select',
    options: ['', ''],
    is_required: true,
  });

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => api.getAssessment(id!),
    enabled: !!id,
  });

  const completedSteps = assessment?.completed_steps ?? [];
  const urlStep = Number(searchParams.get('step') || 0);
  const currentStep = urlStep || assessment?.current_step || 1;
  const maxAccessibleStep = Math.max(currentStep, ...completedSteps, 1);

  useEffect(() => {
    if (assessment) {
      const domains = assessment.client?.business_domains?.length
        ? assessment.client.business_domains
        : (assessment.client?.domain
          ? assessment.client.domain.split(',').map((s) => s.trim()).filter(Boolean)
          : []);
      setClientForm({
        company_name: assessment.client?.company_name || '',
        business_domains: domains,
        website_url: assessment.client?.website_url || '',
        website_details: assessment.client?.website_details || '',
        contact_name: assessment.client?.contact_name || '',
        contact_email: assessment.client?.contact_email || '',
        contact_phone: assessment.client?.contact_phone || '',
        industry_id: assessment.client?.industry_id || '',
        country_of_operation: assessment.client?.country_of_operation || '',
      });
      setResearchForm({
        research_notes: assessment.pre_assessment_notes || '',
        pain_point_ids: assessment.pain_point_ids || [],
      });
    }
  }, [assessment?.id, assessment?.updated_at]);

  const goToStep = useCallback((step: number) => {
    setStepError('');
    setSearchParams({ step: String(step) });
  }, [setSearchParams]);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.getDocuments(id!),
    enabled: !!id,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', id],
    queryFn: () => api.getQuestions(id!),
    enabled: !!id,
  });

  useEffect(() => {
    const drafts: Record<string, string> = {};
    questions.forEach((q) => {
      const raw = q.expected_answer ?? '';
      drafts[q.id] = isGenericBenchmark(raw) ? '' : raw;
    });
    setAnswerDrafts(cleanBenchmarkDrafts(drafts));
  }, [questions]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    enabled: user?.role_name === 'super_admin' || user?.role_name === 'sales_manager',
  });

  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: () => api.getMasterData('industries') as Promise<Array<{ id: string; name: string }>>,
  });

  const { data: painPoints = [] } = useQuery({
    queryKey: ['pain-points'],
    queryFn: () => api.getMasterData('pain-points') as Promise<Array<{ id: string; category_name: string }>>,
  });

  const reps = users.filter((u) => u.role_name === 'sales_rep');
  const isManager = user?.role_name === 'sales_manager' || user?.role_name === 'super_admin';
  const isRep = user?.role_name === 'sales_rep';

  const showSaved = () => {
    setSaveMessage('Saved');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  /**
   * One-shot generation from Step 1 client info: research + questions + expected answers.
   * Saves client info first, then runs the full pipeline server-side, then advances to review.
   */
  const generateAll = async () => {
    if (!id) return;
    if (!clientForm.company_name.trim()) {
      setStepError('Company name is required before generating.');
      return;
    }
    setStepError('');
    setResearchError('');
    setQuestionGenError('');
    setGeneratingAll(true);
    try {
      // Persist Step 1 data so the server generates from the latest client info
      await api.updateAssessment(id, { ...clientForm, mark_step_complete: 1 });
      const result = await api.generateAll(id);
      setResearchForm({ research_notes: result.research_notes, pain_point_ids: result.pain_point_ids });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assessment', id] }),
        qc.invalidateQueries({ queryKey: ['questions', id] }),
      ]);
      goToStep(2);
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingAll(false);
    }
  };

  const saveAnswersMutation = useMutation({
    mutationFn: () => api.updateQuestions(
      id!,
      questions.map((q) => ({ id: q.id, expected_answer: answerDrafts[q.id]?.trim() || null })),
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', id] });
      showSaved();
    },
  });

  const saveStepMutation = useMutation({
    mutationFn: ({ step, data, advance }: { step: number; data: Record<string, unknown>; advance?: boolean }) =>
      api.saveDraftStep(id!, step, data, advance),
    onSuccess: async (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessment', id] });
      showSaved();

      if (vars.advance && vars.step === 4 && id) {
        await saveAnswersMutation.mutateAsync();
      }

      if (vars.advance && vars.step < 5) goToStep(vars.step + 1);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => api.uploadDocuments(id!, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', id] });
      showSaved();
    },
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: () => api.generateQuestions(id!),
    onSuccess: () => {
      setQuestionGenError('');
      qc.invalidateQueries({ queryKey: ['questions', id] });
    },
    onError: (err) => setQuestionGenError(err instanceof Error ? err.message : 'Question generation failed'),
  });

  const addQuestionMutation = useMutation({
    mutationFn: () => api.addQuestion(id!, {
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type,
      options: newQuestion.question_type === 'multi_select' ? newQuestion.options.filter((o) => o.trim()) : undefined,
      is_required: newQuestion.is_required,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', id] });
      setNewQuestion({ question_text: '', question_type: 'rating', options: ['', ''], is_required: true });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (qid: string) => api.deleteQuestion(id!, qid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', id] }),
  });

  const assignMutation = useMutation({
    mutationFn: () => api.assignAssessment(id!, repId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessment', id] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveAssessment(id!),
    onSuccess: (data) => {
      const url = (data as Assessment & { portal_url?: string }).portal_url;
      if (url) setPortalUrl(`${window.location.origin}${url}`);
      qc.invalidateQueries({ queryKey: ['assessment', id] });
    },
    onError: (err) => setStepError(err instanceof Error ? err.message : 'Approval failed'),
  });

  const generateAllBenchmarks = async () => {
    if (!id) return;
    setGeneratingBenchmarks(true);
    setQuestionGenError('');
    try {
      await api.generateAllBenchmarks(id);
      await qc.invalidateQueries({ queryKey: ['questions', id] });
    } catch (err) {
      setQuestionGenError(err instanceof Error ? err.message : 'Benchmark generation failed');
    } finally {
      setGeneratingBenchmarks(false);
    }
  };

  const clearGenericBenchmarks = async () => {
    if (!id) return;
    await api.clearGenericBenchmarks(id);
    setAnswerDrafts((d) => {
      const next = { ...d };
      for (const qid of Object.keys(next)) {
        if (isGenericBenchmark(next[qid])) next[qid] = '';
      }
      return next;
    });
    await qc.invalidateQueries({ queryKey: ['questions', id] });
  };

  const startSessionMutation = useMutation({
    mutationFn: () => api.startSession(id!),
    onSuccess: (session) => navigate(`/sessions/${session.id}`),
  });

  const togglePainPoint = (pid: string) => {
    setResearchForm((f) => ({
      ...f,
      pain_point_ids: f.pain_point_ids.includes(pid) ? f.pain_point_ids.filter((p) => p !== pid) : [...f.pain_point_ids, pid],
    }));
  };

  const missingAnswers = (qs: Question[]) =>
    qs.filter((q) => q.is_required && !(answerDrafts[q.id]?.trim()));

  const generateAiAnswer = async (questionId: string) => {
    if (!id) return;
    setAiGeneratingId(questionId);
    try {
      const { expected_answer } = await api.generateExpectedAnswer(id, questionId);
      setAnswerDrafts((d) => ({ ...d, [questionId]: expected_answer }));
    } catch (err) {
      setQuestionGenError(err instanceof Error ? err.message : 'AI answer generation failed');
    } finally {
      setAiGeneratingId(null);
    }
  };

  const saveCurrentStep = (advance = false) => {
    if (!id) return;
    setStepError('');

    if (advance && currentStep === 4) {
      if (questions.length === 0) {
        setStepError('Generate or add at least one question before continuing.');
        return;
      }
      const missing = missingAnswers(questions);
      if (missing.length > 0) {
        setStepError(`Set expected answers for ${missing.length} required question(s) before review.`);
        return;
      }
    }

    switch (currentStep) {
      case 1:
        if (advance && !clientForm.company_name.trim()) {
          setStepError('Company name is required.');
          return;
        }
        saveStepMutation.mutate({ step: 1, data: { ...clientForm, status: 'draft' }, advance });
        break;
      case 2:
        saveStepMutation.mutate({
          step: 2,
          data: { research_notes: researchForm.research_notes, pre_assessment_notes: researchForm.research_notes, pain_point_ids: researchForm.pain_point_ids },
          advance,
        });
        break;
      case 3:
        saveStepMutation.mutate({ step: 3, data: {}, advance });
        break;
      case 4:
        saveAnswersMutation.mutate(undefined, {
          onSuccess: () => {
            if (advance) saveStepMutation.mutate({ step: 4, data: {}, advance: true });
            else showSaved();
          },
        });
        break;
      case 5:
        saveStepMutation.mutate({ step: 5, data: {}, advance: false });
        break;
    }
  };

  if (isLoading || !assessment) return <Layout><PageLoading /></Layout>;

  const stepMeta = ASSESSMENT_WIZARD_STEPS.find((s) => s.id === currentStep);
  const companyLabel = clientForm.company_name || assessment.client?.company_name || 'New Assessment';
  const answersComplete = missingAnswers(questions).length === 0;
  const canRunLiveSession =
    isRep &&
    assessment.assigned_rep_id === user?.id &&
    questions.length > 0 &&
    ['assigned', 'in_session'].includes(assessment.status);
  const repWaitingForAssign =
    isRep && (!assessment.assigned_rep_id || assessment.assigned_rep_id !== user?.id);
  const repNotReady = isRep && assessment.assigned_rep_id === user?.id && !['assigned', 'in_session', 'scored', 'completed'].includes(assessment.status);

  if (isRep) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl pb-10">
          <Link to="/assessments" className="mb-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-navy">
            ← Back to assessments
          </Link>
          <WizardHero
            companyName={companyLabel}
            status={STATUS_LABELS[assessment.status] || assessment.status}
            stepLabel="Client session"
            stepSubtitle="Live discovery with the executive"
          />
          <Badge className={`mb-4 ${STATUS_COLORS[assessment.status] || 'bg-slate-100'}`}>
            {STATUS_LABELS[assessment.status] || assessment.status}
          </Badge>

          <AssessmentWorkflowHelp role="rep" />

          {repWaitingForAssign && (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This assessment has not been assigned to you yet. Your manager will notify you when it is ready.
            </p>
          )}

          {repNotReady && (
            <p className="mt-6 rounded-xl border border-brand-cream bg-brand-soft-light p-4 text-sm text-brand-slate">
              Your manager is still preparing questions and benchmark answers. You will be able to start the live session once status is <strong>Assigned</strong>.
            </p>
          )}

          {canRunLiveSession && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{questions.length}</span> discovery questions ready
                </p>
                {assessment.pre_assessment_notes && (
                  <p className="mt-3 line-clamp-4 text-sm text-slate-600">{assessment.pre_assessment_notes}</p>
                )}
              </div>
              <NextStepBanner
                title="Start live session with the client"
                description="Ask each question and record their real answers. AI will score responses against the manager's benchmarks when you finish."
                actionLabel="Start Live Session"
                onAction={() => startSessionMutation.mutate()}
                loading={startSessionMutation.isPending}
              />
            </div>
          )}

          {['scored', 'completed'].includes(assessment.status) && (
            <div className="mt-6">
              <NextStepBanner
                title="Session complete"
                description="View readiness scores and share insights with your manager."
                actionLabel="View Results"
                to={`/assessments/${id}/results`}
              />
            </div>
          )}
        </div>
        <Chatbot assessmentId={id} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl pb-10">
        <Link to="/assessments" className="mb-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-navy">
          ← Back to assessments
        </Link>

        <WizardHero
          companyName={companyLabel}
          status={STATUS_LABELS[assessment.status] || assessment.status}
          stepLabel={stepMeta?.label || ''}
          stepSubtitle={stepMeta?.subtitle || ''}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge className={STATUS_COLORS[assessment.status] || 'bg-slate-100'}>
            {STATUS_LABELS[assessment.status] || assessment.status}
          </Badge>
          {saveMessage && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {saveMessage}
            </span>
          )}
          {['scored', 'completed', 'in_session'].includes(assessment.status) && (
            <Link to={`/assessments/${id}/results`}>
              <Button variant="outline" size="sm"><BarChart3 className="mr-2 h-4 w-4" /> Results</Button>
            </Link>
          )}
        </div>

        {isManager && currentStep <= 5 && (
          <div className="mb-6">
            <AssessmentWorkflowHelp role="manager" />
          </div>
        )}

        <AssessmentStepper
          steps={ASSESSMENT_WIZARD_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          maxAccessibleStep={maxAccessibleStep}
          onStepClick={goToStep}
        />

        <div className="wizard-card p-6 sm:p-8">
          {(stepError || researchError) && currentStep <= 2 && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {stepError || researchError}
            </div>
          )}

          {currentStep === 1 && isManager && (
            <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Company Name *</Label>
                <Input className="mt-1" value={clientForm.company_name} onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <MultiTagInput
                  label="Business Domains"
                  hint="Select or type custom domains"
                  value={clientForm.business_domains}
                  onChange={(business_domains) => setClientForm({ ...clientForm, business_domains })}
                  suggestions={BUSINESS_DOMAIN_SUGGESTIONS}
                  placeholder="Healthcare, FinTech..."
                />
              </div>
              <div>
                <Label>Website URL</Label>
                <Input className="mt-1" placeholder="https://..." value={clientForm.website_url} onChange={(e) => setClientForm({ ...clientForm, website_url: e.target.value })} />
              </div>
              <div>
                <Label>Industry</Label>
                <Select className="mt-1" value={clientForm.industry_id} onChange={(e) => setClientForm({ ...clientForm, industry_id: e.target.value })}>
                  <option value="">Select industry</option>
                  {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Country of Operation</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. United States, UAE"
                  value={clientForm.country_of_operation}
                  onChange={(e) => setClientForm({ ...clientForm, country_of_operation: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Business Details</Label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-brand-cream bg-brand-soft-light p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  rows={3}
                  value={clientForm.website_details}
                  onChange={(e) => setClientForm({ ...clientForm, website_details: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input className="mt-1" value={clientForm.contact_name} onChange={(e) => setClientForm({ ...clientForm, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input className="mt-1" type="email" value={clientForm.contact_email} onChange={(e) => setClientForm({ ...clientForm, contact_email: e.target.value })} />
              </div>
            </div>

            <div className="rounded-2xl border border-brand-cream bg-brand-soft-light p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-brand-navy">Generate the assessment from this client info</p>
                  <p className="mt-0.5 text-sm text-brand-slate">
                    Deep research, tailored questions, and benchmark answers are all created from the details above.
                    You'll review everything in the next steps — nothing is generated when you just click Continue.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={generateAll}
                    disabled={generatingAll || !clientForm.company_name.trim()}
                  >
                    {generatingAll ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating research, questions & answers…</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> {questions.length > 0 ? 'Regenerate Assessment Data' : 'Generate Assessment Data'}</>
                    )}
                  </Button>
                  {questions.length > 0 && !generatingAll && (
                    <p className="mt-2 text-xs text-brand-primary">
                      Already generated — {questions.length} questions ready. Use Continue to review, or regenerate to start over.
                    </p>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}

          {currentStep === 2 && isManager && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Deep research generated from Step 1. Edit freely or regenerate the full set from Step 1.</p>
                {!researchForm.research_notes.trim() && (
                  <span className="text-xs text-amber-600">No research yet — generate it from Step 1.</span>
                )}
              </div>
              <ResearchPanel
                content={researchForm.research_notes}
                loading={generatingAll}
                onChange={(v) => setResearchForm({ ...researchForm, research_notes: v })}
              />
              <div>
                <Label>Pain Points</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {painPoints.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePainPoint(p.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        researchForm.pain_point_ids.includes(p.id)
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'bg-brand-cream text-brand-navy hover:bg-brand-soft-light'
                      }`}
                    >
                      {p.category_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && isManager && (
            <DocumentUploadZone
              documents={documents}
              onUpload={(files) => uploadMutation.mutateAsync(files)}
              isUploading={uploadMutation.isPending}
            />
          )}

          {currentStep === 4 && isManager && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft-light px-4 py-3 ring-1 ring-brand-cream">
                <div>
                  <p className="font-semibold text-brand-navy">Questions & benchmark answers</p>
                  <p className="text-xs text-brand-primary">
                    These are ideal answers for AI scoring — not what the client said. The rep captures real answers in the live session.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => saveAnswersMutation.mutate()} disabled={saveAnswersMutation.isPending}>
                    <Save className="mr-1 h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => generateQuestionsMutation.mutate()} disabled={generateQuestionsMutation.isPending}>
                    <Sparkles className="mr-1 h-4 w-4" /> Regenerate Qs
                  </Button>
                  <Button size="sm" onClick={generateAllBenchmarks} disabled={generatingBenchmarks || questions.length === 0}>
                    {generatingBenchmarks ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                    AI All Benchmarks
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearGenericBenchmarks}>
                    Clear filler text
                  </Button>
                </div>
              </div>

              {generateQuestionsMutation.isPending && questions.length === 0 && (
                <div className="flex items-center justify-center rounded-2xl border border-brand-cream bg-brand-soft-light p-8">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-primary" />
                  <span className="text-sm text-brand-navy">Generating questions with Gemini 2.5 Flash...</span>
                </div>
              )}

              {questionGenError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{questionGenError}</div>
              )}

              {stepError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{stepError}</div>
              )}

              <div className="space-y-4">
                {questions.map((q, i) => (
                  <QuestionAnswerCard
                    key={q.id}
                    question={q}
                    index={i}
                    expectedAnswer={answerDrafts[q.id] ?? ''}
                    onAnswerChange={(v) => setAnswerDrafts((d) => ({ ...d, [q.id]: v }))}
                    onGenerateAi={() => generateAiAnswer(q.id)}
                    generatingAi={aiGeneratingId === q.id}
                    onDelete={() => deleteQuestionMutation.mutate(q.id)}
                  />
                ))}
              </div>

              {!answersComplete && questions.length > 0 && (
                <p className="text-center text-xs text-amber-600">
                  {missingAnswers(questions).length} required answer(s) still need to be set
                </p>
              )}

              <details className="rounded-xl border border-dashed border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">+ Add custom question</summary>
                <div className="mt-4 space-y-3">
                  <Input
                    placeholder="Question text..."
                    value={newQuestion.question_text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  />
                  <Select value={newQuestion.question_type} onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value as typeof newQuestion.question_type })}>
                    {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                  <Button size="sm" onClick={() => addQuestionMutation.mutate()} disabled={!newQuestion.question_text.trim()}>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              </details>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Questions', value: questions.length },
                  { label: 'Benchmarks set', value: questions.filter((q) => answerDrafts[q.id]?.trim()).length },
                  { label: 'Documents', value: documents.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-100">
                    <div className="text-3xl font-bold text-slate-900">{s.value}</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Manager brief (questions + benchmarks)</h3>
                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {questions.map((q, i) => (
                    <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-sm font-medium text-slate-800">{i + 1}. {q.question_text}</p>
                      <p className="mt-2 text-sm text-brand-primary">
                        <span className="font-medium text-slate-500">Benchmark: </span>
                        {answerDrafts[q.id]?.trim() || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {['approved', 'assigned', 'in_session', 'scored', 'completed'].includes(assessment.status) && (
                <AssessmentDeliverablesRoadmap
                  compact
                  assessmentId={id!}
                  assessment={assessment}
                  highlight={
                    assessment.status === 'scored' || assessment.status === 'completed'
                      ? 'results'
                      : assessment.assigned_rep_id
                        ? 'session'
                        : 'assign'
                  }
                />
              )}

              {isManager && assessment.status !== 'approved' && assessment.status !== 'assigned' && (
                <div className="rounded-2xl border border-brand-cream bg-brand-soft-light p-6">
                  <h3 className="mb-2 font-semibold text-slate-900">Approve assessment</h3>
                  <p className="mb-4 text-sm text-brand-slate">
                    Locks questions and benchmarks, and creates a client portal link (optional self-service).
                  </p>
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={!answersComplete || questions.length === 0 || approveMutation.isPending}
                  >
                    {approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Approve & get portal link
                  </Button>
                  {(portalUrl || assessment.portal_token) && (
                    <p className="mt-3 break-all text-xs text-brand-primary">
                      Client portal: {portalUrl || `${window.location.origin}/client/${assessment.portal_token}`}
                    </p>
                  )}
                  <p className="mt-4 text-sm text-brand-slate">
                    Next: use the <strong>After approval — demo path</strong> checklist below — assign a rep, then
                    Results → Gap Analysis → Proposal.
                  </p>
                </div>
              )}

              {isManager && !assessment.assigned_rep && ['approved', 'assigned'].includes(assessment.status) && (
                <div className="rounded-2xl border border-brand-cream bg-brand-soft-light p-6">
                  <h3 className="mb-3 font-semibold text-slate-900">Assign to Sales Rep</h3>
                  <div className="flex flex-wrap gap-3">
                    <Select value={repId} onChange={(e) => setRepId(e.target.value)} className="min-w-[200px] flex-1 bg-white">
                      <option value="">Select rep...</option>
                      {reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                    </Select>
                    <Button
                      onClick={() => assignMutation.mutate()}
                      disabled={!repId || !answersComplete || questions.length === 0}
                    >
                      <UserPlus className="mr-2 h-4 w-4" /> Assign Assessment
                    </Button>
                  </div>
                  {(!answersComplete || questions.length === 0) && (
                    <p className="mt-2 text-xs text-amber-700">Complete all question answers in Step 4 before assigning.</p>
                  )}
                </div>
              )}

              {/* Manager / admin: assign rep — live session is rep-only */}
              {isManager && !assessment.assigned_rep && questions.length > 0 && answersComplete && (
                <p className="rounded-xl border border-brand-cream bg-brand-soft-light p-4 text-sm text-brand-slate">
                  Assign a sales rep below. They will run the <strong>live session</strong> with the client; you do not need to repeat the questionnaire yourself.
                </p>
              )}

              {isManager && assessment.assigned_rep && ['assigned', 'in_session'].includes(assessment.status) && (
                <NextStepBanner
                  title={`Assigned to ${assessment.assigned_rep.full_name}`}
                  description="Waiting for the rep to complete the live client session. You will review AI-scored results here when they finish."
                  secondary={{ label: 'Back to assessments', to: '/assessments' }}
                />
              )}

              {isManager && assessment.assigned_rep && assessment.status === 'in_session' && (
                <p className="text-sm text-brand-slate">Live session in progress — results will appear after the rep completes and scoring runs.</p>
              )}

              {/* Results are ready */}
              {['scored', 'completed'].includes(assessment.status) && (
                <NextStepBanner
                  title="Session complete — results are ready"
                  description="Review AI-scored readiness results, then move on to gap analysis and the client proposal."
                  actionLabel="View Results"
                  to={`/assessments/${id}/results`}
                  secondary={{ label: 'Back to assessments', to: '/assessments' }}
                />
              )}
            </div>
          )}

          {isManager && (
            <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
              <Button variant="outline" disabled={currentStep === 1} onClick={() => goToStep(currentStep - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => saveCurrentStep(false)} disabled={saveStepMutation.isPending || saveAnswersMutation.isPending}>
                  <Save className="mr-1 h-4 w-4" /> Save
                </Button>
                {currentStep < 5 ? (
                  <Button onClick={() => saveCurrentStep(true)} disabled={saveStepMutation.isPending || saveAnswersMutation.isPending}>
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => saveCurrentStep(false)}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Done
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Chatbot assessmentId={id} />
    </Layout>
  );
}
