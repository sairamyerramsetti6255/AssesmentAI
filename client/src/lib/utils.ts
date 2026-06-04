import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  client_info: 'Client Info',
  pre_assessment: 'Deep Research',
  assigned: 'Assigned',
  in_session: 'In Session',
  scored: 'Scored',
  completed: 'Completed',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-brand-cream text-brand-navy',
  approved: 'bg-emerald-50 text-emerald-800',
  client_info: 'bg-brand-soft-light text-brand-primary ring-1 ring-brand-cream',
  pre_assessment: 'bg-brand-soft-light text-brand-navy ring-1 ring-brand-cream',
  assigned: 'bg-brand-cream text-brand-primary',
  in_session: 'bg-brand-primary text-white',
  scored: 'bg-brand-slate text-white',
  completed: 'bg-brand-navy text-white',
};
