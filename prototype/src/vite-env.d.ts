/// <reference types="vite/client" />

/**
 * Only VITE_* variables are exposed to client code.
 * Do NOT add VITE_OPENROUTER_API_KEY — keep secrets in .env without the VITE_ prefix.
 */
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
