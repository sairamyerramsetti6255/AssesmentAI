/** Coolify API — used when the static site is not served from the API host. */
export const PBS_LIVE_API_BASE = 'https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in'

function resolveApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  if (typeof window === 'undefined') return ''

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return ''
  }

  return PBS_LIVE_API_BASE
}

/** Dev: empty base → Vite proxy `/api` → localhost:3001. Live: production API host. */
export function apiUrl(path: string): string {
  const base = resolveApiBase()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}

export function apiBaseForDisplay(): string {
  return resolveApiBase() || '(local proxy)'
}
