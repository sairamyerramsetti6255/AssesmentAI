import { Question } from '@/lib/api';
import { Badge } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            {question.options && question.options.length > 0 && (
              <p className="mt-2 text-xs text-brand-slate">Options: {question.options.join(' · ')}</p>
            )}
          </div>
          {onDelete && (
            <Button variant="ghost" size="sm" className="shrink-0 opacity-50 group-hover:opacity-100" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>

        <div className="rounded-xl bg-brand-soft-light p-4 ring-1 ring-brand-cream">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
              Expected Answer {missing && <span className="text-amber-600">*</span>}
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
          <Textarea
            value={expectedAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={4}
            placeholder="Type your expected benchmark answer here, or click AI Suggest..."
            className="min-h-[100px] resize-y border-0 bg-white ring-1 ring-brand-cream focus:ring-brand-primary/40"
          />
        </div>
      </div>
    </article>
  );
}
