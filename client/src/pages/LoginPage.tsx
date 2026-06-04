import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { AppLogo } from '@/components/AppLogo';
import { Sparkles, Shield, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const sessionExpired = new URLSearchParams(window.location.search).get('session') === 'expired';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.setToken(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden w-1/2 flex-col justify-between bg-brand-navy p-12 text-white lg:flex">
        <AppLogo variant="hero" linked={false} showText />

        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Assess. Guide.<br />Transform with AI.
          </h1>
          <p className="mt-4 max-w-md text-brand-slate">
            End-to-end AI readiness assessments — from deep research to live sessions, scoring, and proposals.
          </p>
          <div className="mt-10 grid gap-4">
            {[
              { icon: Sparkles, text: 'Gemini-powered research & questions' },
              { icon: Shield, text: 'Role-based manager & rep workflows' },
              { icon: BarChart3, text: 'Gap analysis & readiness scoring' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-brand-cream">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary">
                  <Icon className="h-4 w-4" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-brand-slate">© Assessment ai · Demo environment</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <AppLogo variant="light" linked={false} showText />
          </div>

          <div className="glass-card p-8">
            <div className="mb-6 hidden justify-center lg:flex">
              <AppLogo variant="compact" linked={false} showText={false} />
            </div>
            <h2 className="text-2xl font-bold text-brand-navy">Welcome back</h2>
            <p className="mt-1 text-sm text-brand-slate">Sign in to Assessment ai</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {sessionExpired && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Your session expired (often after restarting the API). Please sign in again.
                </p>
              )}
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 border-t border-brand-cream pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-slate">Demo accounts</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Admin', 'admin@pbshope.com', 'admin123'],
                  ['Manager', 'manager@pbshope.com', 'manager123'],
                  ['Rep', 'rep@pbshope.com', 'rep123'],
                ].map(([label, em, pw]) => (
                  <Button key={label} type="button" variant="outline" size="sm" onClick={() => demoLogin(em, pw)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
