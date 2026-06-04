import { useEffect, useState } from 'react'
import { OTHER_OPTION, ensureChoiceOptions } from '../lib/question-types'
import { Button } from './ui'

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}

/** Options stored without "Other" — Other is appended on save for client portal */
export function stripOtherFromOptions(options?: string[]): string[] {
  return (options ?? []).filter((o) => o !== OTHER_OPTION)
}

interface Props {
  /** Change when switching questions so local state resets */
  questionId?: string
  options: string[]
  onChange: (options: string[]) => void
  readOnly?: boolean
}

export function AnswerOptionsEditor({ questionId, options, onChange, readOnly }: Props) {
  const [rows, setRows] = useState(() => stripOtherFromOptions(options))
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    setRows(stripOtherFromOptions(options))
    setNewOption('')
  }, [questionId, options.join('\x00')])

  const commit = (next: string[]) => {
    const base = next
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== OTHER_OPTION)
    onChange(ensureChoiceOptions(base))
  }

  const add = () => {
    const trimmed = newOption.trim()
    if (!trimmed || rows.includes(trimmed)) return
    const next = [...rows, trimmed]
    setRows(next)
    setNewOption('')
    commit(next)
  }

  if (readOnly) {
    return (
      <ul className="space-y-1 text-sm text-slate-700">
        {rows.map((o) => (
          <li key={o}>• {o}</li>
        ))}
        <li className="text-slate-500">• {OTHER_OPTION} (always included for clients)</li>
      </ul>
    )
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-slate-600">Answer options</span>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">No options yet — add at least one below.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((opt, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                value={opt}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = e.target.value
                  setRows(next)
                }}
                onBlur={() => commit(rows)}
              />
              <button
                type="button"
                title="Remove option"
                className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => {
                  const next = rows.filter((_, j) => j !== i)
                  setRows(next)
                  commit(next)
                }}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          placeholder="Add new option…"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button type="button" variant="secondary" className="shrink-0 !text-xs" onClick={add}>
          Add option
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Edit each option, then click outside the field to save. <strong>Other</strong> is added
        automatically for clients.
      </p>
    </div>
  )
}
