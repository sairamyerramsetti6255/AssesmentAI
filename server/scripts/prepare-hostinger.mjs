/**
 * Full-stack Hostinger package: API (dist/) + React UI (public/).
 * Run from repo root: node server/scripts/prepare-hostinger.mjs
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const prototypeDir = path.join(root, 'prototype')
const serverDir = path.join(root, 'server')
const prototypeDist = path.join(prototypeDir, 'dist')
const serverPublic = path.join(serverDir, 'public')

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name)
    const to = path.join(dest, name)
    if (fs.statSync(from).isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

console.log('[hostinger] Building prototype frontend…')
execSync('npm run build', { cwd: prototypeDir, stdio: 'inherit' })

console.log('[hostinger] Copying prototype/dist → server/public…')
rm(serverPublic)
copyDir(prototypeDist, serverPublic)

console.log('[hostinger] Building server API…')
execSync('npm run build', { cwd: serverDir, stdio: 'inherit' })

console.log('[hostinger] Done.')
console.log('  Upload the server/ folder to Hostinger.')
console.log('  Set SERVE_CLIENT=true (or remove SERVE_CLIENT=false) in .env')
console.log('  Start: npm ci --omit=dev && npm start')
