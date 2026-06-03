# Assessment ai

Full-stack AI readiness assessment platform (client + server).

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS with sidebar app shell
- **Backend**: Node.js + Express
- **Storage**: In-memory demo store (data re-seeds on each server restart)
- **AI**: Google Gemini (research + question generation; optional API key)

## Quick Start

```bash
# Install dependencies (run from project root)
npm run install:all

# Start both client and server (from project root)
npm run dev
```

Or run separately:

```bash
# Terminal 1 — API (port 3001)
cd server
npm install
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client
npm install
npm run dev
```

**Do not run** `node index.ts` — the entry file is `server/src/index.ts`. Use `npm run dev` or `npm start` (after `npm run build`).

- **Client**: http://localhost:5173
- **API health**: http://localhost:3001/api/health (returns `{ mode: "memory" }`)

### Environment

Copy `server/.env.example` to `server/.env`. Only required variables:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default 3001) |
| `CLIENT_URL` | CORS origin (default http://localhost:5173) |
| `GEMINI_API_KEY` | Enables AI research & question generation (Gemini 2.5 Flash) |
| `GEMINI_MODEL` | Optional — default `gemini-2.5-flash` |

On Windows, if Gemini calls fail with a TLS/certificate error, use `npm run dev` in `server/` (enables `--use-system-ca`).

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@pbshope.com | admin123 |
| Sales Manager | manager@pbshope.com | manager123 |
| Sales Rep | rep@pbshope.com | rep123 |

On login, the server seeds **4 assessments** (manager sees all 4; rep sees 2 assigned). Data resets when the server restarts.

## 16-Step User Journey

0. Authentication & User Management
1. Manager Pre-Assessment & Deep Research
2. Document Intelligence & AI Extraction
3. AI Dynamic Question Generation
4. Live Assessment Session (Sales Rep)
5. Voice Recording & Transcription
6. Question Management (Modify/Skip/Delete)
7. Assessment Scoring & Results
8. Gap Analysis & Recommendations
9. PoC Plan Generator
10. Proposal Generator
11. Reports & Analytics Dashboard
12. Chatbot AI Assistant
13. Notification System
14. Admin Panel
15. Audit & Compliance

## Smoke Test

1. Login as **manager** → Dashboard shows 4 assessments
2. Open **Acme Financial Corp** → complete wizard steps 1–5
3. Login as **rep** → see Nova Health + Pilot Logistics assigned
4. Start live session on Nova → complete → score → gap analysis → proposal

## Project Structure

```
/client          React + Vite frontend (sidebar layout)
/server          Express API + in-memory demoStore
/supabase        Archived SQL reference (not used at runtime)
```

## Archived Reference

The `supabase/` folder contains historical migrations and seed SQL. The app no longer connects to Supabase or PostgreSQL at runtime.
