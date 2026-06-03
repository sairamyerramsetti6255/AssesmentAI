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
import { ClipboardList, BarChart3, Mic, Plus, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

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
  const recent = assessments.slice(0, 5);

  return (
    <Layout>
      <PageHeader
        hero
        title={`Good to see you, ${user?.full_name?.split(' ')[0]}`}
        subtitle="Your AI readiness command center"
        actions={
          <>
            {(user?.role_name === 'sales_manager' || user?.role_name === 'super_admin') && (
              <Link to="/assessments/new"><Button><Plus className="mr-2 h-4 w-4" /> New Assessment</Button></Link>
            )}
            <Link to="/assessments">
              <Button variant="outline" className="border-brand-slate/30 bg-white text-brand-navy hover:bg-brand-soft-light">
                View All
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assessments" value={assessments.length} icon={ClipboardList} accent="primary" />
        {reports ? (
          <>
            <StatCard label="Avg Score" value={reports.avg_readiness_score || '—'} icon={BarChart3} accent="slate" subtext="Readiness index" />
            <StatCard label="Active" value={reports.by_status?.in_session || 0} icon={Mic} accent="navy" subtext="Live sessions" />
            <StatCard label="Completed" value={reports.by_status?.completed || 0} icon={CheckCircle2} accent="cream" />
          </>
        ) : (
          <StatCard label="Assigned" value={assignedCount} icon={Sparkles} accent="slate" subtext="Your queue" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="glass-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-brand-cream px-6 py-4">
            <h2 className="font-semibold text-brand-navy">Recent Assessments</h2>
            <Link to="/assessments" className="text-xs font-semibold text-brand-primary hover:text-brand-navy">
              See all →
            </Link>
          </div>
          <div className="divide-y divide-brand-cream">
            {recent.length === 0 ? (
              <p className="p-8 text-center text-sm text-brand-slate">No assessments yet</p>
            ) : (
              recent.map((a) => (
                <Link
                  key={a.id}
                  to={`/assessments/${a.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-brand-soft-light"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-brand-navy">{a.client?.company_name || 'Draft'}</p>
                    <p className="text-xs text-brand-slate">{a.client?.industry_name || 'No industry'} · {formatDate(a.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={STATUS_COLORS[a.status] || 'bg-brand-cream text-brand-navy'}>
                      {STATUS_LABELS[a.status] || a.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-brand-slate" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="glass-card lg:col-span-2">
          <div className="border-b border-brand-cream px-6 py-4">
            <h2 className="font-semibold text-brand-navy">Quick Actions</h2>
          </div>
          <div className="space-y-2 p-4">
            {[
              { to: '/assessments/new', label: 'Start Pre-Assessment', desc: 'New client wizard', roles: ['super_admin', 'sales_manager'] },
              { to: '/assessments', label: 'Browse Assessments', desc: 'View all clients', roles: ['super_admin', 'sales_manager', 'sales_rep'] },
              { to: '/reports', label: 'Analytics', desc: 'Scores & trends', roles: ['super_admin', 'sales_manager'] },
              { to: '/notifications', label: 'Notifications', desc: 'Assignments & alerts', roles: ['super_admin', 'sales_manager', 'sales_rep'] },
            ]
              .filter((a) => user && a.roles.includes(user.role_name))
              .map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center justify-between rounded-xl p-3 ring-1 ring-brand-cream transition-all hover:bg-brand-soft-light"
                >
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">{action.label}</p>
                    <p className="text-xs text-brand-slate">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-brand-primary" />
                </Link>
              ))}
          </div>
        </div>
      </div>

      <Chatbot />
    </Layout>
  );
}
