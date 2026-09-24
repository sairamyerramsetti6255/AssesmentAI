import { Link } from 'react-router-dom'

export type ChartSlice = {
  label: string
  value: number
  color: string
  to?: string
}

export function DonutChart({ slices, center }: { slices: ChartSlice[]; center?: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e0da" strokeWidth="16" />
        {total > 0 &&
          slices.map((slice) => {
            const length = (slice.value / total) * circumference
            const node = (
              <circle
                key={slice.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              />
            )
            offset += length
            return node
          })}
        <text x="60" y="58" textAnchor="middle" fill="#061628" fontSize="18" fontWeight="650">
          {center ?? String(total)}
        </text>
        <text x="60" y="74" textAnchor="middle" fill="#78716c" fontSize="8">
          total
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice) => {
          const pct = total ? Math.round((slice.value / total) * 100) : 0
          const row = (
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="truncate text-pbs-800">{slice.label}</span>
              </span>
              <span className="shrink-0 text-stone-500">
                {slice.value} · {pct}%
              </span>
            </span>
          )
          return (
            <li key={slice.label}>
              {slice.to ? (
                <Link to={slice.to} className="block rounded-md px-1 py-0.5 hover:bg-pbs-50">
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function BarChart({ slices }: { slices: ChartSlice[] }) {
  const max = Math.max(...slices.map((slice) => slice.value), 1)
  if (!slices.length) return <p className="text-sm text-stone-500">No data yet.</p>
  return (
    <div className="space-y-3">
      {slices.map((slice) => {
        const width = `${Math.max(4, (slice.value / max) * 100)}%`
        const bar = (
          <div>
            <div className="mb-1 flex justify-between gap-3 text-xs">
              <span className="truncate font-medium text-pbs-800">{slice.label}</span>
              <span className="shrink-0 text-stone-500">{slice.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full" style={{ width, background: slice.color }} />
            </div>
          </div>
        )
        return slice.to ? (
          <Link key={slice.label} to={slice.to} className="block rounded-md hover:bg-pbs-50">
            {bar}
          </Link>
        ) : (
          <div key={slice.label}>{bar}</div>
        )
      })}
    </div>
  )
}

export function ColumnChart({ slices }: { slices: ChartSlice[] }) {
  const max = Math.max(...slices.map((slice) => slice.value), 1)
  if (!slices.length) return <p className="text-sm text-stone-500">No data yet.</p>
  return (
    <div className="flex h-44 items-end gap-2">
      {slices.map((slice) => {
        const height = `${Math.max(6, (slice.value / max) * 100)}%`
        const column = (
          <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-medium text-pbs-800">{slice.value}</span>
            <div className="flex w-full flex-1 items-end">
              <div className="w-full rounded-t-md" style={{ height, background: slice.color }} />
            </div>
            <span className="w-full truncate text-center text-[10px] text-stone-500">{slice.label}</span>
          </div>
        )
        return slice.to ? (
          <Link key={slice.label} to={slice.to} className="flex h-full min-w-0 flex-1">
            {column}
          </Link>
        ) : (
          <div key={slice.label} className="flex h-full min-w-0 flex-1">
            {column}
          </div>
        )
      })}
    </div>
  )
}
