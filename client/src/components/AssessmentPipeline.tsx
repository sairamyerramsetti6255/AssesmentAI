import { Link } from 'react-router-dom';
import type { Assessment } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/utils';

const COLUMNS = [
  { key: 'draft', statuses: ['draft', 'client_info'], accent: 'border-t-brand-cream' },
  { key: 'prepare', statuses: ['pre_assessment'], accent: 'border-t-brand-slate' },
  { key: 'approved', statuses: ['approved'], accent: 'border-t-emerald-400' },
  { key: 'live', statuses: ['assigned', 'in_session'], accent: 'border-t-brand-primary' },
  { key: 'done', statuses: ['scored', 'completed'], accent: 'border-t-brand-navy' },
] as const;

const COLUMN_LABELS: Record<string, string> = {
  draft: 'Draft',
  prepare: 'Preparing',
  approved: 'Approved',
  live: 'Live',
  done: 'Complete',
};

export function AssessmentPipeline({ assessments }: { assessments: Assessment[] }) {
  return (
    <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = assessments.filter((a) =>
          col.statuses.includes(a.status as (typeof col.statuses)[number]),
        );
        return (
          <div
            key={col.key}
            className={`glass-card min-w-[220px] border-t-4 ${col.accent} flex flex-col`}
          >
            <div className="border-b border-brand-cream px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-navy">
                {COLUMN_LABELS[col.key]}
              </h3>
              <p className="text-[11px] text-brand-slate">{items.length} client{items.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-2 p-3">
              {items.map((a) => (
                <Link
                  key={a.id}
                  to={`/assessments/${a.id}`}
                  className="block rounded-xl bg-brand-soft-light/60 p-3.5 ring-1 ring-brand-cream transition-all hover:bg-white hover:shadow-sm hover:ring-brand-primary/35"
                >
                  <p className="text-sm font-semibold leading-snug text-brand-navy">
                    {a.client?.company_name || 'Draft'}
                  </p>
                  <p className="mt-1.5 text-[11px] text-brand-slate">
                    {STATUS_LABELS[a.status] || a.status}
                  </p>
                </Link>
              ))}
              {items.length === 0 && (
                <p className="py-8 text-center text-xs text-brand-slate/80">No items</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
