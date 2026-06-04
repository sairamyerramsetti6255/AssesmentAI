import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'navy' | 'primary' | 'slate' | 'cream';
  subtext?: string;
}

const ICON_BG: Record<string, string> = {
  navy: 'bg-brand-navy text-white',
  primary: 'bg-brand-primary text-white',
  slate: 'bg-brand-slate text-white',
  cream: 'bg-brand-cream text-brand-navy',
};

const ACCENT_BAR: Record<string, string> = {
  navy: 'before:bg-brand-navy',
  primary: 'before:bg-brand-primary',
  slate: 'before:bg-brand-slate',
  cream: 'before:bg-brand-cream',
};

export function StatCard({ label, value, icon: Icon, accent = 'primary', subtext }: StatCardProps) {
  return (
    <div className={cn('stat-card-accent group', ACCENT_BAR[accent])}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 pl-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-slate">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">{value}</p>
          {subtext && <p className="mt-1.5 text-xs text-brand-slate">{subtext}</p>}
        </div>
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm', ICON_BG[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
