import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Assessment } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Circle, Loader2, ClipboardList, UserPlus, Mic, BarChart3, Target, FileText,
  Sparkles, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AssessmentDeliverablesRoadmapProps {
  assessmentId: string;
  assessment?: Assessment | null;
  highlight?: 'assign' | 'session' | 'results' | 'gap' | 'proposal';
  className?: string;
  /** Hide title row when embedded under another header */
  compact?: boolean;
}

type StepState = 'done' | 'current' | 'upcoming' | 'blocked';

const STEP_META: Record<
  'prepare' | 'assign' | 'session' | 'results' | 'gap' | 'proposal',
  { short: string; icon: LucideIcon }
> = {
  prepare: { short: 'Prepare', icon: ClipboardList },
  assign: { short: 'Assign rep', icon: UserPlus },
  session: { short: 'Live session', icon: Mic },
  results: { short: 'Results', icon: BarChart3 },
  gap: { short: 'Gap analysis', icon: Target },
  proposal: { short: 'Proposal', icon: FileText },
};

function StepDot({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />;
  if (state === 'current') return <Circle className="h-3.5 w-3.5 shrink-0 fill-brand-primary text-brand-primary" />;
  return <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />;
}

/** Compact horizontal post-approve pipeline (assign → session → results → gap → proposal). */
export function AssessmentDeliverablesRoadmap({
  assessmentId,
  assessment: assessmentProp,
  highlight,
  className,
  compact = false,
}: AssessmentDeliverablesRoadmapProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isManager = user?.role_name === 'super_admin' || user?.role_name === 'sales_manager';

  const { data: assessmentFetched } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => api.getAssessment(assessmentId),
    enabled: !!assessmentId && !assessmentProp,
  });
  const assessment = assessmentProp ?? assessmentFetched;

  const { data: results } = useQuery({
    queryKey: ['results', assessmentId],
    queryFn: () => api.getResults(assessmentId),
    enabled: !!assessmentId,
  });
  const { data: gap } = useQuery({
    queryKey: ['gap-analysis', assessmentId],
    queryFn: () => api.getGapAnalysis(assessmentId),
    enabled: !!assessmentId,
  });
  const { data: proposal } = useQuery({
    queryKey: ['proposal', assessmentId],
    queryFn: () => api.getProposal(assessmentId),
    enabled: !!assessmentId,
  });

  const demoMutation = useMutation({
    mutationFn: () => api.generateDemoPackage(assessmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment', assessmentId] });
      qc.invalidateQueries({ queryKey: ['results', assessmentId] });
      qc.invalidateQueries({ queryKey: ['gap-analysis', assessmentId] });
      qc.invalidateQueries({ queryKey: ['poc', assessmentId] });
      qc.invalidateQueries({ queryKey: ['proposal', assessmentId] });
    },
  });

  if (!assessment) return null;

  const hasScore = !!results?.score || ['scored', 'completed'].includes(assessment.status);
  const hasGap = !!gap;
  const hasProposal = !!proposal?.rendered_html?.trim();
  const isApproved = ['approved', 'assigned', 'in_session', 'scored', 'completed'].includes(assessment.status);
  const repAssigned = !!assessment.assigned_rep_id;

  const stepState = (key: 'prepare' | NonNullable<typeof highlight>): StepState => {
    if (key === 'prepare') {
      return isApproved ? 'done' : 'blocked';
    }
    if (key === 'assign') {
      if (!isApproved) return 'blocked';
      if (hasScore || repAssigned) return 'done';
      return highlight === 'assign' ? 'current' : 'upcoming';
    }
    if (key === 'session') {
      if (hasScore) return 'done';
      if (repAssigned && ['assigned', 'in_session'].includes(assessment.status)) return 'current';
      return isApproved ? 'upcoming' : 'blocked';
    }
    if (key === 'results') {
      if (hasScore) return highlight === 'results' ? 'current' : 'done';
      return isApproved ? 'upcoming' : 'blocked';
    }
    if (key === 'gap') {
      if (hasGap) return highlight === 'gap' ? 'current' : 'done';
      if (hasScore) return highlight === 'gap' ? 'current' : 'upcoming';
      return 'blocked';
    }
    if (key === 'proposal') {
      if (hasProposal) return highlight === 'proposal' ? 'current' : 'done';
      if (hasGap || hasScore) return highlight === 'proposal' ? 'current' : 'upcoming';
      return 'blocked';
    }
    return 'upcoming';
  };

  const steps: Array<{
    key: keyof typeof STEP_META;
    state: StepState;
    to: string | null;
  }> = [
    {
      key: 'prepare',
      state: stepState('prepare'),
      to: `/assessments/${assessmentId}`,
    },
    {
      key: 'assign',
      state: stepState('assign'),
      to: !repAssigned && isManager ? `/assessments/${assessmentId}?step=5` : null,
    },
    {
      key: 'session',
      state: stepState('session'),
      to:
        user?.role_name === 'sales_rep' && repAssigned && !hasScore
          ? `/assessments/${assessmentId}/session`
          : null,
    },
    {
      key: 'results',
      state: stepState('results'),
      to: hasScore ? `/assessments/${assessmentId}/results` : null,
    },
    {
      key: 'gap',
      state: stepState('gap'),
      to: hasScore ? `/assessments/${assessmentId}/gap-analysis` : null,
    },
    {
      key: 'proposal',
      state: stepState('proposal'),
      to: hasScore ? `/assessments/${assessmentId}/proposal` : null,
    },
  ];

  if (!isApproved) return null;

  const hint =
    !hasScore && isManager
      ? 'Assign rep or use Prepare demo — then Results → Gap Analysis → Generate proposal.'
      : hasScore && !hasGap
        ? 'Next: Gap Analysis → Generate analysis & PoC letter.'
        : hasGap && !hasProposal
          ? 'Next: Proposal page → Generate proposal.'
          : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-brand-cream bg-white shadow-sm',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className,
      )}
      aria-label="After approval demo path"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {!compact && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-slate">
            After approval — demo path
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {hint && (
            <p className="max-w-xl text-[11px] leading-snug text-brand-slate">{hint}</p>
          )}
          {isManager && !hasScore && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => demoMutation.mutate()}
              disabled={demoMutation.isPending}
            >
              {demoMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Demo package
            </Button>
          )}
        </div>
      </div>

      <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto pb-0.5">
        {steps.map((step, i) => {
          const meta = STEP_META[step.key];
          const Icon = meta.icon;
          const clickable = step.to != null && step.state !== 'blocked';
          const pill = (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                step.state === 'done' && 'bg-emerald-50 text-emerald-800',
                step.state === 'current' && 'bg-brand-primary text-white shadow-sm',
                step.state === 'upcoming' && 'bg-slate-50 text-slate-500',
                step.state === 'blocked' && 'bg-slate-50 text-slate-300',
                clickable && step.state !== 'current' && 'hover:bg-brand-cream hover:text-brand-navy',
              )}
              title={
                step.key === 'assign' && repAssigned
                  ? `Assigned to ${assessment.assigned_rep?.full_name || 'rep'}`
                  : step.key === 'gap'
                    ? 'Gaps, solutions, PoC letter'
                    : step.key === 'proposal'
                      ? hasProposal
                        ? 'Review and finalize'
                        : 'Generate proposal on that page'
                      : undefined
              }
            >
              <StepDot state={step.state === 'blocked' ? 'upcoming' : step.state} />
              <Icon className="h-3 w-3 shrink-0 opacity-80" />
              <span>{meta.short}</span>
            </div>
          );

          return (
            <li key={step.key} className="flex shrink-0 items-center">
              {clickable ? (
                <Link to={step.to!}>{pill}</Link>
              ) : (
                <span aria-current={step.state === 'current' ? 'step' : undefined}>{pill}</span>
              )}
              {i < steps.length - 1 && (
                <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      {demoMutation.isSuccess && (
        <p className="mt-1.5 text-[11px] text-emerald-700">Demo ready — open Gap analysis or Proposal above.</p>
      )}
    </div>
  );
}
