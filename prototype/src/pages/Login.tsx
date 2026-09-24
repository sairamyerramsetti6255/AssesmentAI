import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DEMO_CREDENTIALS } from '../data/admin-master-data'
import { useApp } from '../context/AppContext'
import { PbsLogo } from '../components/brand/PbsLogo'
import { Button, Input } from '../components/ui'
import { PBS_BRAND } from '../lib/brand'

export function Login() {
  const { currentUser, login } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDemo, setShowDemo] = useState(false)

  if (currentUser) {
    return <Navigate to={from} replace />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const ok = await login(email, password)
    if (!ok) {
      setError('Invalid email or password.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-[42%] flex-col justify-between bg-pbs-navy p-10 text-white lg:flex xl:p-14">
        <div>
          <div className="flex items-center gap-4">
            <PbsLogo size="xl" />
            <div>
              <p className="text-lg font-semibold">{PBS_BRAND.shortName}</p>
              <p className="text-sm text-stone-400">{PBS_BRAND.company}</p>
            </div>
          </div>
        </div>

        <div className="max-w-sm">
          <h1 className="text-3xl font-semibold leading-snug">{PBS_BRAND.product}</h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-300">
            Executive discovery, client assessments, and proposal generation for AI readiness engagements.
          </p>
          <p className="mt-8 text-xs font-medium tracking-wide text-pbs-gold">{PBS_BRAND.tagline}</p>
        </div>

        <p className="text-xs text-stone-500">© {new Date().getFullYear()} {PBS_BRAND.company}</p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[22rem]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <PbsLogo size="lg" />
              <div>
                <p className="font-semibold text-pbs-900">{PBS_BRAND.shortName}</p>
                <p className="text-xs text-stone-500">{PBS_BRAND.product}</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-pbs-900">Sign in</h2>
          <p className="mt-1 text-sm text-stone-600">Team member access only</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
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
            <Button type="submit" className="mt-2 w-full">
              Continue
            </Button>
          </form>

          <div className="mt-6 border-t border-pbs-line pt-5">
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              className="text-xs font-medium text-stone-500 hover:text-pbs-700"
            >
              {showDemo ? 'Hide' : 'Show'} demo accounts
            </button>
            {showDemo && (
              <ul className="mt-3 space-y-2 text-xs text-stone-600">
                {DEMO_CREDENTIALS.map((c) => (
                  <li key={c.email}>
                    <button
                      type="button"
                      className="text-left hover:text-pbs-700"
                      onClick={() => {
                        setEmail(c.email)
                        setPassword(c.password)
                      }}
                    >
                      <span className="font-medium text-pbs-800">{c.role}</span>
                      <span className="text-stone-400"> — </span>
                      {c.email}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-stone-500">
            Clients use their secure assessment link.{' '}
            <Link to="/portal/prt-demo-8f3a" className="font-medium text-pbs-600 hover:underline">
              Demo portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
