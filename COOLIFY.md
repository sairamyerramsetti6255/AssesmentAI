# Coolify deployment — Assessment ai

## You have two choices

### Option A — One app (recommended, fixes CORS)

Serve **prototype UI + API on the same domain**. The root `Dockerfile` builds **prototype** (not `client`) and serves it from `/public`. All AI calls use **OpenRouter** on the Node server (`/api/research/*`, `/api/assessment/*`, `/api/chat/completions`).

| Setting | Value |
|---------|--------|
| **Base Directory** | `.` (repo root, empty = root) |
| **Dockerfile** | `Dockerfile` (in repo root) |
| **Port** | `3001` |

**Env:**

```
PORT=3001
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
OPENROUTER_SITE_URL=https://assessment.pbshope.in
OPENROUTER_APP_NAME=AI Readiness Assessment
CLIENT_URL=https://assessment.pbshope.in
SERVE_CLIENT=true
```

Open `https://YOUR-API-DOMAIN/` in the browser (not graylogic unless you point DNS there).

---

### Option B — Two apps (frontend + API separate)

**API app** — Base Directory: `server`

```
PORT=3001
GEMINI_API_KEY=your-key
CLIENT_URL=https://assessment.pbshope.in
```

**Frontend app** — Base Directory: `client`

```
VITE_API_URL=https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in/api
```

Build and redeploy **both**. CORS now allows `assessment.graylogic.cloud` and `*.pbshope.in` / `*.graylogic.cloud` automatically.

Check API: `https://YOUR-API/api/health` → should list `cors_origins`.

---

## If login still fails

### 1. API must NOT show “Welcome to nginx!”

Open `https://YOUR-API-DOMAIN/api/health` in a browser.

| What you see | Meaning |
|--------------|---------|
| JSON `{ "status": "ok", ... }` | API is running — check CORS / frontend `VITE_API_URL` |
| **Welcome to nginx!** | Wrong Coolify app — Node API is **not** deployed on this domain |
| 404 / 502 | App crashed, wrong port, or wrong base directory |

**Fix nginx-only domain:** In Coolify, use **Application** (Dockerfile), not a static/nginx template.

| Setting | API app |
|---------|---------|
| Base Directory | `server` |
| Dockerfile | `server/Dockerfile` (or `Dockerfile` in server folder) |
| Port | `3001` |
| Health check path | `/api/health` |

Redeploy, then `/api/health` must return JSON before login will work.

### 2. Frontend build

`VITE_API_URL=https://YOUR-API-DOMAIN/api` (no trailing slash issues — app normalizes).

Rebuild frontend after changing it.

### 3. Env on API (not Gemini key in CLIENT_URL)

```
CLIENT_URL=https://assessment.pbshope.in
PORT=3001
```

### 4. Other checks

1. Hard refresh (Ctrl+Shift+R).
2. DevTools → Network → `login` → if **CORS**, fix `CLIENT_URL` and redeploy API.
3. Temporarily `CORS_ALLOW_ALL=true` on API (debug only).

Demo login: `manager@pbshope.com` / `manager123`
