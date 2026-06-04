/**
 * Production server: static dist + OpenRouter API (key from .env on disk only).
 * Run from deploy folder: node --env-file=.env server.cjs
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOpenRouterClient, getOpenRouterConfigFromEnv } from './openrouter-client'
import { createApiMiddleware } from './handlers'
import { createResearchMiddleware } from './research-handlers'

/** Deploy folder (server.mjs and dist/ are siblings). */
const DEPLOY_ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(DEPLOY_ROOT, 'dist')
const PORT = Number(process.env.PORT || 4173)
const HOST = process.env.HOST || '127.0.0.1'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
}

function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): boolean {
  const url = req.url?.split('?')[0] ?? '/'
  if (url.startsWith('/api/')) return false

  let filePath = path.join(DIST_DIR, url === '/' ? 'index.html' : url)
  if (!filePath.startsWith(DIST_DIR)) {
    res.statusCode = 403
    res.end('Forbidden')
    return true
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  const ext = path.extname(filePath)
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=86400')
  fs.createReadStream(filePath).pipe(res)
  return true
}

function chain(
  middlewares: Array<
    (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
  >,
) {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    let i = 0
    const next = () => {
      const fn = middlewares[i++]
      if (fn) fn(req, res, next)
      else if (!res.writableEnded) {
        res.statusCode = 404
        res.end('Not found')
      }
    }
    next()
  }
}

const env = Object.fromEntries(
  Object.entries(process.env).filter((e): e is [string, string] => e[1] != null),
)
const config = getOpenRouterConfigFromEnv(env)

const apiStack: Array<
  (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
> = []

if (config) {
  const client = createOpenRouterClient(config)
  const researchMw = createResearchMiddleware(client, config)
  const chatMw = createApiMiddleware(client, config)
  apiStack.push((req, res, next) => {
    void researchMw(req, res, () => {
      void chatMw(req, res, next)
    })
  })
} else {
  apiStack.push((req, res, next) => {
    const url = req.url?.split('?')[0] ?? ''
    if (url.startsWith('/api/')) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: 'OPENROUTER_API_KEY not configured on server. Add .env next to server.cjs.',
        }),
      )
      return
    }
    next()
  })
}

const handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const url = req.url?.split('?')[0] ?? ''
  if (url.startsWith('/api/')) {
    chain(apiStack)(req, res)
    return
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res)
    return
  }

  res.statusCode = 405
  res.end('Method not allowed')
}

if (!fs.existsSync(DIST_DIR)) {
  console.error(`[production] dist/ not found at ${DIST_DIR}`)
  process.exit(1)
}

http.createServer(handler).listen(PORT, HOST, () => {
  console.log(`[production] http://${HOST}:${PORT}`)
  console.log(`[production] static: ${DIST_DIR}`)
  console.log(
    config
      ? `[production] OpenRouter API enabled (model: ${config.model})`
      : '[production] WARNING: OPENROUTER_API_KEY missing — AI routes return 503',
  )
})
