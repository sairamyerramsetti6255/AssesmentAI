interface Props {
  companyName: string
  onBehalf?: boolean
  executiveName?: string
}

export function ClientPortalThankYou({ companyName, onBehalf, executiveName }: Props) {
  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-2 ring-emerald-200">
        <svg
          className="h-8 w-8 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Thank you</h1>
      <p className="mt-3 text-base text-slate-600">
        Your AI readiness assessment for <strong className="text-slate-900">{companyName}</strong>{' '}
        has been submitted successfully.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        {onBehalf
          ? `Recorded on behalf of the client by ${executiveName ?? 'your account executive'}. The client may receive a confirmation from your team.`
          : 'Our team will review your responses and supporting documents. You may close this window — your account executive will follow up with next steps.'}
      </p>
      <p className="mt-8 text-xs text-slate-400">Submission recorded · Assessment complete</p>
    </div>
  )
}
