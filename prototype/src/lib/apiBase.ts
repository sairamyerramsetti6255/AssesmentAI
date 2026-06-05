/** Same-origin when unset; set VITE_API_ORIGIN for split frontend/API deploy on Coolify. */
export function resolveApiUrl(path: string): string {
  const origin = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/$/, '')
  if (!origin) return path
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}
