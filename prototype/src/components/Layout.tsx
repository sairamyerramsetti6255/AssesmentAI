import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Badge, Button } from './ui'

const roleLabels = {
  super_admin: 'Super Admin',
  team_lead: 'Team Lead',
  account_executive: 'Account Executive',
}

const allNavItems = [
  { to: '/', label: 'Overview', end: true, roles: ['super_admin', 'team_lead', 'account_executive'] as const },
  { to: '/intake', label: 'Lead Intake', roles: ['super_admin', 'team_lead', 'account_executive'] as const },
  { to: '/review', label: 'Review Workspace', roles: ['super_admin', 'team_lead', 'account_executive'] as const },
  { to: '/pipeline', label: 'Opportunity Pipeline', roles: ['super_admin', 'team_lead', 'account_executive'] as const },
  { to: '/proposal', label: 'Blueprint & Proposal', roles: ['super_admin', 'team_lead', 'account_executive'] as const },
  { to: '/analytics', label: 'Analytics', roles: ['super_admin', 'team_lead', 'account_executive'] as const },
  { to: '/admin', label: 'Administration', roles: ['super_admin', 'team_lead'] as const },
  { to: '/reports', label: 'Reports', roles: ['super_admin', 'team_lead'] as const },
]

export function Layout() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()

  if (!currentUser) return null

  const navItems = allNavItems.filter((item) =>
    (item.roles as readonly string[]).includes(currentUser.role),
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            AI Readiness
          </p>
          <h1 className="mt-1 text-lg font-bold">Assessment Platform</h1>
          <p className="mt-1 text-xs text-slate-400">Enterprise prototype</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-4">
          <p className="text-sm font-medium">{currentUser.name}</p>
          <Badge tone="indigo">{roleLabels[currentUser.role]}</Badge>
          <div className="mt-3 flex flex-col gap-1">
            <Link
              to="/profile"
              className="text-xs text-slate-400 hover:text-white"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-left text-xs text-slate-400 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Agentic discovery · Executive governance · Client collaboration
            </p>
            <div className="flex items-center gap-2">
              <Link to="/profile" className="text-sm text-indigo-600 hover:underline">
                {currentUser.name}
              </Link>
              <Button variant="secondary" className="!py-1.5 !text-xs" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </header>
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function ClientPortalLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          AI Readiness Assessment
        </p>
        <p className="mt-0.5 text-sm text-slate-500">Secure client portal</p>
      </header>
      <Outlet />
    </div>
  )
}
