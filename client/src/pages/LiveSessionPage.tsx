import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSkeleton';
import { Chatbot } from '@/components/Chatbot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Mic, MicOff, SkipForward, Edit, Trash2, CheckCircle, X, Building2, Target, Loader2, Sparkles } from 'lucide-react';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function LiveSessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<number>(3);
  const [textAnswer, setTextAnswer] = useState('');
  const [transcript, setTranscript] = useState('');
  const [multiSelectAnswer, setMultiSelectAnswer] = useState('');
  const [timer, setTimer] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyText, setModifyText] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recordingStart = useRef<number>(0);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  });

  const activeQuestions = session?.questions.filter((q) => q.session_status === 'active') || [];
  const currentQuestion = activeQuestions[currentIndex];

  useEffect(() => {
    if (!currentQuestion) return;
    setTimer(0);
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [currentIndex, currentQuestion?.id]);

  useEffect(() => {
    if (session && currentQuestion) {
      const existing = session.answers.find((a) => a.question_id === currentQuestion.id);
      if (existing) {
        setRating(existing.rating_value ?? 3);
        setTextAnswer(existing.text_answer ?? '');
        setTranscript(existing.transcript_answer ?? '');
        setMultiSelectAnswer(existing.text_answer ?? '');
      } else {
        setRating(3);
        setTextAnswer('');
        setTranscript('');
        setMultiSelectAnswer('');
      }
    }
  }, [currentQuestion?.id, session]);

  const saveAnswerMutation = useMutation({
    mutationFn: () => {
      const qType = currentQuestion!.question_type;
      return api.saveAnswer(sessionId!, {
        question_id: currentQuestion!.id,
        rating_value: qType === 'rating' ? rating : undefined,
        text_answer: qType === 'multi_select' ? multiSelectAnswer : qType === 'text' ? textAnswer : textAnswer || undefined,
        transcript_answer: qType === 'voice' ? transcript : transcript || undefined,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', sessionId] }),
  });

  const patchQuestionMutation = useMutation({
    mutationFn: (data: { action: string; question_text?: string; skip_reason?: string }) =>
      api.patchQuestion(sessionId!, currentQuestion!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', sessionId] });
      setModifyOpen(false);
      if (currentIndex < activeQuestions.length - 1) setCurrentIndex((i) => i + 1);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const qType = currentQuestion!.question_type;
      await api.saveAnswer(sessionId!, {
        question_id: currentQuestion!.id,
        rating_value: qType === 'rating' ? rating : undefined,
        text_answer: qType === 'multi_select' ? multiSelectAnswer : qType === 'text' ? textAnswer : textAnswer || undefined,
        transcript_answer: qType === 'voice' ? transcript : transcript || undefined,
      });
      await api.completeSession(sessionId!);
      await api.scoreAssessment(session!.assessment_id);
    },
    onSuccess: () => navigate(`/assessments/${session?.assessment_id}/results`),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = (e) => chunks.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - recordingStart.current) / 1000);
        setTranscribing(true);
        try {
          await api.uploadRecording(sessionId!, blob, currentQuestion!.id, duration);
          const audioBase64 = await blobToBase64(blob);
          const res = await api.transcribe(sessionId!, {
            question_id: currentQuestion!.id,
            audio_base64: audioBase64,
            mime_type: 'audio/webm',
          });
          setTranscript(res.transcript);
        } catch (err) {
          setTranscript(`Recording captured (${duration}s). ${err instanceof Error ? err.message : 'Transcription unavailable — edit manually.'}`);
        } finally {
          setTranscribing(false);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.current = recorder;
      recordingStart.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setTranscript('Microphone access denied. Type the client response manually below.');
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const nextQuestion = async () => {
    await saveAnswerMutation.mutateAsync();
    if (currentIndex < activeQuestions.length - 1) setCurrentIndex((i) => i + 1);
  };

  if (isLoading || !session) return <Layout><PageLoading /></Layout>;

  if (!currentQuestion) {
    return (
      <Layout>
        <PageHeader title="Live Session" subtitle="No active questions remaining" />
        <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
          {completeMutation.isPending ? 'Analyzing with AI...' : 'Complete & Score'}
        </Button>
      </Layout>
    );
  }

  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  const expectedTime = currentQuestion.expected_answer_time_seconds;
  const assessment = session.assessment;

  return (
    <Layout>
      <PageHeader
        title="Live Assessment Session"
        subtitle={`${assessment?.company_name || 'Client'} · Question ${currentIndex + 1} of ${activeQuestions.length}`}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="glass-card p-4 lg:col-span-2">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
            <div>
              <p className="text-sm font-semibold text-brand-navy">{assessment?.company_name || 'Client'}</p>
              <p className="text-xs text-brand-slate">
                {assessment?.industry_name || 'Industry'} · {assessment?.business_domains?.join(', ') || 'General'}
              </p>
              {assessment?.pain_points?.length ? (
                <p className="mt-1 text-xs text-brand-slate">Focus: {assessment.pain_points.join(', ')}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-slate">
            <Sparkles className="h-4 w-4 text-brand-primary" /> AI Scoring
          </div>
          <p className="mt-1 text-xs text-brand-navy">Answers scored vs manager benchmarks after session</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-brand-slate">Progress</span>
          <span className={timer > expectedTime ? 'text-red-600' : 'text-brand-slate'}>{timer}s / {expectedTime}s</span>
        </div>
        <div className="h-2 rounded-full bg-brand-cream">
          <div className="h-2 rounded-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {currentQuestion.expected_answer && (
        <div className="mb-4 rounded-xl border border-brand-cream bg-brand-soft-light p-4 ring-1 ring-brand-cream">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
            <Target className="h-4 w-4" /> Manager Benchmark (expected answer)
          </div>
          <p className="text-sm leading-relaxed text-brand-navy">{currentQuestion.expected_answer}</p>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{currentQuestion.question_text}</CardTitle>
          {currentQuestion.is_ai_generated && <span className="text-xs text-brand-primary">AI Generated Question</span>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-xs uppercase tracking-wide text-brand-slate">
            Answer type: {currentQuestion.question_type.replace('_', ' ')}
          </div>

          {(currentQuestion.question_type === 'voice' || currentQuestion.question_type === 'rating') && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Voice Recording</h3>
              <div className="flex items-center gap-3">
                <Button variant={recording ? 'destructive' : 'default'} onClick={recording ? stopRecording : startRecording} disabled={transcribing}>
                  {recording ? <><MicOff className="mr-2 h-4 w-4" /> Stop</> : <><Mic className="mr-2 h-4 w-4" /> Record</>}
                </Button>
                {recording && <span className="animate-pulse text-red-600">Recording...</span>}
                {transcribing && (
                  <span className="flex items-center gap-1 text-sm text-brand-primary">
                    <Loader2 className="h-4 w-4 animate-spin" /> Transcribing with AI...
                  </span>
                )}
              </div>
              {(transcript || currentQuestion.question_type === 'voice') && (
                <Textarea className="mt-3" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={4} placeholder="Client transcript (auto-filled after recording, editable)" />
              )}
            </div>
          )}

          {currentQuestion.question_type === 'rating' && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Rating ({currentQuestion.rating_min}-{currentQuestion.rating_max})</h3>
              <div className="flex gap-2">
                {Array.from({ length: currentQuestion.rating_max - currentQuestion.rating_min + 1 }, (_, i) => i + currentQuestion.rating_min).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRating(v)}
                    className={`h-10 w-10 rounded-full font-medium ${rating === v ? 'bg-brand-primary text-white' : 'bg-brand-cream text-brand-navy'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.question_type === 'text' && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Text Answer</h3>
              <Textarea value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} rows={4} placeholder="Enter client response..." />
            </div>
          )}

          {currentQuestion.question_type === 'multi_select' && currentQuestion.options && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Select an Option</h3>
              <div className="space-y-2">
                {currentQuestion.options.map((opt) => (
                  <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${multiSelectAnswer === opt ? 'border-brand-primary bg-brand-soft-light' : ''}`}>
                    <input type="radio" name="multi" checked={multiSelectAnswer === opt} onChange={() => setMultiSelectAnswer(opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.question_type === 'rating' && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Additional Notes (optional)</h3>
              <Textarea value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} rows={2} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-brand-cream pt-4">
            <span className="w-full text-sm font-medium text-brand-slate">Question Management</span>
            <Button variant="outline" size="sm" onClick={() => { setModifyText(currentQuestion.question_text); setModifyOpen(true); }}>
              <Edit className="mr-1 h-3 w-3" /> Modify
            </Button>
            <Button variant="outline" size="sm" onClick={() => patchQuestionMutation.mutate({ action: 'skip', skip_reason: 'Skipped during session' })}>
              <SkipForward className="mr-1 h-3 w-3" /> Skip
            </Button>
            {!currentQuestion.is_required && (
              <Button variant="outline" size="sm" onClick={() => patchQuestionMutation.mutate({ action: 'delete' })}>
                <Trash2 className="mr-1 h-3 w-3" /> Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>Previous</Button>
        {currentIndex < activeQuestions.length - 1 ? (
          <Button onClick={nextQuestion} disabled={saveAnswerMutation.isPending}>Save & Next</Button>
        ) : (
          <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            {completeMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI Analysis...</>
            ) : (
              <><CheckCircle className="mr-2 h-4 w-4" /> Complete & Score</>
            )}
          </Button>
        )}
      </div>

      {modifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Modify Question</h3>
              <button type="button" onClick={() => setModifyOpen(false)} className="text-brand-slate hover:text-brand-navy">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Textarea value={modifyText} onChange={(e) => setModifyText(e.target.value)} rows={4} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModifyOpen(false)}>Cancel</Button>
              <Button onClick={() => patchQuestionMutation.mutate({ action: 'modify', question_text: modifyText })} disabled={!modifyText.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <Chatbot assessmentId={session.assessment_id} />
    </Layout>
  );
}
