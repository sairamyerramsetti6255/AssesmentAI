/// <reference types="vite/client" />

/**
 * Only VITE_* variables are exposed to client code.
 * Do NOT add VITE_OPENROUTER_API_KEY — keep secrets in .env without the VITE_ prefix.
 */
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  /** e.g. https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in — empty = same-origin /api */
  readonly VITE_API_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
