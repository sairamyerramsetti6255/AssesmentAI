import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, Card, PageHeader, StatCard } from '../components/ui'

type ReportTab = 'users' | 'clients'

export function Reports() {
  const { activityLog, platformUsers, leads } = useApp()
  const [tab, setTab] = useState<ReportTab>('users')

  const userEvents = useMemo(
    () =>
      activityLog.filter((e) =>
        ['user.login', 'user.logout', 'user.register', 'user.update', 'user.delete'].includes(
          e.kind,
        ),
      ),
    [activityLog],
  )

  const clientEvents = useMemo(
    () =>
      activityLog.filter((e) =>
        [
          'client.portal_open',
          'client.portal_save',
          'client.portal_submit',
          'client.on_behalf_fill',
          'assessment.approve',
          'assessment.link_sent',
          'assessment.export',
        ].includes(e.kind),
      ),
    [activityLog],
  )

  const activeClients = leads.filter((l) => l.portalToken || l.clientProgress)

  return (
    <div>
      <PageHeader
        title="Activity reports"
        description="Admin view — platform user sign-ins and client assessment activity."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Platform users" value={platformUsers.length} />
        <StatCard label="Active leads" value={leads.length} />
        <StatCard
          label="Portal in progress"
          value={leads.filter((l) => (l.clientProgress ?? 0) > 0 && (l.clientProgress ?? 0) < 100).length}
        />
        <StatCard
          label="Completed assessments"
          value={leads.filter((l) => l.clientProgress === 100).length}
        />
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === 'users' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          User activity
        </button>
        <button
          type="button"
          onClick={() => setTab('clients')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === 'clients' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Client activity
        </button>
      </div>

      {tab === 'users' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="User directory">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Role</th>
                  <th className="pb-2">Last login</th>
                </tr>
              </thead>
              <tbody>
                {platformUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium">{u.name}</td>
                    <td className="py-2 pr-3">
                      <Badge tone="indigo">{u.role.replace('_', ' ')}</Badge>
                    </td>
                    <td className="py-2 text-xs text-slate-500">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="User activity log">
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {userEvents.length === 0 ? (
                <li className="text-slate-500">No user events yet.</li>
              ) : (
                userEvents.map((e) => (
                  <li key={e.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">{new Date(e.at).toLocaleString()}</p>
                    <p className="font-medium text-slate-800">{e.summary}</p>
                    <p className="text-xs text-slate-600">{e.actorName}</p>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'clients' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Client assessment status">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-3">Company</th>
                  <th className="pb-2 pr-3">Executive</th>
                  <th className="pb-2 pr-3">Progress</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeClients.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium">{l.companyName}</td>
                    <td className="py-2 pr-3 text-slate-600">{l.assignedExecutive}</td>
                    <td className="py-2 pr-3">{l.clientProgress ?? 0}%</td>
                    <td className="py-2">
                      <Badge tone={l.clientProgress === 100 ? 'emerald' : 'amber'}>
                        {l.assessmentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Client activity log">
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {clientEvents.length === 0 ? (
                <li className="text-slate-500">No client events yet.</li>
              ) : (
                clientEvents.map((e) => (
                  <li key={e.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">{new Date(e.at).toLocaleString()}</p>
                    <p className="font-medium text-slate-800">{e.summary}</p>
                    {e.companyName && (
                      <p className="text-xs text-indigo-600">{e.companyName}</p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
