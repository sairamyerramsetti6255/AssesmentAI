import { useApp } from '../context/AppContext'
import { Badge, Card, PageHeader, StatCard } from '../components/ui'

export function Analytics() {
  const { leads, platformUsers } = useApp()
  const allRemarks = leads.flatMap((l) =>
    l.remarks.map((r) => ({ company: l.companyName, executive: l.assignedExecutive, text: r })),
  )

  const executives = platformUsers.filter((u) =>
    ['account_executive', 'team_lead', 'super_admin'].includes(u.role),
  )

  return (
    <div>
      <PageHeader
        title="Operational Analytics Dashboard"
        description="Module 7 — Global leads ledger, executive remarks audit, and performance visualizations."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="System-wide leads" value={leads.length} />
        <StatCard
          label="Approved assessments"
          value={leads.filter((l) => l.assessmentStatus === 'approved').length}
        />
        <StatCard
          label="Converted"
          value={leads.filter((l) => l.funnelStatus === 'converted').length}
        />
      </div>
      <Card title="Comprehensive global leads report" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3">Lead</th>
                <th className="pb-2 pr-3">Industry</th>
                <th className="pb-2 pr-3">Country</th>
                <th className="pb-2 pr-3">Executive</th>
                <th className="pb-2 pr-3">Funnel</th>
                <th className="pb-2 pr-3">Created</th>
                <th className="pb-2">Last interaction</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-medium">{l.companyName}</td>
                  <td className="py-2 pr-3">{l.industry}</td>
                  <td className="py-2 pr-3">{l.country}</td>
                  <td className="py-2 pr-3">{l.assignedExecutive}</td>
                  <td className="py-2 pr-3">
                    <Badge tone="indigo">{l.funnelStatus}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-slate-500">{l.createdAt}</td>
                  <td className="py-2 text-slate-500">{l.lastInteraction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Executive remarks ledger">
          {allRemarks.length === 0 ? (
            <p className="text-sm text-slate-500">No remarks recorded.</p>
          ) : (
            <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
              {allRemarks.map((r, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">
                    {r.company} · {r.executive}
                  </p>
                  <p className="mt-1 text-slate-700">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Executive-wise performance">
          <div className="space-y-4">
            {executives.map((ex) => {
              const exLeads = leads.filter((l) => l.assignedExecutive === ex.name)
              const approved = exLeads.filter((l) => l.assessmentStatus === 'approved').length
              const converted = exLeads.filter((l) => l.funnelStatus === 'converted').length
              const conversionRate = exLeads.length ? converted / exLeads.length : 0
              return (
                <div key={ex.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-slate-500">
                      {exLeads.length} leads · {Math.round(conversionRate * 100)}% conv.
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${(approved / Math.max(exLeads.length, 1)) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {approved} approved assessments
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
