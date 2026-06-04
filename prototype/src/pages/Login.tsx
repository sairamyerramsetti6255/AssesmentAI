import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DEMO_CREDENTIALS } from '../data/admin-master-data'
import { useApp } from '../context/AppContext'
import { Button, Card, Input } from '../components/ui'

export function Login() {
  const { currentUser, login } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (currentUser) {
    return <Navigate to={from} replace />
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!login(email, password)) {
      setError('Invalid email or password.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            AI Readiness Assessment
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Admin and executive access</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
            )}
            <Input
              label="Email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Demo accounts</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {DEMO_CREDENTIALS.map((c) => (
                <li key={c.email}>
                  <button
                    type="button"
                    className="text-left hover:text-indigo-700"
                    onClick={() => {
                      setEmail(c.email)
                      setPassword(c.password)
                    }}
                  >
                    {c.role}: {c.email} / {c.password}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          Clients use the secure assessment link — no login required.{' '}
          <Link to="/portal/prt-demo-8f3a" className="text-indigo-600 hover:underline">
            Demo portal
          </Link>
        </p>
      </div>
    </div>
  )
}
