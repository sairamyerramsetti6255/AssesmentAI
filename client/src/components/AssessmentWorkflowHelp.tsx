import { ClipboardList, Mic, BarChart3 } from 'lucide-react';

/** Explains the two-phase assessment model (prepare vs live session). */
export function AssessmentWorkflowHelp({ role }: { role: 'manager' | 'rep' }) {
  if (role === 'rep') {
    return (
      <div className="rounded-2xl border border-brand-cream bg-brand-soft-light p-5 text-sm text-brand-navy">
        <p className="font-semibold">Your role: run the client call</p>
        <p className="mt-2 text-brand-slate">
          Your manager already generated questions and set <strong>benchmark answers</strong> for scoring.
          The live session is where you ask the client those questions and record their real responses (ratings, voice, text).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-cream bg-brand-soft-light p-5">
      <p className="text-sm font-semibold text-brand-navy">How this assessment works</p>
      <ol className="mt-3 space-y-3 text-sm text-brand-slate">
        <li className="flex gap-3">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
          <span>
            <strong className="text-brand-navy">You prepare (Steps 1–5):</strong> research, generate questions, and set{' '}
            <strong>benchmark answers</strong> — the ideal answers used later for AI scoring. These are not the client&apos;s answers.
          </span>
        </li>
        <li className="flex gap-3">
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
          <span>
            <strong className="text-brand-navy">Sales rep runs the live session:</strong> asks the client each question and records actual responses during the meeting.
          </span>
        </li>
        <li className="flex gap-3">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
          <span>
            <strong className="text-brand-navy">You review results:</strong> AI compares client answers to your benchmarks, then gap analysis and proposal.
          </span>
        </li>
      </ol>
    </div>
  );
}
