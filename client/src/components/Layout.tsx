import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sidebar } from './Sidebar';
import { AppLogo } from './AppLogo';
import { Bell, LogOut, Menu } from 'lucide-react';
import { Button } from './ui/Button';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    refetchInterval: 30000,
  });

  const unread = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-brand-cream bg-white px-4 lg:px-6">
          <button
            type="button"
            className="rounded-xl p-2 text-brand-navy ring-1 ring-brand-cream hover:bg-brand-soft-light lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block">
            <AppLogo variant="compact" linked={false} showText className="opacity-90" />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/notifications" className="relative rounded-xl p-2.5 text-brand-navy ring-1 ring-brand-cream hover:bg-brand-soft-light">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden rounded-xl bg-brand-soft-light px-3 py-1.5 text-right text-sm ring-1 ring-brand-cream sm:block">
              <div className="font-semibold text-brand-navy">{user?.full_name}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-white p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
