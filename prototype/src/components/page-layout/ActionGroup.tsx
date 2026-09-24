import type { ReactNode } from 'react'

interface Props {
  primary: ReactNode
  secondary?: ReactNode
}

export function ActionGroup({ primary, secondary }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2">{primary}</div>
      {secondary && (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            More actions
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex min-w-[10rem] flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {secondary}
          </div>
        </details>
      )}
    </div>
  )
}
