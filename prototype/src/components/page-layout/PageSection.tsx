import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function PageSection({ title, description, action, children, className = '' }: Props) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}
