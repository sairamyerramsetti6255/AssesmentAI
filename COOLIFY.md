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

**Env:**
```
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
OPENROUTER_SITE_URL=https://assessment.pbshope.in
CLIENT_URL=https://assessment.pbshope.in
SERVE_CLIENT=false
```

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
