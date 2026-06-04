import type { AssessmentQuestion } from '../types'
import { OTHER_OPTION, normalizeInputType } from '../lib/question-types'

export interface AnswerState {
  answers: Record<string, string | number | string[]>
  otherText: Record<string, string>
  richtext: Record<string, string>
}

interface Props {
  question: AssessmentQuestion
  state: AnswerState
  onChange: (patch: Partial<AnswerState>) => void
  /** Dark portal theme — matches client portal background */
  variant?: 'default' | 'portal'
  /** Fixed-height portal panel — expand short controls to fill space */
  stableLayout?: boolean
}

export function QuestionAnswerInput({
  question,
  state,
  onChange,
  variant = 'default',
  stableLayout = false,
}: Props) {
  const qid = question.id
  const inputType = normalizeInputType(question.type)
  const options = question.options ?? []
  const portal = variant === 'portal'

  const setAnswer = (value: string | number | string[]) => {
    onChange({ answers: { ...state.answers, [qid]: value } })
  }

  const setOther = (text: string) => {
    onChange({ otherText: { ...state.otherText, [qid]: text } })
  }

  const setRichtext = (text: string) => {
    onChange({ richtext: { ...state.richtext, [qid]: text } })
  }

  const showsOtherField = () => {
    const a = state.answers[qid]
    if (inputType === 'singlechoice') return a === OTHER_OPTION
    if (inputType === 'multichoice') return Array.isArray(a) && a.includes(OTHER_OPTION)
    return false
  }

  const choiceClass = (on: boolean) => {
    if (portal) {
      return on
        ? 'border-violet-400 bg-violet-600/35 text-white'
        : 'border-slate-600 bg-slate-800/60 text-slate-200 hover:border-violet-500/50'
    }
    return on
      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
  }

  const fieldClass = portal
    ? 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500'
    : 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

  if (inputType === 'scale') {
    const max = question.type === 'rating' ? 5 : 10
    const val = Number(state.answers[qid] ?? Math.ceil(max / 2))
    return (
      <div
        className={
          stableLayout
            ? 'flex min-h-[20rem] flex-col justify-center rounded-lg bg-slate-50/80 px-2 py-6'
            : portal
              ? 'rounded-lg bg-slate-800/50 p-4'
              : ''
        }
      >
        <input
          type="range"
          min={1}
          max={max}
          value={val}
          className={`w-full ${portal ? 'portal-range' : 'accent-indigo-600'}`}
          onChange={(e) => setAnswer(Number(e.target.value))}
        />
        <p
          className={`mt-3 text-center text-lg font-semibold ${
            portal ? 'text-violet-300' : 'text-indigo-700'
          }`}
        >
          {val} <span className="text-sm font-normal opacity-70">/ {max}</span>
        </p>
        {stableLayout && (
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Low</span>
            <span>High</span>
          </div>
        )}
      </div>
    )
  }

  if (inputType === 'text') {
    return (
      <textarea
        className={`${fieldClass} ${stableLayout ? 'min-h-[20rem] resize-none' : ''}`}
        rows={stableLayout ? 10 : 5}
        placeholder="Type your answer here…"
        value={state.richtext[qid] ?? ''}
        onChange={(e) => setRichtext(e.target.value)}
      />
    )
  }

  if (inputType === 'singlechoice') {
    const selected = state.answers[qid] as string | undefined
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${choiceClass(selected === opt)}`}
          >
            <input
              type="radio"
              name={qid}
              checked={selected === opt}
              onChange={() => setAnswer(opt)}
              className={portal ? 'accent-violet-500' : ''}
            />
            {opt}
          </label>
        ))}
        {showsOtherField() && (
          <input
            className={fieldClass}
            placeholder="Please specify…"
            value={state.otherText[qid] ?? ''}
            onChange={(e) => setOther(e.target.value)}
          />
        )}
      </div>
    )
  }

  const selected = (state.answers[qid] as string[]) ?? []
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const on = selected.includes(opt)
        return (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${choiceClass(on)}`}
          >
            <input
              type="checkbox"
              checked={on}
              className={portal ? 'accent-violet-500' : ''}
              onChange={() => {
                const next = on ? selected.filter((x) => x !== opt) : [...selected, opt]
                setAnswer(next)
              }}
            />
            {opt}
          </label>
        )
      })}
      {showsOtherField() && (
        <input
          className={fieldClass}
          placeholder="Please specify…"
          value={state.otherText[qid] ?? ''}
          onChange={(e) => setOther(e.target.value)}
        />
      )}
    </div>
  )
}
