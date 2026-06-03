import { Check, Building2, Search, FileUp, MessageSquareText, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}

interface AssessmentStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  maxAccessibleStep: number;
}

export function AssessmentStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  maxAccessibleStep,
}: AssessmentStepperProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm">
      <div className="h-1 bg-brand-cream">
        <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${Math.max(progress, 8)}%` }} />
      </div>
      <div className="flex items-stretch divide-x divide-brand-cream overflow-x-auto">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isAccessible = step.id <= maxAccessibleStep;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isAccessible}
              onClick={() => isAccessible && onStepClick(step.id)}
              className={cn(
                'flex min-w-[120px] flex-1 flex-col items-center gap-2 px-3 py-4 transition-all sm:min-w-0',
                isAccessible ? 'cursor-pointer hover:bg-brand-soft-light' : 'cursor-not-allowed opacity-40',
                isCurrent && 'bg-brand-soft-light',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                  isCompleted && 'bg-brand-primary text-white',
                  isCurrent && !isCompleted && 'bg-brand-navy text-white',
                  !isCurrent && !isCompleted && 'bg-brand-cream text-brand-slate',
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="text-center">
                <p className={cn('text-xs font-semibold', isCurrent ? 'text-brand-primary' : 'text-brand-navy')}>
                  {step.label}
                </p>
                <p className="hidden text-[10px] text-brand-slate sm:block">{step.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ASSESSMENT_WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Client Info', subtitle: 'Company profile', icon: Building2 },
  { id: 2, label: 'Deep Research', subtitle: 'AI analysis', icon: Search },
  { id: 3, label: 'Documents', subtitle: 'Optional files', icon: FileUp },
  { id: 4, label: 'Questions', subtitle: 'Set answers', icon: MessageSquareText },
  { id: 5, label: 'Review', subtitle: 'Assign rep', icon: UserCheck },
];
