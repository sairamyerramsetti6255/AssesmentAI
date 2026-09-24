import { NavLink, useLocation } from 'react-router-dom'

const steps = [
  { to: '/intake', label: 'Intake' },
  { to: '/research', label: 'Research' },
  { to: '/assessment', label: 'Assessment' },
  { to: '/client-response', label: 'Client Response' },
  { to: '/proposal', label: 'Proposal' },
] as const

const workflowPaths = steps.map((s) => s.to)

export function WorkflowStepper() {
  const { pathname } = useLocation()
  const show = workflowPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!show) return null

  const activeIndex = steps.findIndex((s) => pathname === s.to || pathname.startsWith(`${s.to}/`))

  return (
    <nav
      aria-label="Assessment workflow"
      className="mb-6 overflow-x-auto rounded-lg border border-pbs-line bg-white px-3 py-2.5"
    >
      <div className="flex min-w-max items-center gap-1 sm:gap-1.5">
        {steps.map((step, i) => {
          const isActive = i === activeIndex
          const isPast = activeIndex > i
          return (
            <div key={step.to} className="flex items-center gap-1 sm:gap-1.5">
              {i > 0 && <span className="text-stone-300" aria-hidden>/</span>}
              <NavLink
                to={step.to}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                  isActive
                    ? 'bg-pbs-600 text-white'
                    : isPast
                      ? 'bg-pbs-50 text-pbs-700 hover:bg-pbs-100'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-pbs-800'
                }`}
              >
                {step.label}
              </NavLink>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
