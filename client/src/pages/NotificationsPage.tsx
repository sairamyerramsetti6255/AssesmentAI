import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Layout>
      <PageHeader hero title="Notifications" subtitle="Assignments and platform alerts" />
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="glass-card py-12 text-center text-slate-500">No notifications</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`glass-card flex items-center justify-between gap-4 p-5 ${n.is_read ? 'opacity-60' : ''}`}>
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-sm text-slate-500">{n.message}</div>
                <div className="text-xs text-slate-400">{formatDate(n.created_at)}</div>
              </div>
              <div className="flex gap-2">
                {n.link && <Link to={n.link}><Button size="sm" variant="outline">View</Button></Link>}
                {!n.is_read && <Button size="sm" onClick={() => markReadMutation.mutate(n.id)}>Mark Read</Button>}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
