/** API base URL — set VITE_API_URL in Coolify build env or .env.production */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';
