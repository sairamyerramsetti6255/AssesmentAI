export interface ResearchStatusView {
  progress: number
  done: boolean
  message: string
  phase: string
  pagesCrawled?: number
  maxPages?: number
  currentPath?: string
  engine?: string
}

interface Props {
  status: ResearchStatusView | null
  active: boolean
}

const STEPS = [
  { key: 'crawl', label: 'Read your website', from: 8 },
  { key: 'analyze', label: 'Summarise the company', from: 50 },
  { key: 'brief', label: 'Write your questions', from: 72 },
] as const

export function WebsiteResearchLoader({ status, active }: Props) {
  if (!active || !status) return null

  const progress = Math.min(100, Math.max(8, status.progress))

  return (
    <div
      className="mx-auto w-full max-w-lg rounded-3xl border border-pbs-line bg-white p-8 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-pbs-line bg-pbs-50">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-pbs-600 border-t-transparent" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-pbs-600">Please wait</p>
        <h1 className="mt-2 text-2xl font-semibold text-pbs-navy">Preparing your questions</h1>
        <p className="mt-3 text-pbs-700">{status.message}</p>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs font-medium text-pbs-700">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-pbs-100">
          <div className="h-full rounded-full bg-pbs-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="mt-6 space-y-3 text-sm">
        {STEPS.map((step) => {
          const on = progress >= step.from
          return (
            <li key={step.key} className={`flex items-center gap-3 ${on ? 'text-pbs-800' : 'text-pbs-500'}`}>
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  on ? 'bg-pbs-600 text-white' : 'border border-pbs-line bg-white'
                }`}
              >
                {on ? '✓' : ''}
              </span>
              <span>{step.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
