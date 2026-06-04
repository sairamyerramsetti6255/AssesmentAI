import { isDemoMode } from '@/lib/demoMode';
import { Sparkles } from 'lucide-react';

/** Subtle indicator that the app uses frontend sample data instead of Gemini. */
export function DemoModeBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900">
      <Sparkles className="mr-1 inline h-3 w-3" />
      Demo mode — rich sample data fills research, scores, gap analysis, PoC, and proposals (no live AI).
    </div>
  );
}
