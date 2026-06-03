import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { AppLogo } from './AppLogo';
import {
  LayoutDashboard, ClipboardList, BarChart3, Shield,
  FileSearch, Bell, X,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'sales_manager', 'sales_rep'] },
  { to: '/assessments', label: 'Assessments', icon: ClipboardList, roles: ['super_admin', 'sales_manager', 'sales_rep'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'sales_manager'] },
  { to: '/admin', label: 'Admin', icon: Shield, roles: ['super_admin'] },
  { to: '/audit', label: 'Audit Logs', icon: FileSearch, roles: ['super_admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['super_admin', 'sales_manager', 'sales_rep'] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const items = NAV.filter((item) => user && item.roles.includes(user.role_name));

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-[260px] flex-col bg-brand-navy text-white transition-transform lg:relative lg:shrink-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <AppLogo variant="sidebar" to="/dashboard" onNavigate={onClose} />
          <button type="button" className="rounded-lg p-1.5 text-brand-slate hover:bg-white/10 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'nav-item-active' : 'text-brand-slate hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'text-white' : 'text-brand-slate')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="truncate text-sm font-medium">{user?.full_name}</p>
            <p className="text-xs capitalize text-brand-slate">{user?.role_name.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
