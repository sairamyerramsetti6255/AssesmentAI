import type { Plugin } from 'vite'
import { createOpenRouterClient, getOpenRouterConfigFromEnv } from './openrouter-client'
import { createApiMiddleware } from './handlers'
import { createResearchMiddleware } from './research-handlers'

export function openrouterApiPlugin(env: Record<string, string>): Plugin {
  const config = getOpenRouterConfigFromEnv(env)

  return {
    name: 'openrouter-api',
    configureServer(server) {
      if (!config) {
        server.config.logger.warn(
          '[openrouter] OPENROUTER_API_KEY not set — /api/chat/* routes disabled. Add key to .env',
        )
        return
      }

      const client = createOpenRouterClient(config)
      const chatMw = createApiMiddleware(client, config)
      const researchMw = createResearchMiddleware(client, config)
      server.middlewares.use((req, res, next) => {
        void researchMw(req, res, () => {
          void chatMw(req, res, next)
        })
      })
      server.config.logger.info(
        `[openrouter] API ready — model: ${config.model}`,
      )
    },
    configurePreviewServer(server) {
      if (!config) return
      const client = createOpenRouterClient(config)
      const chatMw = createApiMiddleware(client, config)
      const researchMw = createResearchMiddleware(client, config)
      server.middlewares.use((req, res, next) => {
        void researchMw(req, res, () => {
          void chatMw(req, res, next)
        })
      })
    },
  }
}
