# Coolify deployment — Assessment ai

## You have two choices

### Option A — One app (recommended, fixes CORS)

Serve **frontend + API on the same domain** (e.g. your API URL). No cross-origin requests.

| Setting | Value |
|---------|--------|
| **Base Directory** | `.` (repo root, empty = root) |
| **Dockerfile** | `Dockerfile` (in repo root) |
| **Port** | `3001` |

**Env:**

```
PORT=3001
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=https://YOUR-DOMAIN
SERVE_CLIENT=true
```

Open `https://YOUR-API-DOMAIN/` in the browser (not graylogic unless you point DNS there).

---

### Option B — Two apps (frontend + API separate)

**API app** — Base Directory: `server`

```
PORT=3001
GEMINI_API_KEY=your-key
CLIENT_URL=https://assessment.graylogic.cloud
```

**Frontend app** — Base Directory: `client`

```
VITE_API_URL=https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in/api
```

Build and redeploy **both**. CORS now allows `assessment.graylogic.cloud` and `*.pbshope.in` / `*.graylogic.cloud` automatically.

Check API: `https://YOUR-API/api/health` → should list `cors_origins`.

---

## If login still fails

1. Hard refresh (Ctrl+Shift+R).
2. DevTools → Network → `login` → if **CORS**, redeploy API with latest `main`.
3. If **404/502**, API is down or wrong URL in frontend build.
4. Temporarily set `CORS_ALLOW_ALL=true` on API (debug only), redeploy, test login.
