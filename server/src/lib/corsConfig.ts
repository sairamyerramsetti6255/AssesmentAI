/** Origins always allowed in production (extend via CLIENT_URL / CORS_ORIGINS) */
const BUILTIN_ORIGINS = [
  'https://assessment.pbshope.in',
  'https://assessment.graylogic.cloud',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function getAllowedOrigins(): string[] {
  const fromList = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const client = process.env.CLIENT_URL?.trim().replace(/\/$/, '');
  return [...new Set([...BUILTIN_ORIGINS, ...fromList, ...(client ? [client] : [])])];
}

export function isOriginAllowed(origin: string | undefined, allowedList: string[]): boolean {
  if (process.env.CORS_ALLOW_ALL === 'true') return true;
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, '');
  if (allowedList.includes(normalized)) return true;

  try {
    const { hostname } = new URL(normalized);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (
      hostname === 'pbshope.in' ||
      hostname.endsWith('.pbshope.in') ||
      hostname.endsWith('.graylogic.cloud')
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
