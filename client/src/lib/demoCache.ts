import type { GapAnalysis, PocPlan, Proposal, Question, Score } from './api';

export interface DemoAssessmentBundle {
  companyName: string;
  industryName?: string;
  research_notes?: string;
  pain_point_ids?: string[];
  questions?: Question[];
  score?: Score;
  gap?: GapAnalysis;
  poc?: PocPlan;
  proposal?: Proposal;
}

const prefix = 'assessment-demo:';

export function loadDemoBundle(assessmentId: string): DemoAssessmentBundle | null {
  try {
    const raw = sessionStorage.getItem(prefix + assessmentId);
    if (!raw) return null;
    return JSON.parse(raw) as DemoAssessmentBundle;
  } catch {
    return null;
  }
}

export function saveDemoBundle(assessmentId: string, patch: Partial<DemoAssessmentBundle>) {
  const prev = loadDemoBundle(assessmentId) || { companyName: 'Demo Client' };
  sessionStorage.setItem(prefix + assessmentId, JSON.stringify({ ...prev, ...patch }));
}

export function getDemoCompanyName(assessmentId: string, fallback = 'Your Organization'): string {
  return loadDemoBundle(assessmentId)?.companyName || fallback;
}
