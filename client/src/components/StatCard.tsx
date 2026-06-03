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

export function StatCard({ label, value, icon: Icon, accent = 'primary', subtext }: StatCardProps) {
  return (
    <div className="glass-card group p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-slate">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-brand-navy">{value}</p>
          {subtext && <p className="mt-1 text-xs text-brand-slate">{subtext}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', ICON_BG[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
