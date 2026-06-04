/** Frontend demo mode — no Gemini required. Set VITE_DEMO_MODE=false to use live AI. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE !== 'false';
}
