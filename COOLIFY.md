# Coolify — your setup (2 apps)

You have **two domains**. Use these exact settings:

---

## App 1 — API (`zo0go8484gkscgo0o4o8o0s4.api.pbshope.in`)

| Setting | Value |
|---------|--------|
| Base Directory | `server` |
| Dockerfile | `Dockerfile` |
| Ports Exposes | `80` |
| **Do NOT set** | `PORT=3001` |

**Env (required — without Supabase, login returns 500):**
```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=google/gemma-3-12b-it:free
OPENROUTER_JSON_MODEL=google/gemma-3-12b-it:free
OPENROUTER_SITE_URL=https://assessment.pbshope.in
OPENROUTER_APP_NAME=AI Readiness Assessment
CLIENT_URL=https://assessment.pbshope.in
SERVE_CLIENT=false

# Fallback when OpenRouter free tier hits 50/day limit (copy from local server/.env)
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash
AI_GEMINI_FALLBACK=true
```

### OpenRouter rate limit (429)

Free models are capped at **50 requests/day** per OpenRouter account. When exceeded you see:
`429 Rate limit exceeded: free-models-per-day`

**Fix (pick one):**
1. Add **$10 credits** at [openrouter.ai/settings/credits](https://openrouter.ai/settings/credits) → 1000 free requests/day
2. Set **`GEMINI_API_KEY`** on the API app (auto-fallback when rate limited, if `AI_GEMINI_FALLBACK=true`)
3. Wait until the daily reset

Get Supabase values: **Supabase Dashboard → Project Settings → API** (use **service_role**, not anon, for `SUPABASE_SERVICE_ROLE_KEY`).

Copy the same three values from your local `server/.env` — do **not** commit `.env` to git; paste them into Coolify **Environment Variables** and redeploy.

**Test:** `https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in/api/health` → JSON (not Bad Gateway)

---

## App 2 — Frontend (`assessment.pbshope.in`)

| Setting | Value |
|---------|--------|
| Base Directory | `prototype` |
| Dockerfile | `Dockerfile` |
| Ports Exposes | `80` |

**Build arg / env (optional override):**
```
VITE_API_ORIGIN=https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in
```

Default is baked into `prototype/Dockerfile`. Redeploy after API app works.

**Do not** expect `assessment.pbshope.in/api/health` to work — API lives on the **api** subdomain. The UI calls that URL automatically.

---

## Port mismatch warning

If Coolify says `PORT (3001) does not match ports_exposes: 80`:
- **Delete `PORT=3001`** from environment variables
- Keep **Ports Exposes = 80**

---

## One-app alternative (optional)

Root `Dockerfile`, Base Directory `.`, one domain serves UI + API. Not needed if you keep two apps.
