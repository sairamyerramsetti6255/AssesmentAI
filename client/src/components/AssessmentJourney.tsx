import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  ClipboardList, Mic, BarChart3, Target, FileText,
  Check, ArrowRight, Loader2, PartyPopper,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FlowStage = 'prepare' | 'session' | 'results' | 'gap' | 'proposal';

interface StageDef {
  key: FlowStage;
  label: string;
  icon: LucideIcon;
  /** Path builder; null means the stage has no stable deep link from other pages */
  path: (id: string) => string | null;
}

const STAGES: StageDef[] = [
  { key: 'prepare', label: 'Prepare', icon: ClipboardList, path: (id) => `/assessments/${id}` },
  { key: 'session', label: 'Live Session', icon: Mic, path: () => null },
  { key: 'results', label: 'Results', icon: BarChart3, path: (id) => `/assessments/${id}/results` },
  { key: 'gap', label: 'Gap Analysis', icon: Target, path: (id) => `/assessments/${id}/gap-analysis` },
  { key: 'proposal', label: 'Proposal', icon: FileText, path: (id) => `/assessments/${id}/proposal` },
];

interface AssessmentJourneyProps {
  assessmentId: string;
  current: FlowStage;
  /** Stages the user is allowed to navigate to (role-aware). Defaults to all. */
  allowed?: FlowStage[];
  /** When set, only these stages are clickable (others stay visible but inactive). */
  unlocked?: FlowStage[];
}

/** Horizontal macro-pipeline showing where this assessment is in the end-to-end flow. */
export function AssessmentJourney({ assessmentId, current, allowed, unlocked }: AssessmentJourneyProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Assessment progress" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {STAGES.map((stage, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
          const Icon = state === 'done' ? Check : stage.icon;
          const href = stage.path(assessmentId);
          const isLocked = unlocked != null && !unlocked.includes(stage.key);
          const canNavigate =
            href != null &&
            state !== 'current' &&
            !isLocked &&
            (!allowed || allowed.includes(stage.key));

          const node = (
            <div
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                state === 'done' && 'bg-brand-soft-light text-brand-primary',
                state === 'current' && 'bg-brand-primary text-white shadow-sm',
                state === 'upcoming' && !isLocked && 'bg-slate-50 text-slate-400',
                state === 'upcoming' && isLocked && 'bg-slate-50 text-slate-300',
                canNavigate && 'hover:bg-brand-cream',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{stage.label}</span>
            </div>
          );

          return (
            <li key={stage.key} className="flex items-center gap-2">
              {canNavigate ? (
                <Link to={href!} aria-current={undefined}>{node}</Link>
              ) : (
                <span aria-current={state === 'current' ? 'step' : undefined}>{node}</span>
              )}
              {i < STAGES.length - 1 && (
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface NextStepBannerProps {
  title: string;
  description: string;
  /** Primary action: either a link target or a click handler */
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional secondary link (e.g. "Back to dashboard") */
  secondary?: { label: string; to: string };
  /** Renders a celebratory "complete" treatment */
  done?: boolean;
}

/** Prominent, consistent "what to do next" card shown at the end of each stage. */
export function NextStepBanner({
  title, description, actionLabel, to, onAction, loading, disabled, secondary, done,
}: NextStepBannerProps) {
  return (
    <div
      className={cn(
        'mt-8 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between',
        done
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-brand-cream bg-brand-soft-light',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            done ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-primary/10 text-brand-primary',
          )}
        >
          {done ? <PartyPopper className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-semibold text-brand-navy">{title}</p>
          <p className="mt-0.5 text-sm text-brand-slate">{description}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {secondary && (
          <Link to={secondary.to}>
            <Button variant="outline">{secondary.label}</Button>
          </Link>
        )}
        {actionLabel && (to || onAction) && (
          to ? (
            <Link to={to}>
              <Button disabled={disabled}>
                {actionLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button onClick={onAction} disabled={disabled || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {actionLabel}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
