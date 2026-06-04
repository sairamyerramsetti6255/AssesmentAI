import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Badge, Button, Card, Input, PageHeader } from '../components/ui'

const roleLabels = {
  super_admin: 'Super Admin',
  team_lead: 'Sales Manager',
  account_executive: 'Sales Rep',
}

export function Profile() {
  const { currentUser, updateProfile } = useApp()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)

  if (!currentUser) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile({
      name,
      email,
      ...(password.trim() ? { password: password.trim() } : {}),
    })
    setPassword('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="My profile" description="Update your account details and password." />
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Badge tone="indigo">{roleLabels[currentUser.role]}</Badge>
          {currentUser.lastLogin && (
            <span className="text-xs text-slate-500">
              Last login: {new Date(currentUser.lastLogin).toLocaleString()}
            </span>
          )}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            placeholder="Leave blank to keep current"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {saved && <p className="text-sm text-emerald-600">Profile saved.</p>}
          <Button type="submit">Save changes</Button>
        </form>
      </Card>
    </div>
  )
}
