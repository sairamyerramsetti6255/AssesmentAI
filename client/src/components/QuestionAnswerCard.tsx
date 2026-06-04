import { Question } from '@/lib/api';
import { Badge } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isGenericBenchmark } from '@/lib/benchmarkUtils';

const TYPE_STYLES: Record<string, { badge: string; accent: string }> = {
  rating: { badge: 'bg-brand-soft-light text-brand-navy ring-1 ring-brand-cream', accent: 'border-l-brand-primary' },
  text: { badge: 'bg-brand-soft-light text-brand-navy ring-1 ring-brand-cream', accent: 'border-l-brand-slate' },
  voice: { badge: 'bg-brand-soft-light text-brand-navy ring-1 ring-brand-cream', accent: 'border-l-brand-navy' },
  multi_select: { badge: 'bg-brand-soft-light text-brand-navy ring-1 ring-brand-cream', accent: 'border-l-brand-primary' },
};

interface QuestionAnswerCardProps {
  question: Question;
  index: number;
  expectedAnswer: string;
  onAnswerChange: (value: string) => void;
  onGenerateAi?: () => Promise<void>;
  generatingAi?: boolean;
  onDelete?: () => void;
}

export function QuestionAnswerCard({
  question,
  index,
  expectedAnswer,
  onAnswerChange,
  onGenerateAi,
  generatingAi,
  onDelete,
}: QuestionAnswerCardProps) {
  const style = TYPE_STYLES[question.question_type] || TYPE_STYLES.rating;
  const missing = question.is_required && !expectedAnswer.trim();
  const isFiller = isGenericBenchmark(expectedAnswer);

  return (
    <article
      className={cn(
        'glass-card group relative overflow-hidden border-l-4 transition-all hover:shadow-md',
        style.accent,
        missing && 'ring-1 ring-amber-300/60',
      )}
    >
      <div className="relative p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <Badge className={style.badge}>{question.question_type.replace('_', ' ')}</Badge>
              {question.is_ai_generated && (
                <Badge className="bg-brand-soft-light text-brand-primary ring-1 ring-brand-cream">
                  <Sparkles className="mr-1 inline h-3 w-3" /> AI Question
                </Badge>
              )}
              {question.is_required && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-slate">Required</span>
              )}
            </div>
            <p className="text-[15px] font-medium leading-relaxed text-brand-navy">{question.question_text}</p>
          </div>
          {onDelete && (
            <Button variant="ghost" size="sm" className="shrink-0 opacity-50 group-hover:opacity-100" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>

        <div className="rounded-xl bg-brand-soft-light p-4 ring-1 ring-brand-cream">
          {isFiller && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Generic filler detected — clear this field or click AI Suggest for a real benchmark.
            </p>
          )}
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
              Benchmark answer (for AI scoring) {missing && <span className="text-amber-600">*</span>}
            </label>
            {onGenerateAi && (
              <button
                type="button"
                onClick={onGenerateAi}
                disabled={generatingAi}
                title="Generate answer with AI"
                className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generatingAi ? 'Generating...' : 'AI Suggest'}
              </button>
            )}
          </div>

          {/* Quick-pick helpers (optional) — clicking fills the free-text box below */}
          {question.question_type === 'rating' && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {Array.from(
                { length: (question.rating_max || 5) - (question.rating_min || 1) + 1 },
                (_, i) => i + (question.rating_min || 1),
              ).map((v) => {
                const label = question.rating_labels?.[String(v)];
                const value = label ? `${v} — ${label}` : String(v);
                const selected = expectedAnswer.trim() === value || expectedAnswer.trim() === String(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onAnswerChange(value)}
                    className={cn(
                      'flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-3 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'bg-white text-brand-navy ring-1 ring-brand-cream hover:ring-brand-primary/40',
                    )}
                    title={label || undefined}
                  >
                    {v}
                  </button>
                );
              })}
              <span className="text-xs text-brand-slate">Tap to fill, or type below</span>
            </div>
          )}

          {question.question_type === 'multi_select' && question.options && question.options.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {question.options.map((opt) => {
                const selected = expectedAnswer.trim() === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onAnswerChange(opt)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'bg-white text-brand-navy ring-1 ring-brand-cream hover:ring-brand-primary/40',
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Free-text benchmark — always available for any question type */}
          <Textarea
            value={expectedAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={question.question_type === 'rating' || question.question_type === 'multi_select' ? 2 : 4}
            placeholder={
              question.question_type === 'rating'
                ? 'Pick a rating above or type the expected answer...'
                : question.question_type === 'multi_select'
                ? 'Pick an option above or type the expected answer...'
                : 'Type the expected benchmark answer here, or click AI Suggest...'
            }
            className="resize-y border-0 bg-white ring-1 ring-brand-cream focus:ring-brand-primary/40"
          />
        </div>
      </div>
    </article>
  );
}
