/**
 * Build a deploy folder for IIS: static dist (no secrets) + bundled Node API server.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const deployDir = path.join(root, 'deploy-iis')

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name)
    const d = path.join(dest, name)
    if (fs.statSync(s).isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

function scanForSecrets(dir) {
  const patterns = [/sk-or-v1/i, /OPENROUTER_API_KEY\s*=\s*[^\s#]+/i]
  const hits = []
  function walk(folder) {
    for (const name of fs.readdirSync(folder)) {
      const p = path.join(folder, name)
      const st = fs.statSync(p)
      if (st.isDirectory()) walk(p)
      else if (/\.(js|css|html|json|map)$/i.test(name)) {
        const text = fs.readFileSync(p, 'utf8')
        for (const re of patterns) {
          if (re.test(text)) hits.push(p)
        }
      }
    }
  }
  walk(dir)
  return [...new Set(hits)]
}

console.log('[package-iis] Building frontend…')
const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

console.log('[package-iis] Bundling API server…')
rm(deployDir)
fs.mkdirSync(deployDir, { recursive: true })

const esbuild = spawnSync(
  'npx',
  [
    'esbuild',
    'server/production-server.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--outfile=deploy-iis/server.mjs',
    '--packages=external',
    '--log-level=warning',
  ],
  { cwd: root, stdio: 'inherit', shell: true },
)
if (esbuild.status !== 0) process.exit(esbuild.status ?? 1)

copyDir(path.join(root, 'dist'), path.join(deployDir, 'dist'))

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
fs.writeFileSync(
  path.join(deployDir, 'package.json'),
  JSON.stringify(
    {
      name: 'ai-readiness-iis-deploy',
      private: true,
      type: 'module',
      dependencies: {
        openai: pkg.dependencies.openai,
      },
    },
    null,
    2,
  ) + '\n',
)

fs.copyFileSync(path.join(root, '.env.example'), path.join(deployDir, '.env.example'))

const templates = path.join(root, 'deploy-templates')
for (const name of ['web.config', 'START-SERVER.bat', 'DEPLOY-IIS.md']) {
  fs.copyFileSync(path.join(templates, name), path.join(deployDir, name))
}

const hits = scanForSecrets(deployDir)
if (hits.length) {
  console.error('[package-iis] SECRET SCAN FAILED — possible key in bundle:')
  hits.forEach((h) => console.error('  ', h))
  process.exit(1)
}

console.log('[package-iis] Secret scan: OK (no API keys in deploy-iis/)')
console.log('[package-iis] Output:', deployDir)
