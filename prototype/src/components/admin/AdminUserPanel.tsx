import { useState } from 'react'
import type { PlatformUser, UserRole } from '../../types'
import { Button, Card, Input, Select } from '../ui'

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'team_lead', label: 'Sales Manager' },
  { value: 'account_executive', label: 'Sales Rep' },
]

const roleDisplay: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  team_lead: 'Sales Manager',
  account_executive: 'Sales Rep',
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}

interface Props {
  users: PlatformUser[]
  currentUserId: string | null
  onRegister: (user: Omit<PlatformUser, 'id'> & { password?: string }) => void
  onUpdate: (id: string, patch: Partial<PlatformUser>) => void
  onDelete: (id: string) => void
}

export function AdminUserPanel({ users, currentUserId, onRegister, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('account_executive')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{
    name: string
    email: string
    role: UserRole
    password: string
  } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    onRegister({
      name: name.trim(),
      email: email.trim(),
      role,
      password: password.trim() || 'changeme123',
    })
    setName('')
    setEmail('')
    setPassword('')
    setRole('account_executive')
  }

  const startEdit = (u: PlatformUser) => {
    setEditingId(u.id)
    setEditDraft({ name: u.name, email: u.email, role: u.role, password: '' })
  }

  const saveEdit = () => {
    if (!editingId || !editDraft) return
    onUpdate(editingId, {
      name: editDraft.name.trim(),
      email: editDraft.email.trim(),
      role: editDraft.role,
      ...(editDraft.password.trim() ? { password: editDraft.password.trim() } : {}),
    })
    setEditingId(null)
    setEditDraft(null)
  }

  return (
    <Card title="User Management">
      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {users.map((u) => {
          const isEditing = editingId === u.id
          const isSelf = u.id === currentUserId
          return (
            <li
              key={u.id}
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm"
            >
              {isEditing && editDraft ? (
                <div className="space-y-2">
                  <Input
                    label="Name"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editDraft.email}
                    onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                  />
                  <Select
                    label="Role"
                    value={editDraft.role}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, role: e.target.value as UserRole })
                    }
                    options={roleOptions}
                  />
                  <Input
                    label="New password"
                    type="password"
                    placeholder="Leave blank to keep"
                    value={editDraft.password}
                    onChange={(e) => setEditDraft({ ...editDraft, password: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button type="button" className="!text-xs" onClick={saveEdit}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="!text-xs"
                      onClick={() => {
                        setEditingId(null)
                        setEditDraft(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {u.name}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-indigo-600">(you)</span>
                      )}
                    </p>
                    <p className="text-slate-600">{u.email}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{roleDisplay[u.role]}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title="Edit user"
                      className="rounded p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                      onClick={() => startEdit(u)}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                      disabled={isSelf}
                      className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      onClick={() => onDelete(u.id)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <form onSubmit={submit} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Register new user
        </p>
        <Input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={roleOptions}
        />
        <Button type="submit" className="w-full !bg-slate-800 hover:!bg-slate-900">
          Register User
        </Button>
      </form>
    </Card>
  )
}
