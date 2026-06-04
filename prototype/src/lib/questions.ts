import type { AssessmentQuestion, MandatoryQuestion, TaxonomyPillar } from '../types'
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

/** Prepend admin mandatory questions before all other assessment questions */
export function mergeMandatoryQuestions(
  generated: AssessmentQuestion[],
  mandatory: MandatoryQuestion[],
): AssessmentQuestion[] {
  if (mandatory.length === 0) return normalizeSortOrder(generated)
  const optional = stripMandatoryFromAssessment(generated, mandatory)
  const prefix = mandatory.map((mq, i) => ({
    ...mandatoryToAssessmentQuestion(mq),
    sortOrder: i,
  }))
  const rest = optional.map((q, i) => ({
    ...q,
    isMandatory: false,
    sortOrder: mandatory.length + i,
  }))
  return normalizeSortOrder([...prefix, ...rest])
}

export function syncAssessmentWithMandatory(
  questions: AssessmentQuestion[],
  mandatory: MandatoryQuestion[],
): AssessmentQuestion[] {
  return mergeMandatoryQuestions(stripMandatoryFromAssessment(questions, mandatory), mandatory)
}

export function newBlankQuestion(sortOrder: number): AssessmentQuestion {
  return normalizeQuestion({
    id: `q-new-${Date.now()}`,
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
