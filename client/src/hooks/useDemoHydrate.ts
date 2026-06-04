import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isDemoMode } from '@/lib/demoMode';
import { ensureFullDemoPackage } from '@/lib/demoApi';

/** Pre-load demo deliverables when opening results / gap / proposal in demo mode. */
export function useDemoHydrate(assessmentId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!assessmentId || !isDemoMode()) return;
    let cancelled = false;
    ensureFullDemoPackage(assessmentId, api.getToken()).then(() => {
      if (cancelled) return;
      void qc.invalidateQueries({ queryKey: ['results', assessmentId] });
      void qc.invalidateQueries({ queryKey: ['gap-analysis', assessmentId] });
      void qc.invalidateQueries({ queryKey: ['poc', assessmentId] });
      void qc.invalidateQueries({ queryKey: ['proposal', assessmentId] });
    });
    return () => {
      cancelled = true;
    };
  }, [assessmentId, qc]);
}
