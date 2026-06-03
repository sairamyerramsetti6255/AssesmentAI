import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.getAuditLogs(),
  });

  return (
    <Layout>
      <PageHeader title="Audit & Compliance" subtitle="Append-only activity log" />
      <Card>
        <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <LoadingSkeleton rows={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Entity</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="py-2 pr-4">{log.user_name || 'System'}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{log.action}</td>
                      <td className="py-2 pr-4">{log.entity_type} {log.entity_id?.slice(0, 8)}</td>
                      <td className="py-2 text-xs text-slate-500">{log.details ? JSON.stringify(log.details) : '—'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No audit logs yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
