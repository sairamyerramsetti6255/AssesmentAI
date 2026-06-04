import { API_BASE_URL } from './config';
import type {
  Assessment,
  GapAnalysis,
  PocPlan,
  Proposal,
  Question,
  Results,
  Score,
} from './api';
import { loadDemoBundle, saveDemoBundle } from './demoCache';
import {
  DEMO_DRIVERS,
  buildDemoChatReply,
  buildDemoGap,
  buildDemoPoc,
  buildDemoProposal,
  buildDemoQuestions,
  buildDemoResearch,
  buildDemoResults,
  buildDemoScore,
  DEMO_TRANSCRIPT,
} from './demoData';
import { parsePocContent } from './pocContent';

async function fetchAssessment(assessmentId: string, token: string | null): Promise<Assessment | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchDrivers(token: string | null): Promise<string[]> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/masters/drivers`, { headers });
    if (!res.ok) return DEMO_DRIVERS.map((d) => d.id);
    const drivers = (await res.json()) as Array<{ id: string }>;
    return drivers.length ? drivers.map((d) => d.id) : DEMO_DRIVERS.map((d) => d.id);
  } catch {
    return DEMO_DRIVERS.map((d) => d.id);
  }
}

export async function resolveDemoContext(
  assessmentId: string,
  token: string | null,
  companyFallback?: string,
): Promise<{ companyName: string; industryName: string }> {
  const cached = loadDemoBundle(assessmentId);
  if (cached?.companyName) {
    return { companyName: cached.companyName, industryName: cached.industryName || 'Financial Services' };
  }
  const a = await fetchAssessment(assessmentId, token);
  const companyName = a?.client?.company_name || companyFallback || 'Demo Client';
  const industryName = a?.client?.industry_name || 'Financial Services';
  saveDemoBundle(assessmentId, { companyName, industryName });
  return { companyName, industryName };
}

export async function ensureFullDemoPackage(assessmentId: string, token: string | null): Promise<void> {
  const bundle = loadDemoBundle(assessmentId);
  if (bundle?.score && bundle?.gap && bundle?.poc && bundle?.proposal) return;

  const { companyName } = await resolveDemoContext(assessmentId, token);
  const driverIds = await fetchDrivers(token);
  const questions = bundle?.questions?.length
    ? bundle.questions
    : buildDemoQuestions(assessmentId, driverIds, companyName);
  const score = buildDemoScore(companyName, questions);
  const gap = buildDemoGap();
  const poc = buildDemoPoc(companyName);
  const proposal = buildDemoProposal(companyName, score, gap);

  saveDemoBundle(assessmentId, {
    companyName,
    questions,
    score,
    gap,
    poc,
    proposal,
  });
}

export async function demoGenerateAll(assessmentId: string, token: string | null) {
  const { companyName, industryName } = await resolveDemoContext(assessmentId, token);
  const research = buildDemoResearch(companyName, industryName);
  const driverIds = await fetchDrivers(token);
  const questions = buildDemoQuestions(assessmentId, driverIds, companyName);
  saveDemoBundle(assessmentId, {
    companyName,
    industryName,
    research_notes: research.research_notes,
    pain_point_ids: research.pain_point_ids,
    questions,
  });
  return {
    research_notes: research.research_notes,
    pain_point_ids: research.pain_point_ids,
    questions,
  };
}

export async function demoGenerateQuestions(assessmentId: string, token: string | null) {
  const { companyName } = await resolveDemoContext(assessmentId, token);
  const driverIds = await fetchDrivers(token);
  const questions = buildDemoQuestions(assessmentId, driverIds, companyName);
  saveDemoBundle(assessmentId, { companyName, questions });
  return questions;
}

export function demoExpectedAnswer(questionText: string): { expected_answer: string } {
  return {
    expected_answer: `Benchmark: mature organizations demonstrate clear ownership, measurable KPIs, and documented standards for “${questionText.slice(0, 60)}…”.`,
  };
}

export function demoAllBenchmarks(assessmentId: string): { updated: number } {
  const bundle = loadDemoBundle(assessmentId);
  if (!bundle?.questions?.length) return { updated: 0 };
  const updated = bundle.questions.map((q) => ({
    ...q,
    expected_answer:
      q.expected_answer ||
      `Expected mature response: documented process, named owner, and KPI tracking for this topic.`,
  }));
  saveDemoBundle(assessmentId, { questions: updated });
  return { updated: updated.length };
}

export async function demoGeneratePackage(assessmentId: string, token: string | null) {
  await ensureFullDemoPackage(assessmentId, token);
  const b = loadDemoBundle(assessmentId)!;
  return {
    score: b.score!,
    gap: b.gap!,
    poc: b.poc!,
    proposal: b.proposal!,
  };
}

export async function demoGetResults(assessmentId: string, token: string | null): Promise<Results> {
  await ensureFullDemoPackage(assessmentId, token);
  const b = loadDemoBundle(assessmentId)!;
  const questions = b.questions || buildDemoQuestions(assessmentId, DEMO_DRIVERS.map((d) => d.id));
  return buildDemoResults(assessmentId, b.companyName, questions);
}

export async function demoGetGap(assessmentId: string, token: string | null): Promise<GapAnalysis> {
  await ensureFullDemoPackage(assessmentId, token);
  return loadDemoBundle(assessmentId)!.gap!;
}

export async function demoGetPoc(assessmentId: string, token: string | null): Promise<PocPlan> {
  await ensureFullDemoPackage(assessmentId, token);
  return loadDemoBundle(assessmentId)!.poc!;
}

export async function demoGetProposal(assessmentId: string, token: string | null): Promise<Proposal> {
  await ensureFullDemoPackage(assessmentId, token);
  return loadDemoBundle(assessmentId)!.proposal!;
}

export async function demoGenerateGap(assessmentId: string, token: string | null): Promise<GapAnalysis> {
  await ensureFullDemoPackage(assessmentId, token);
  const gap = buildDemoGap();
  saveDemoBundle(assessmentId, { gap });
  return gap;
}

export async function demoGeneratePoc(assessmentId: string, token: string | null): Promise<PocPlan> {
  const { companyName } = await resolveDemoContext(assessmentId, token);
  const poc = buildDemoPoc(companyName);
  saveDemoBundle(assessmentId, { poc });
  return poc;
}

export async function demoGenerateProposal(assessmentId: string, token: string | null): Promise<Proposal> {
  await ensureFullDemoPackage(assessmentId, token);
  const b = loadDemoBundle(assessmentId)!;
  const proposal = buildDemoProposal(b.companyName, b.score!, b.gap!);
  saveDemoBundle(assessmentId, { proposal });
  return proposal;
}

export async function demoScoreAssessment(assessmentId: string, token: string | null): Promise<Score> {
  await ensureFullDemoPackage(assessmentId, token);
  return loadDemoBundle(assessmentId)!.score!;
}

export function demoTranscribe(): { transcript: string } {
  return { transcript: DEMO_TRANSCRIPT };
}

export async function demoChat(message: string, assessmentId: string | undefined, token: string | null) {
  const companyName = assessmentId
    ? (await resolveDemoContext(assessmentId, token)).companyName
    : undefined;
  return { message: { content: buildDemoChatReply(message, companyName) } };
}

/** Merge server questions with demo benchmarks when server has empty expected_answer */
export function mergeDemoQuestions(assessmentId: string, serverQuestions: Question[]): Question[] {
  const cached = loadDemoBundle(assessmentId)?.questions;
  if (!cached?.length) return serverQuestions;
  if (!serverQuestions.length) return cached;
  const byOrder = new Map(cached.map((q) => [q.display_order, q]));
  return serverQuestions.map((q, i) => {
    const demo = byOrder.get(q.display_order) || cached[i];
    if (!demo) return q;
    return {
      ...q,
      expected_answer: q.expected_answer?.trim() ? q.expected_answer : demo.expected_answer,
      question_text: q.question_text || demo.question_text,
    };
  });
}

export function getDemoResearchForForm(assessmentId: string) {
  return loadDemoBundle(assessmentId);
}

export function pocHasRenderableContent(poc: PocPlan | null | undefined): boolean {
  if (!poc) return false;
  return Boolean(parsePocContent(poc.content));
}
