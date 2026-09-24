import type { AssessmentQuestion, AssessmentTaxonomy, MandatoryQuestion, TaxonomyPillar } from '../types'

/** Ensure taxonomy arrays exist — API/DB may return partial objects after AI retry. */
export function normalizeAssessmentTaxonomy(
  taxonomy?: Partial<AssessmentTaxonomy> | Record<string, unknown> | null,
): AssessmentTaxonomy | undefined {
  if (!taxonomy || typeof taxonomy !== 'object') return undefined
  const t = taxonomy as Record<string, unknown>
  return {
    userDomain: String(taxonomy.userDomain ?? t.user_domain ?? ''),
    technicalPainPoints: (taxonomy.technicalPainPoints ??
      t.technical_pain_points ??
      []) as string[],
    operationalPainAreas: (taxonomy.operationalPainAreas ??
      t.operational_pain_areas ??
      []) as string[],
    processImprovements: (taxonomy.processImprovements ??
      t.process_improvements ??
      []) as string[],
  }
}
import { OTHER_OPTION, ensureChoiceOptions, normalizeQuestion } from './question-types'

export function sortQuestions(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  return [...questions].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function normalizeSortOrder(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  return sortQuestions(questions)
    .map((q, i) => normalizeQuestion({ ...q, sortOrder: i }))
}

export function mandatoryIds(mandatory: MandatoryQuestion[]): Set<string> {
  return new Set(mandatory.map((m) => m.id))
}

/** Strip "Other" for admin storage */
export function mandatoryOptionsFromAssessment(options?: string[]): string[] {
  return (options ?? []).filter((o) => o && o !== OTHER_OPTION)
}

export function stripMandatoryFromAssessment(
  questions: AssessmentQuestion[],
  mandatory: MandatoryQuestion[],
): AssessmentQuestion[] {
  const ids = mandatoryIds(mandatory)
  return questions.filter((q) => !ids.has(q.id))
}

export function pillarToCategory(pillar: TaxonomyPillar): AssessmentQuestion['category'] {
  switch (pillar) {
    case 'Technical Pain Points':
      return 'Technology Stack'
    case 'Non-Technical / Operational Pain Areas':
      return 'Governance & Compliance'
    case 'Process Improvements':
      return 'Operational Efficiency'
  }
}

export function mandatoryToAssessmentQuestion(mq: MandatoryQuestion): AssessmentQuestion {
  return normalizeQuestion({
    id: mq.id,
    sortOrder: 0,
    isMandatory: true,
    taxonomyPillar: 'Non-Technical / Operational Pain Areas',
    domainContext: 'Mandatory baseline',
    category: 'Governance & Compliance',
    text: mq.text,
    type: mq.type,
    options: mq.options.length ? ensureChoiceOptions(mq.options) : undefined,
    suggestedOptions: [],
  })
}

/** Place each mandatory question between AI-generated questions. */
export function interleaveMandatory<T>(generated: T[], mandatory: T[]): T[] {
  if (!mandatory.length) return generated
  if (!generated.length) return mandatory
  const out: T[] = []
  const gap = (generated.length + mandatory.length) / mandatory.length
  let nextAt = Math.max(1, Math.round(gap / 2))
  let generatedIndex = 0
  let mandatoryIndex = 0
  while (generatedIndex < generated.length || mandatoryIndex < mandatory.length) {
    const placeMandatory =
      mandatoryIndex < mandatory.length &&
      (generatedIndex >= generated.length || out.length >= nextAt)
    if (placeMandatory) {
      out.push(mandatory[mandatoryIndex])
      mandatoryIndex += 1
      nextAt += Math.max(2, Math.round(gap))
      continue
    }
    out.push(generated[generatedIndex])
    generatedIndex += 1
  }
  return out
}

/** Mix admin mandatory questions through the AI-generated assessment questions */
export function mergeMandatoryQuestions(
  generated: AssessmentQuestion[],
  mandatory: MandatoryQuestion[],
): AssessmentQuestion[] {
  if (mandatory.length === 0) return normalizeSortOrder(generated)
  const optional = stripMandatoryFromAssessment(generated, mandatory).map((q) => ({
    ...q,
    isMandatory: false,
  }))
  const required = mandatory.map((mq) => mandatoryToAssessmentQuestion(mq))
  return normalizeSortOrder(interleaveMandatory(optional, required))
}

export function syncAssessmentWithMandatory(
  questions: AssessmentQuestion[],
  mandatory: MandatoryQuestion[],
): AssessmentQuestion[] {
  return mergeMandatoryQuestions(stripMandatoryFromAssessment(questions, mandatory), mandatory)
}

export function newBlankQuestion(sortOrder: number): AssessmentQuestion {
  return normalizeQuestion({
    id: crypto.randomUUID(),
    sortOrder,
    isMandatory: false,
    taxonomyPillar: 'Technical Pain Points',
    domainContext: '',
    category: 'Technology Stack',
    text: 'New assessment question',
    type: 'multichoice',
    options: ensureChoiceOptions(['Option A', 'Option B']),
    suggestedOptions: [],
  })
}
