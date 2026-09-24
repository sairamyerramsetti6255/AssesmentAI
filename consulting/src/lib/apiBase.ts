/** Production: set VITE_API_BASE_URL (no trailing slash). Dev: empty → Vite proxy to localhost. */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}
