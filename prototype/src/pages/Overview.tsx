import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { driverHeatmap, funnelStages } from '../data/mock'
import { Badge, Button, Card, PageHeader, StatCard } from '../components/ui'

export function Overview() {
  const { leads } = useApp()
  const active = leads.filter((l) => !['converted', 'lost'].includes(l.funnelStatus)).length
  const inPortal = leads.filter((l) => l.funnelStatus === 'client_portal').length
  const maxDriver = Math.max(...driverHeatmap.map((d) => d.count))

  return (
    <div>
      <PageHeader
        title="Executive Command Center"
        description="Unified view of discovery velocity, pipeline health, and core organizational drivers across your portfolio."
        actions={
          <Link to="/intake">
            <Button>+ New Lead</Button>
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active pipeline" value={active} sub="Excluding closed deals" />
        <StatCard label="Client portals live" value={inPortal} sub="Awaiting client input" />
        <StatCard
          label="Avg. discovery velocity"
          value="11 days"
          sub="Intake → portal completion"
        />
        <StatCard label="Projected pipe value" value="$4.2M" sub="Forecast model (demo)" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Conversion funnel (system-wide)">
          <div className="space-y-3">
            {funnelStages.map((stage, i) => {
              const count = leads.filter((l) => l.funnelStatus === stage.key).length
              const pct = leads.length ? Math.round((count / leads.length) * 100) : 0
              return (
                <div key={stage.key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{stage.label}</span>
                    <span className="text-slate-500">
                      {count} leads · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500 opacity-90"
                      style={{ width: `${Math.max(8, pct)}%`, opacity: 1 - i * 0.08 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card title="Core driver heatmap">
          <div className="space-y-3">
            {driverHeatmap.map((d) => (
              <div key={d.driver} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs font-medium text-slate-600">{d.driver}</span>
                <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className="flex h-full items-center rounded bg-indigo-500/80 pl-2 text-xs font-medium text-white"
                    style={{ width: `${(d.count / maxDriver) * 100}%` }}
                  >
                    {d.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Recent leads" className="mt-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Executive</th>
              <th className="pb-2 font-medium">Last touch</th>
            </tr>
          </thead>
          <tbody>
            {leads.slice(0, 5).map((l) => (
              <tr key={l.id} className="border-b border-slate-50">
                <td className="py-3 font-medium">{l.companyName}</td>
                <td>
                  <Badge tone="indigo">{l.funnelStatus.replace('_', ' ')}</Badge>
                </td>
                <td className="text-slate-600">{l.assignedExecutive}</td>
                <td className="text-slate-500">{l.lastInteraction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
