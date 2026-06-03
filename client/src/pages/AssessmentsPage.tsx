import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Chatbot } from '@/components/Chatbot';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { STATUS_COLORS, STATUS_LABELS, formatDate } from '@/lib/utils';
import { Plus, Building2, ArrowRight } from 'lucide-react';

export default function AssessmentsPage() {
  const { user } = useAuth();
  const { data: assessments = [], isLoading, isError, error } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.getAssessments(),
  });

  return (
    <Layout>
      <PageHeader
        hero
        title="Assessments"
        subtitle={`${assessments.length} client${assessments.length !== 1 ? 's' : ''} in your pipeline`}
        actions={
          (user?.role_name === 'sales_manager' || user?.role_name === 'super_admin') ? (
            <Link to="/assessments/new"><Button><Plus className="mr-2 h-4 w-4" /> New Assessment</Button></Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : isError ? (
        <div className="glass-card p-8 text-center">
          <p className="font-medium text-red-600">Could not load assessments</p>
          <p className="mt-2 text-sm text-brand-slate">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ) : assessments.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-brand-slate" />
          <p className="text-brand-slate">No assessments yet — create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assessments.map((a) => (
            <Link key={a.id} to={`/assessments/${a.id}`} className="group">
              <article className="glass-card flex h-full flex-col p-5 transition-all hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft-light ring-1 ring-brand-cream">
                    <Building2 className="h-5 w-5 text-brand-primary" />
                  </div>
                  <Badge className={STATUS_COLORS[a.status] || 'bg-brand-cream text-brand-navy'}>
                    {STATUS_LABELS[a.status] || a.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-brand-navy group-hover:text-brand-primary">
                  {a.client?.company_name || 'Unknown Client'}
                </h3>
                <p className="mt-1 text-sm text-brand-slate">
                  {a.client?.industry_name || 'No industry'} · {formatDate(a.created_at)}
                </p>
                {a.assigned_rep && <p className="mt-2 text-xs text-brand-slate">Rep: {a.assigned_rep.full_name}</p>}
                <div className="mt-auto flex items-center gap-1 pt-4 text-xs font-semibold text-brand-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open wizard <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
      <Chatbot />
    </Layout>
  );
}
