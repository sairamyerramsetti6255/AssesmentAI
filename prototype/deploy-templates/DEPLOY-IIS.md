# Deploy to Windows IIS (secure — API key not in `dist`)

## What you get

| Folder / file | Contains API key? |
|---------------|-------------------|
| `dist/` | **No** — static HTML/JS/CSS only |
| `server.mjs` | **No** — reads key from `.env` at runtime |
| `.env` | **Yes** — create on server only; never upload to public folders |

The browser never receives `OPENROUTER_API_KEY`. AI calls go to `/api/*` on your server.

## 1. Build the package (on your dev machine)

```powershell
cd e:\Cursor_projects\ai_assessment\prototype
npm install
npm run build:iis
```

Output: `prototype/deploy-iis/`

Copy the **entire** `deploy-iis` folder to the server (zip/USB). Do **not** copy your dev `.env` if it might leak via logs; create a fresh `.env` on the server.

## 2. On the Windows Server

1. Install **Node.js 20 LTS** (64-bit).
2. Copy `deploy-iis` to e.g. `C:\apps\ai-readiness\` (outside `inetpub` is fine).
3. Copy `.env.example` → `.env` and set:

   ```
   OPENROUTER_API_KEY=your-real-key-here
   OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
   OPENROUTER_SITE_URL=https://your-domain.com
   OPENROUTER_APP_NAME=AI Readiness Assessment
   ```

4. Run once:

   ```powershell
   cd C:\apps\ai-readiness
   npm install --omit=dev
   ```

5. Start the app:

   - Double-click `START-SERVER.bat`, or
   - `node --env-file=.env server.mjs`

   Test: `http://127.0.0.1:4173` — login and AI features should work.

6. **Run Node as a Windows Service** (recommended) using [NSSM](https://nssm.cc/) or Task Scheduler so it restarts on boot. Working directory = `C:\apps\ai-readiness`, command = `node --env-file=.env server.mjs`.

## 3. IIS (reverse proxy)

Do **not** point the site physical path only at `dist` if you need AI — IIS cannot run the API from static files alone.

1. Install **IIS URL Rewrite** and **Application Request Routing (ARR)**.
2. In ARR: **Server Proxy Settings** → enable proxy.
3. Create a site (e.g. `ai.yourcompany.com`) with an empty or dummy physical path.
4. Copy `web.config` from this template into the site root (or merge the rewrite rule).
5. Ensure Node listens on `127.0.0.1:4173` (default in `server.mjs`).
6. Bind HTTPS in IIS (certificate).

All traffic is proxied to Node, which serves `dist` and handles `/api/*` with the key from `.env`.

## 4. Security checklist

- [ ] `.env` is **not** under a publicly downloadable path; block `.env` in IIS if it ever sits under wwwroot.
- [ ] Never add `VITE_OPENROUTER_API_KEY` — keys must not use the `VITE_` prefix.
- [ ] Do not commit `.env` to git or zip files shared externally.
- [ ] Restrict folder ACLs on `C:\apps\ai-readiness\.env` to Administrators + the service account only.
- [ ] Use HTTPS on IIS for production.

## 5. Verify no key in static build

On the server (optional):

```powershell
Select-String -Path ".\dist\*" -Pattern "sk-or-v1" -Recurse
```

Should return no matches.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| AI buttons fail / 503 | `.env` missing or `OPENROUTER_API_KEY` empty; restart Node after editing `.env`. |
| Blank page on IIS | Node not running, or ARR proxy disabled, or wrong port in `web.config`. |
| 404 on refresh | Node serves SPA fallback via `index.html` — use reverse proxy to Node, not static-only IIS. |
