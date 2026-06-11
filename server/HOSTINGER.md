# Hostinger deployment

Two supported setups. Pick the one that matches how you deployed.

---

## Option A — Full app on Hostinger Node.js (UI + API, one domain)

Use this if you open the website on the **same URL** as the Node app and want refresh on `/assessment`, `/proposal`, etc. to work.

### Build on your PC

From the repo root:

```bash
node server/scripts/prepare-hostinger.mjs
```

This builds `prototype/dist` → copies to `server/public/`, then compiles `server/dist/`.

### Upload `server/` folder

```
server/
  dist/              ← API
  public/            ← React UI (index.html + assets)
  package.json
  package-lock.json
  .env
```

### `.env` (important)

```env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
OPENROUTER_SITE_URL=https://YOUR-DOMAIN
OPENROUTER_APP_NAME=AI Readiness Assessment
CLIENT_URL=https://YOUR-DOMAIN
SERVE_CLIENT=true
PORT=3001
```

Without `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `/api/proto/auth/login` returns **500**.

Do **not** set `SERVE_CLIENT=false` for this option — that disables the UI and causes **404 on page refresh**.

### Start

```bash
cd server
npm ci --omit=dev
npm start
```

Express serves `public/` and falls back to `index.html` for all non-`/api` routes.

---

## Option B — API only on Node.js, UI as static files

Use this if the React app is uploaded separately (e.g. `public_html`).

### API (`server/`)

Same as before — `SERVE_CLIENT=false`, `npm start`, health check at `/api/health`.

### Frontend (`prototype/dist/`)

Upload the **entire** `prototype/dist/` folder to your static site root, including:

- `index.html`
- `assets/`
- **`.htaccess`** (Apache / most Hostinger shared hosting)
- **`web.config`** (only if Hostinger uses IIS)

Build with:

```bash
cd prototype
npm run build
```

Set build-time API URL if needed:

```bash
VITE_API_ORIGIN=https://YOUR-API-DOMAIN npm run build
```

---

## Fix: 404 when refreshing the page

| Symptom | Cause | Fix |
|--------|--------|-----|
| Refresh on `/assessment` → 404 | Static hosting without SPA fallback | Ensure `.htaccess` is in the uploaded `dist/` root (Apache) |
| Refresh on `/assessment` → 404 | Node app with `SERVE_CLIENT=false` and no `public/` | Use **Option A**: run `prepare-hostinger.mjs`, set `SERVE_CLIENT=true` |
| Only `server/dist/` uploaded to web root | That folder is API code, not a website | Upload `prototype/dist/` for UI, or use Option A |
| Home page works, refresh fails | Missing rewrite rules | Re-upload dist with `.htaccess` + `web.config` |

After fixing, hard-refresh (Ctrl+F5) or clear Hostinger cache.

---

## Health check

```
https://YOUR-API-DOMAIN/api/health
```

Should return JSON.

## Rebuild after code changes

**API only:**

```bash
cd server && npm run build
```

**Full stack (UI + API):**

```bash
node server/scripts/prepare-hostinger.mjs
```

Then re-upload / `git pull` and restart the Node app on Hostinger.
