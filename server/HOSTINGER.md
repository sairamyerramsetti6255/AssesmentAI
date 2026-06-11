# Hostinger deployment (Node.js API)

This folder is a self-contained Express API. A production build is committed in `dist/` so you can deploy without running TypeScript on the host.

## What to upload

Upload the entire `server/` directory (or `git pull` on the host):

```
server/
  dist/              ← compiled JS (run npm start)
  package.json
  package-lock.json
  .env               ← create on server (never commit secrets)
```

Do **not** upload `node_modules/` — install on the server with `npm ci --omit=dev`.

## First-time setup on Hostinger

1. **Node.js app** — use Node **22** if available (matches `package.json` / Dockerfile).
2. SSH or File Manager → upload / clone repo into your app root.
3. Set the app **root directory** to `server` (if deploying from monorepo).
4. Install dependencies:
   ```bash
   cd server
   npm ci --omit=dev
   ```
5. Create `.env` from `.env.example` and fill in production values:
   ```env
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   OPENROUTER_API_KEY=...
   OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
   OPENROUTER_SITE_URL=https://assessment.pbshope.in
   OPENROUTER_APP_NAME=AI Readiness Assessment
   CLIENT_URL=https://assessment.pbshope.in
   PORT=3001
   SERVE_CLIENT=false
   ```
6. **Start command:**
   ```bash
   npm start
   ```
   (`npm start` runs `node dist/index.js`.)

## Health check

After deploy, open:

```
https://YOUR-API-DOMAIN/api/health
```

You should get JSON, not 502/503.

## Rebuilding `dist` after code changes

On your dev machine (before pushing to git):

```bash
cd server
npm run build
git add dist/
git commit -m "Rebuild server dist for production"
git push
```

Then on Hostinger: `git pull` → `npm ci --omit=dev` → restart the Node app.

## Frontend

Point the React app (`prototype`) at this API with:

```
VITE_API_ORIGIN=https://YOUR-API-DOMAIN
```

The UI is deployed separately (static build or second Hostinger app).
