import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { AppLogo } from '@/components/AppLogo';
import { CheckCircle2, Loader2 } from 'lucide-react';

type PortalQuestion = {
  id: string;
  question_text: string;
  question_type: 'rating' | 'text' | 'voice' | 'multi_select';
  rating_min: number;
  rating_max: number;
  options: string[] | null;
};

type PortalPayload = {
  company_name: string;
  industry_name?: string;
  country_of_operation?: string;
  questions: PortalQuestion[];
};

async function fetchPortal(token: string): Promise<PortalPayload> {
  const res = await fetch(`${API_BASE_URL}/portal/${token}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Invalid link');
  return res.json();
}

async function submitPortalAnswer(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE_URL}/portal/${token}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to save');
  return res.json();
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [index, setIndex] = useState(0);
  const [rating, setRating] = useState(3);
  const [text, setText] = useState('');
  const [multi, setMulti] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => fetchPortal(token!),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => submitPortalAnswer(token!, body),
  });

  const questions = data?.questions || [];
  const q = questions[index];

  const saveAndNext = async () => {
    if (!q) return;
    const body: Record<string, unknown> = { question_id: q.id };
    if (q.question_type === 'rating') body.rating_value = rating;
    if (q.question_type === 'text' || q.question_type === 'voice') body.text_answer = text;
    if (q.question_type === 'multi_select') body.text_answer = multi;
    await saveMutation.mutateAsync(body);
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setText('');
      setMulti('');
      setRating(3);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <AppLogo />
        <p className="mt-6 text-brand-navy">This assessment link is invalid or has expired.</p>
      </div>
    );
  }

  if (index >= questions.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <AppLogo />
        <CheckCircle2 className="mt-6 h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-xl font-semibold text-brand-navy">Thank you</h1>
        <p className="mt-2 text-brand-slate">Your responses for {data.company_name} have been submitted.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-soft-light">
      <header className="border-b border-brand-cream bg-white px-6 py-4">
        <AppLogo />
        <p className="mt-2 text-sm text-brand-slate">{data.company_name} · AI Readiness Assessment</p>
      </header>
      <main className="mx-auto max-w-2xl p-6">
        <p className="mb-2 text-xs font-semibold uppercase text-brand-slate">
          Question {index + 1} of {questions.length}
        </p>
        <h2 className="mb-6 text-lg font-semibold text-brand-navy">{q.question_text}</h2>

        {q.question_type === 'rating' && (
          <div className="mb-6 flex flex-wrap gap-2">
            {Array.from({ length: q.rating_max - q.rating_min + 1 }, (_, i) => i + q.rating_min).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className={`h-11 w-11 rounded-full font-semibold ${rating === v ? 'bg-brand-primary text-white' : 'bg-white ring-1 ring-brand-cream'}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {q.question_type === 'multi_select' && q.options && (
          <div className="mb-6 space-y-2">
            {q.options.map((opt) => (
              <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${multi === opt ? 'border-brand-primary bg-white' : 'bg-white/60'}`}>
                <input type="radio" checked={multi === opt} onChange={() => setMulti(opt)} />
                {opt}
              </label>
            ))}
          </div>
        )}

        {(q.question_type === 'text' || q.question_type === 'voice') && (
          <Textarea className="mb-6 bg-white" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer..." />
        )}

        <Button onClick={saveAndNext} disabled={saveMutation.isPending} className="w-full sm:w-auto">
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {index < questions.length - 1 ? 'Save & continue' : 'Submit assessment'}
        </Button>
      </main>
    </div>
  );
}
