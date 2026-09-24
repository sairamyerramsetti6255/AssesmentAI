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
  { key: 'crawl', label: 'Crawl website pages', from: 8 },
  { key: 'analyze', label: 'Analyze content & competitors', from: 50 },
  { key: 'brief', label: 'Build company brief', from: 72 },
] as const

export function WebsiteResearchLoader({ status, active }: Props) {
  if (!active || !status) return null

  const progress = Math.min(100, Math.max(0, status.progress))
  const done = status.done

  return (
    <div
      className="overflow-hidden rounded-2xl border border-pbs-line bg-gradient-to-br from-white to-pbs-50/80 p-5 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy={!done}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          {!done ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-pbs-200/60" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-pbs-200 bg-white">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-pbs-600 border-t-transparent" />
              </span>
            </>
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-pbs-600">
            {done ? 'Research complete' : 'Researching your company'}
          </p>
          <p className="mt-1 text-pbs-800">{status.message}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs font-medium text-pbs-700">
          <span>{done ? 'Ready for tailored questions' : 'Progress'}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-pbs-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${done ? 'bg-emerald-500' : 'bg-pbs-600'}`}
            style={{ width: `${Math.max(progress, done ? 100 : 6)}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {STEPS.map((step) => {
          const on = progress >= step.from || (done && step.key === 'brief')
          const current = !done && progress >= step.from - 5 && progress < (step.key === 'crawl' ? 50 : step.key === 'analyze' ? 72 : 100)
          return (
            <li key={step.key} className={`flex items-center gap-2 ${on ? 'text-pbs-800' : 'text-pbs-500'}`}>
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  on ? 'bg-pbs-600 text-white' : 'border border-pbs-line bg-white'
                } ${current ? 'ring-2 ring-pbs-300 ring-offset-1' : ''}`}
              >
                {on ? '✓' : '·'}
              </span>
              <span>{step.label}</span>
              {step.key === 'crawl' && status.pagesCrawled && status.maxPages && on && (
                <span className="text-xs text-pbs-600">
                  ({status.pagesCrawled}/{status.maxPages}
                  {status.currentPath ? ` · ${status.currentPath}` : ''})
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
