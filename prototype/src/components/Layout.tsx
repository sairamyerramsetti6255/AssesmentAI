import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PbsLogo } from './brand/PbsLogo'
import { WorkflowStepper } from './page-layout'
import { Badge, Button } from './ui'
import { PBS_BRAND } from '../lib/brand'

const roleLabels = {
  super_admin: 'Super Admin',
  team_lead: 'Team Lead',
  account_executive: 'Account Executive',
}

type NavItem = {
  to: string
  label: string
  end?: boolean
  roles: readonly ('super_admin' | 'team_lead' | 'account_executive')[]
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workflow',
    items: [
      { to: '/', label: 'Overview', end: true, roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/intake', label: 'Lead Intake', roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/research', label: 'Agent Research', roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/assessment', label: 'Assessment', roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/assessments', label: 'Assessments', roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/client-response', label: 'Client Response', roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/proposal', label: 'Blueprint & Proposal', roles: ['super_admin', 'team_lead', 'account_executive'] },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { to: '/pipeline', label: 'Opportunities', roles: ['super_admin', 'team_lead', 'account_executive'] },
      { to: '/analytics', label: 'Analytics', roles: ['super_admin', 'team_lead', 'account_executive'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin', label: 'Settings', roles: ['super_admin', 'team_lead'] },
      { to: '/reports', label: 'Reports', roles: ['super_admin', 'team_lead'] },
    ],
  },
]

function SidebarLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative block rounded-md py-1.5 pl-3 pr-2 text-[13px] font-medium transition-colors ${
          isActive
            ? 'bg-white/10 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-pbs-500'
            : 'text-stone-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export function Layout() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()

  if (!currentUser) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(currentUser.role)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-screen overflow-hidden bg-pbs-warm">
      <aside className="flex h-full w-[15.5rem] shrink-0 flex-col overflow-hidden bg-pbs-navy text-white">
        <div className="shrink-0 border-b border-white/10 px-4 py-5">
          <div className="flex items-center gap-3">
            <PbsLogo size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{PBS_BRAND.shortName}</p>
              <p className="truncate text-[11px] text-stone-400">{PBS_BRAND.product}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-hidden px-3 py-3">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} to={item.to} label={item.label} end={item.end} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium text-white">{currentUser.name}</p>
          <Badge tone="brand">{roleLabels[currentUser.role]}</Badge>
          <div className="mt-3 flex gap-3 text-xs">
            <Link to="/profile" className="text-stone-400 hover:text-white">
              Profile
            </Link>
            <button type="button" onClick={handleLogout} className="text-stone-400 hover:text-white">
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-pbs-line bg-white px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-stone-500">{PBS_BRAND.company}</p>
            <div className="flex items-center gap-3">
              <Link to="/profile" className="text-sm font-medium text-pbs-700 hover:text-pbs-800">
                {currentUser.name}
              </Link>
              <Button variant="secondary" className="!py-1.5 !text-xs" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 lg:px-8">
          <WorkflowStepper />
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function ClientPortalLayout() {
  return (
    <div className="min-h-screen bg-pbs-warm">
      <header className="border-b border-pbs-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <PbsLogo size="sm" />
          <div>
            <p className="text-sm font-semibold text-pbs-900">{PBS_BRAND.product}</p>
            <p className="text-xs text-stone-500">Secure client portal · {PBS_BRAND.shortName}</p>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
