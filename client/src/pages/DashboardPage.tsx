import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Chatbot } from '@/components/Chatbot';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { STATUS_COLORS, STATUS_LABELS, formatDate } from '@/lib/utils';
import {
  ClipboardList, BarChart3, Mic, Plus, ArrowRight, Sparkles, CheckCircle2, TrendingUp,
} from 'lucide-react';

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.getAssessments(),
  });

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
    enabled: user?.role_name !== 'sales_rep',
  });

  const assignedCount = assessments.filter((a) => a.status === 'assigned' || a.status === 'in_session').length;
  const recent = assessments.slice(0, 6);
  const inProgress = assessments.filter((a) => ['pre_assessment', 'approved', 'assigned', 'in_session'].includes(a.status)).length;

  return (
    <Layout>
      <PageHeader
        hero
        title={`Welcome back, ${user?.full_name?.split(' ')[0]}`}
        subtitle="Command center for AI readiness assessments — research, live discovery, scoring, and client proposals."
        actions={
          <>
            {(user?.role_name === 'sales_manager' || user?.role_name === 'super_admin') && (
              <Link to="/assessments/new">
                <Button className="bg-white text-brand-navy hover:bg-brand-cream">
                  <Plus className="mr-2 h-4 w-4" /> New Assessment
                </Button>
              </Link>
            )}
            <Link to="/assessments">
              <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20">
                View pipeline
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total clients" value={assessments.length} icon={ClipboardList} accent="primary" subtext="In your workspace" />
        {reports ? (
          <>
            <StatCard label="Avg readiness" value={reports.avg_readiness_score || '—'} icon={TrendingUp} accent="slate" subtext="Across scored assessments" />
            <StatCard label="Live now" value={reports.by_status?.in_session || 0} icon={Mic} accent="navy" subtext="Active discovery sessions" />
            <StatCard label="Completed" value={reports.by_status?.completed || 0} icon={CheckCircle2} accent="cream" subtext="Ready for proposals" />
          </>
        ) : (
          <>
            <StatCard label="In progress" value={inProgress} icon={Sparkles} accent="slate" subtext="Preparing or assigned" />
            <StatCard label="Your queue" value={assignedCount} icon={Mic} accent="navy" subtext="Ready for live session" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="glass-card glass-card-hover lg:col-span-8">
          <div className="flex items-center justify-between border-b border-brand-cream px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">Recent assessments</h2>
              <p className="text-xs text-brand-slate">Latest movement across your pipeline</p>
            </div>
            <Link to="/assessments" className="text-xs font-semibold text-brand-primary hover:text-brand-navy">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-brand-cream">
            {recent.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-brand-slate">No assessments yet — start your first client.</p>
            ) : (
              recent.map((a) => (
                <Link
                  key={a.id}
                  to={`/assessments/${a.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-brand-soft-light/80"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-sm font-bold text-white">
                    {companyInitials(a.client?.company_name || 'N')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-navy">{a.client?.company_name || 'Draft'}</p>
                    <p className="text-xs text-brand-slate">
                      {a.client?.industry_name || 'Industry TBD'} · {formatDate(a.created_at)}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[a.status] || 'bg-brand-cream text-brand-navy'}>
                    {STATUS_LABELS[a.status] || a.status}
                  </Badge>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-slate" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="glass-card lg:col-span-4">
          <div className="border-b border-brand-cream px-5 py-5">
            <h2 className="text-lg font-bold text-brand-navy">Quick actions</h2>
            <p className="text-xs text-brand-slate">Jump to the next task</p>
          </div>
          <div className="space-y-2 p-4">
            {[
              { to: '/assessments/new', label: 'New assessment', desc: 'Client wizard & AI research', roles: ['super_admin', 'sales_manager'], icon: Plus },
              { to: '/assessments', label: 'Pipeline', desc: 'Kanban & client list', roles: ['super_admin', 'sales_manager', 'sales_rep'], icon: ClipboardList },
              { to: '/reports', label: 'Analytics', desc: 'Scores & trends', roles: ['super_admin', 'sales_manager'], icon: BarChart3 },
              { to: '/notifications', label: 'Notifications', desc: 'Assignments & updates', roles: ['super_admin', 'sales_manager', 'sales_rep'], icon: Sparkles },
            ]
              .filter((a) => user && a.roles.includes(user.role_name))
              .map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="flex items-center gap-3 rounded-xl p-4 ring-1 ring-brand-cream transition-all hover:bg-brand-soft-light hover:ring-brand-primary/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft-light text-brand-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-navy">{action.label}</p>
                      <p className="text-xs text-brand-slate">{action.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-primary" />
                  </Link>
                );
              })}
          </div>
        </section>
      </div>

      <Chatbot />
    </Layout>
  );
}
