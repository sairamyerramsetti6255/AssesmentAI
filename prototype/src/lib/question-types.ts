import type { AssessmentQuestion } from '../types'

export const OTHER_OPTION = 'Other'

export type NormalizedInputType = 'singlechoice' | 'multichoice' | 'scale' | 'text'

/** Map legacy + new types to client input widget */
export function normalizeInputType(type: AssessmentQuestion['type']): NormalizedInputType {
  switch (type) {
    case 'singlechoice':
      return 'singlechoice'
    case 'multichoice':
    case 'multiselect':
      return 'multichoice'
    case 'scale':
    case 'slider':
    case 'rating':
      return 'scale'
    case 'text':
    case 'richtext':
      return 'text'
    default:
      return 'multichoice'
  }
}

export function isChoiceType(type: AssessmentQuestion['type']): boolean {
  const n = normalizeInputType(type)
  return n === 'singlechoice' || n === 'multichoice'
}

/** Ensure client always has an Other escape hatch */
export function ensureChoiceOptions(options?: string[]): string[] {
  const base = (options ?? []).filter((o) => o && o !== OTHER_OPTION)
  return [...base, OTHER_OPTION]
}

export function normalizeQuestion(q: AssessmentQuestion): AssessmentQuestion {
  const inputType = normalizeInputType(q.type)
  const type =
    inputType === 'singlechoice'
      ? 'singlechoice'
      : inputType === 'multichoice'
        ? 'multichoice'
        : inputType === 'scale'
          ? 'scale'
          : 'text'

  return {
    ...q,
    type: type as AssessmentQuestion['type'],
    options: isChoiceType(type) ? ensureChoiceOptions(q.options) : q.options,
  }
}

export function normalizeQuestions(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  return questions.map(normalizeQuestion)
}

export function inputTypeLabel(type: AssessmentQuestion['type']): string {
  const labels: Record<NormalizedInputType, string> = {
    singlechoice: 'Pick one (includes Other)',
    multichoice: 'Pick any that apply (includes Other)',
    scale: 'Scale 1–10',
    text: 'Written response',
  }
  return labels[normalizeInputType(type)]
}
