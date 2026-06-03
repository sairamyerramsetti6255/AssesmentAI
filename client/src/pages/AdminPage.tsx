import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Pencil, Trash2 } from 'lucide-react';

const MASTER_TABS = [
  { key: 'industries', label: 'Industries', nameField: 'name' },
  { key: 'drivers', label: 'Drivers', nameField: 'driver_name' },
  { key: 'solutions', label: 'Solutions', nameField: 'solution_name' },
  { key: 'pain-points', label: 'Pain Points', nameField: 'category_name' },
  { key: 'maturity-stages', label: 'Maturity Stages', nameField: 'stage_name' },
  { key: 'questions', label: 'Questions', nameField: 'question_text' },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function buildCreatePayload(tab: string, name: string, drivers: Array<{ id: string }>) {
  switch (tab) {
    case 'industries':
      return { name, is_active: true };
    case 'drivers':
      return { driver_name: name, driver_key: slugify(name), display_order: 99, description: null, icon_name: null };
    case 'solutions':
      return { solution_name: name, solution_key: slugify(name), description: null, typical_effort: 'Medium', low_cost_options: null, icon_name: null };
    case 'pain-points':
      return { category_name: name, is_active: true };
    case 'maturity-stages':
      return { stage_name: name, stage_order: 99, color_hex: '#94A3B8', focus_area: null, description: null };
    case 'questions':
      return {
        driver_id: drivers[0]?.id,
        question_text: name,
        question_type: 'rating',
        rating_min: 1,
        rating_max: 5,
        rating_labels: { '1': 'Low', '5': 'High' },
        expected_answer_time_seconds: 60,
        display_order: 99,
        is_required: true,
      };
    default:
      return { name };
  }
}

export default function AdminPage() {
  const [tab, setTab] = useState('industries');
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.getUsers() });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['masters', tab],
    queryFn: () => api.getMasterData(tab) as Promise<Array<Record<string, unknown>>>,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['masters', 'drivers'],
    queryFn: () => api.getMasterData('drivers') as Promise<Array<{ id: string }>>,
  });

  const [registerForm, setRegisterForm] = useState({ email: '', password: '', full_name: '', role_name: 'sales_rep' });

  const registerMutation = useMutation({
    mutationFn: () => api.register(registerForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setRegisterForm({ email: '', password: '', full_name: '', role_name: 'sales_rep' });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.createMasterItem(tab, buildCreatePayload(tab, newItemName.trim(), drivers)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', tab] });
      setNewItemName('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => {
      const nameField = MASTER_TABS.find((t) => t.key === tab)?.nameField || 'name';
      const payload: Record<string, unknown> = { [nameField]: name };
      if (tab === 'drivers') payload.driver_key = slugify(name);
      if (tab === 'solutions') payload.solution_key = slugify(name);
      return api.updateMasterItem(tab, id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', tab] });
      setEditingId(null);
      setEditName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMasterItem(tab, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['masters', tab] }),
  });

  const nameField = MASTER_TABS.find((t) => t.key === tab)?.nameField || 'name';

  return (
    <Layout>
      <PageHeader title="Admin Panel" subtitle="Manage users and master data" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="py-2 text-left">Name</th><th className="py-2 text-left">Email</th><th className="py-2 text-left">Role</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.full_name}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2 capitalize">{u.role_name.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium">Register New User</h4>
              <Input placeholder="Full name" value={registerForm.full_name} onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })} />
              <Input placeholder="Email" type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} />
              <Input placeholder="Password" type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} />
              <Select value={registerForm.role_name} onChange={(e) => setRegisterForm({ ...registerForm, role_name: e.target.value })}>
                <option value="sales_rep">Sales Rep</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="super_admin">Super Admin</option>
              </Select>
              <Button onClick={() => registerMutation.mutate()} disabled={registerMutation.isPending || !registerForm.email || !registerForm.password}>
                Register User
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Master Data</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {MASTER_TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => { setTab(t.key); setEditingId(null); }} className={`rounded-lg px-3 py-1 text-sm ${tab === t.key ? 'bg-brand-primary text-white' : 'bg-brand-cream text-brand-navy'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ul className="mb-4 max-h-60 space-y-1 overflow-y-auto text-sm">
                {items.map((item) => (
                  <li key={item.id as string} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
                    {editingId === item.id ? (
                      <div className="flex flex-1 gap-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        <Button size="sm" onClick={() => updateMutation.mutate({ id: item.id as string, name: editName })}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate">{String(item[nameField] || item.id)}</span>
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id as string); setEditName(String(item[nameField] || '')); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(item.id as string)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input placeholder={`New ${tab.replace('-', ' ')} name`} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
              <Button onClick={() => createMutation.mutate()} disabled={!newItemName.trim() || createMutation.isPending}>Add</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
