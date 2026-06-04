import { useId, useMemo, useState } from 'react'
import {
  INDUSTRY_OTHER,
  INDUSTRY_VERTICALS,
  type IndustryVerticalOption,
} from '../data/industry-verticals'
import { Input } from './ui'

interface Props {
  value: string
  otherDetail: string
  onChange: (value: string) => void
  onOtherDetailChange: (detail: string) => void
}

function matchesQuery(opt: IndustryVerticalOption, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    opt.label.toLowerCase().includes(q) ||
    opt.value.toLowerCase().includes(q) ||
    opt.description.toLowerCase().includes(q)
  )
}

export function IndustryVerticalField({
  value,
  otherDetail,
  onChange,
  onOtherDetailChange,
}: Props) {
  const listId = useId()
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => INDUSTRY_VERTICALS.filter((opt) => matchesQuery(opt, search)),
    [search],
  )

  const selected = INDUSTRY_VERTICALS.find((o) => o.value === value)

  return (
    <fieldset>
      <legend className="mb-1 block text-xs font-medium text-slate-600">
        Core industry vertical
      </legend>
      <p className="mb-3 text-xs text-slate-500">
        Search and select the sector that best describes the client. This drives AI taxonomy and
        assessment questions.
      </p>

      <label htmlFor={`${listId}-search`} className="sr-only">
        Search industry verticals
      </label>
      <input
        id={`${listId}-search`}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search industries…"
        className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        autoComplete="off"
      />

      {selected && (
        <p className="mb-2 text-xs text-slate-600">
          Selected: <span className="font-medium text-indigo-700">{selected.label}</span>
        </p>
      )}

      <ul
        id={listId}
        role="listbox"
        aria-label="Core industry vertical"
        aria-activedescendant={value ? `${listId}-opt-${value}` : undefined}
        className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-inner"
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-slate-500">No matching industries</li>
        ) : (
          filtered.map((opt) => {
            const isSelected = value === opt.value
            return (
              <li
                key={opt.value}
                id={`${listId}-opt-${opt.value}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                className={`cursor-pointer rounded-md px-3 py-2.5 outline-none transition ${
                  isSelected
                    ? 'bg-indigo-50 ring-1 ring-indigo-600/30'
                    : 'hover:bg-slate-50 focus:bg-slate-50'
                }`}
                onClick={() => onChange(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onChange(opt.value)
                  }
                }}
              >
                <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{opt.description}</span>
              </li>
            )
          })
        )}
      </ul>

      {value === INDUSTRY_OTHER && (
        <Input
          label="Describe your industry vertical"
          required
          className="mt-3"
          placeholder="e.g. AgriTech — precision farming & crop analytics"
          value={otherDetail}
          onChange={(e) => onOtherDetailChange(e.target.value)}
        />
      )}
    </fieldset>
  )
}
