import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#4B5694', '#7288AE', '#111844', '#EAE0CF', '#10b981', '#ef4444'];

export default function ReportsPage() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
  });

  const handleExport = async () => {
    const csv = await api.exportReports();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessments-export.csv';
    a.click();
  };

  if (isLoading) return <Layout><PageLoading /></Layout>;

  const statusData = Object.entries(reports?.by_status || {}).map(([name, value]) => ({ name, value }));
  const maturityData = Object.entries(reports?.maturity_distribution || {}).map(([name, value]) => ({ name, value }));
  const industryData = Object.entries(reports?.by_industry || {}).map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }));

  return (
    <Layout>
      <PageHeader
        hero
        title="Reports & Analytics"
        subtitle="Pipeline metrics and readiness trends"
        actions={
          <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="glass-card p-6">
          <div className="text-3xl font-bold">{reports?.total_assessments}</div>
          <div className="text-sm text-slate-500">Total Assessments</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-3xl font-bold">{reports?.avg_readiness_score || '—'}</div>
          <div className="text-sm text-slate-500">Avg Readiness Score</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-3xl font-bold">{reports?.rep_activity?.length || 0}</div>
          <div className="text-sm text-slate-500">Active Reps</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold">Assessments by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4B5694" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold">Maturity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={maturityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {maturityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold">By Industry</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={industryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="count" fill="#4B5694" name="Count" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="avgScore" fill="#7288AE" name="Avg Score" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Rep Activity</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-2 text-left font-semibold text-slate-600">Rep</th>
                <th className="py-2 text-right font-semibold text-slate-600">Assigned</th>
                <th className="py-2 text-right font-semibold text-slate-600">Completed</th>
              </tr>
            </thead>
            <tbody>
              {reports?.rep_activity?.map((r) => (
                <tr key={r.rep_name} className="border-b border-slate-50">
                  <td className="py-3">{r.rep_name}</td>
                  <td className="py-3 text-right">{r.assigned}</td>
                  <td className="py-3 text-right">{r.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
