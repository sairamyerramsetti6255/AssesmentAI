import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  title,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}) {
  return (
    <div className={`rounded-lg border border-pbs-line bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-pbs-line/80 px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-pbs-800">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'brand' | 'emerald' | 'amber' | 'rose'
}) {
  const tones = {
    slate: 'bg-stone-100 text-stone-700',
    brand: 'bg-pbs-50 text-pbs-700',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-900',
    rose: 'bg-rose-50 text-rose-800',
  }
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const variants = {
    primary: 'bg-pbs-600 text-white hover:bg-pbs-700 shadow-sm',
    secondary: 'border border-pbs-line bg-white text-pbs-800 hover:bg-pbs-warm',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'bg-rose-700 text-white hover:bg-rose-800',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-pbs-800">{label}</span>}
      <input
        className={`w-full rounded-md border border-pbs-line bg-white px-3 py-2.5 text-sm text-pbs-900 placeholder:text-stone-400 focus:border-pbs-500 focus:outline-none focus:ring-2 focus:ring-pbs-500/15 ${className}`}
        {...props}
      />
    </label>
  )
}

export function Select({
  label,
  options,
  ...props
}: {
  label?: string
  options: { value: string; label: string }[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-pbs-800">{label}</span>}
      <select
        className="w-full rounded-md border border-pbs-line bg-white px-3 py-2.5 text-sm focus:border-pbs-500 focus:outline-none focus:ring-2 focus:ring-pbs-500/15"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function LoadingOverlay({
  message = 'Loading…',
  submessage,
}: {
  message?: string
  submessage?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pbs-navy/50 backdrop-blur-[1px]">
      <div className="mx-4 max-w-sm rounded-lg border border-pbs-line bg-white px-8 py-7 text-center shadow-lg">
        <div
          className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-pbs-100 border-t-pbs-600"
          aria-hidden
        />
        <p className="text-sm font-semibold text-pbs-900">{message}</p>
        {submessage && <p className="mt-2 text-xs text-stone-500">{submessage}</p>}
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-pbs-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-pbs-line bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-pbs-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  )
}

export function ProgressBar({
  value,
  label,
  variant = 'default',
}: {
  value: number
  label?: string
  variant?: 'default' | 'portal'
}) {
  const portal = variant === 'portal'
  return (
    <div>
      {label && (
        <div
          className={`mb-1 flex justify-between text-xs ${
            portal ? 'text-stone-300' : 'text-stone-600'
          }`}
        >
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div
        className={`h-1.5 overflow-hidden rounded-full ${
          portal ? 'bg-pbs-800/60' : 'bg-stone-200'
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            portal ? 'bg-pbs-500' : 'bg-pbs-600'
          }`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}
