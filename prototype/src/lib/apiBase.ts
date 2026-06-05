/** Production API (Coolify server app). Overridden by VITE_API_ORIGIN at build time. */
const PRODUCTION_API_ORIGIN = 'https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in'

export function getApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.PROD) return PRODUCTION_API_ORIGIN
  return ''
}

export function resolveApiUrl(path: string): string {
  const origin = getApiOrigin()
  if (!origin) return path
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}
