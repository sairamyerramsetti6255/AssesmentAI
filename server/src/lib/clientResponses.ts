import { requireSupabase } from './supabase.js';

function sb() {
  return requireSupabase();
}

function formatAnswerDisplay(
  answer: unknown,
  otherText?: string,
  richtext?: string,
): string {
  if (richtext?.trim()) return richtext.trim();
  if (answer === undefined || answer === null || answer === '') return '—';
  if (Array.isArray(answer)) {
    return answer
      .map((x) => (x === 'Other' && otherText ? `Other: ${otherText}` : String(x)))
      .join('; ');
  }
  return String(answer);
}

interface SyncInput {
  leadId: string;
  answers?: Record<string, unknown>;
  richtext?: Record<string, string>;
  otherText?: Record<string, string>;
  progress?: number;
  existingStartedAt?: string | null;
  /** Only true when the client explicitly submits — not on autosave/navigation */
  submitted?: boolean;
}

/** Upsert per-question rows and set assessment timestamps on the lead. */
export async function syncClientResponseRows(input: SyncInput): Promise<void> {
  const { leadId, answers, richtext, otherText, progress, existingStartedAt, submitted } = input;
  if (!answers && !richtext) return;

  const now = new Date().toISOString();
  const leadPatch: Record<string, unknown> = {
    client_assessment_updated_at: now,
    updated_at: now,
    last_interaction: now.slice(0, 10),
  };

  if (progress !== undefined && progress > 0 && !existingStartedAt) {
    leadPatch.client_assessment_started_at = now;
  }
  if (submitted === true) {
    leadPatch.client_assessment_submitted_at = now;
    leadPatch.client_progress = 100;
  } else if (progress !== undefined && progress < 100) {
    leadPatch.client_assessment_submitted_at = null;
  }

  try {
    await sb().from('leads').update(leadPatch).eq('id', leadId);
  } catch {
    /* optional columns — migration 007 may not be applied */
  }

  const { data: questions } = await sb()
    .from('prototype_questions')
    .select('id, text, taxonomy_pillar, type, sort_order')
    .eq('lead_id', leadId)
    .order('sort_order');

  if (!questions?.length) return;

  const answerMap = answers ?? {};
  const richtextMap = richtext ?? {};
  const otherMap = otherText ?? {};

  const rows = questions.map((q) => {
    const qid = q.id as string;
    const raw = answerMap[qid];
    const rich = richtextMap[qid];
    const other = otherMap[qid];
    return {
      lead_id: leadId,
      question_id: qid,
      question_text: q.text as string,
      taxonomy_pillar: (q.taxonomy_pillar as string) ?? '',
      response_type: (q.type as string) ?? 'text',
      answer_display: formatAnswerDisplay(raw, other, rich),
      answer_json: raw !== undefined ? raw : rich ? { richtext: rich } : null,
      sort_order: (q.sort_order as number) ?? 0,
      answered_at: now,
    };
  });

  try {
    await sb().from('prototype_client_responses').delete().eq('lead_id', leadId);
    const withAnswers = rows.filter(
      (r) => r.answer_display !== '—' || r.answer_json !== null,
    );
    if (withAnswers.length > 0) {
      await sb().from('prototype_client_responses').insert(withAnswers);
    }
  } catch {
    /* table may not exist until migration 007 */
  }
}

export async function getClientResponseRows(leadId: string) {
  try {
    const { data, error } = await sb()
      .from('prototype_client_responses')
      .select('*')
      .eq('lead_id', leadId)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
