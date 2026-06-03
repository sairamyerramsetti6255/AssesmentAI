# Coolify deployment — Assessment ai

## Why your build failed

Coolify built from the **repo root** and ran:

1. `npm i` → only installs root `package.json` (no Vite, no server deps in subfolders)
2. `npm run build` → runs **client** build first → `vite: not found` → **exit 127**

The API app must **not** use root build. Use **Base Directory** `server` or `client`.

---

## Fix in Coolify (API backend)

Open your API application → **General** → set:

| Setting | Value |
|---------|--------|
| **Base Directory** | `server` |
| **Build Pack** | Nixpacks **or** Dockerfile |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Port** | `3001` |

**Environment variables:**

```
PORT=3001
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=https://assessment.graylogic.cloud
```

Redeploy. Health: `https://YOUR-API-DOMAIN/api/health`

---

## Frontend (separate app)

| Setting | Value |
|---------|--------|
| **Base Directory** | `client` |
| **Build Command** | `npm ci && npm run build` |
| **Publish / output** | `dist` |
| **Port** | `3000` |

**Build env:**

```
VITE_API_URL=https://YOUR-API-DOMAIN/api
```

---

## Push config updates

```bash
git add .
git commit -m "fix: Coolify server Dockerfile and build docs"
git push origin main
```

Then **Redeploy** with Base Directory = `server` (not empty / root).
