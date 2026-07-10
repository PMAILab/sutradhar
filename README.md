# Sutradhar

Sutradhar is an AI copilot for solo Indian wedding planners. It takes a planner from a
messy, unstructured client brief (WhatsApp texts, voice notes, a rough call summary) to a
fully organized, culturally accurate wedding plan, then keeps chasing vendors and family
on WhatsApp so the planner isn't the only one doing it.

The name means "the one who holds the thread", the narrator in Indian classical theatre
who ties every scene together without stepping into the drama itself. That's the product's
job: hold the thread across every ceremony, vendor, and conversation in a wedding season,
across every wedding a planner is running at once.

This is built for a working professional managing several weddings concurrently at a desk,
not a couple planning their own wedding. There is no single-wedding assumption anywhere in
this codebase.

## What it actually does

- **Intake Parser**: paste a client's raw WhatsApp export or notes, get back a structured,
  ceremony-by-ceremony plan (Haldi, Mehendi, Sangeet, Wedding, Reception, or whichever
  ceremonies apply to that tradition). Ambiguous details come back as conflicts the planner
  resolves with one tap instead of the AI guessing.
- **Completeness Copilot**: reads the structured plan against a religion- and
  region-tagged ceremony knowledge base and flags what's commonly missing, each with a
  plain-language reason attached, not a bare checklist item. A dismissed suggestion never
  resurfaces for that wedding.
- **Daily Prioritization Engine**: ranks what needs attention across every active wedding
  a planner is running — overdue vendor confirmations first, approaching ceremony
  deadlines next, unresolved Completeness Copilot gaps last. A simple, explainable tier
  ranking, not a learned model.
- **WhatsApp vendor automation**: sends confirmation requests, payment reminders, and plan
  updates to vendors and family contacts over the WhatsApp Cloud API, classifies replies
  (confirmed / declined / needs review), and escalates a vendor to "needs attention" if
  there's been no reply for 48 hours instead of retrying silently.

## How the AI layer works

Two distinct Gemini prompts, two distinct backend endpoints, kept separate on purpose so
each can be tuned and evaluated independently instead of one do-everything prompt:

1. `POST /api/intake/parse` — raw text in, structured `StructuredPlan` JSON out
   (`backend/src/routes/intake.ts`).
2. `POST /api/copilot/check-gaps` — structured plan + ceremony knowledge base in, a list of
   gap suggestions out, each with a reason (`backend/src/routes/copilot.ts`).

Both call `backend/src/lib/gemini.ts`, which wraps the Gemini API (`gemini-flash-latest`,
JSON response mode — a rolling alias, not a pinned version, since pinned Gemini model ids
get retired from new-user access over time). The Gemini key lives only in the backend's
environment, never shipped to the frontend build. Neither endpoint fails closed: no key
configured, or a real Gemini error (quota, outage), falls back to a deterministic result
instead of a broken screen — Intake Parser drops the raw brief into one "Review this brief"
ceremony, Completeness Copilot treats every candidate as an unconfirmed gap rather than
hiding the panel. Real results are cached in-process (`backend/src/lib/cache.ts`) for a
few minutes so revisiting the same event doesn't re-spend a call.

## How auth works

The frontend never talks to Supabase directly and never holds a Supabase key — every auth
action goes through the backend (`backend/src/routes/auth.ts`), which sets an httpOnly,
same-site session cookie (`sd_at`/`sd_rt`). Email/password sign-in is a normal POST.
`requireAuth` (`backend/src/middleware/requireAuth.ts`) reads that cookie on every protected
route. Without `SUPABASE_URL`/`SUPABASE_ANON_KEY` configured, auth falls back to a mock
cookie so the UI itself is still explorable — but no real event/vendor data, since that has
no local fallback and genuinely needs Supabase.

All of this rides on one infrastructure trick: **Netlify proxies `/api/*` to Render
server-to-server** (`netlify.toml`), and Vite's dev server does the same locally
(`frontend/vite.config.ts`). The browser only ever talks to one origin — the frontend's —
so the session cookie is genuinely first-party (Safari and an increasing share of Chrome
silently drop third-party cookies, which breaks a naive cross-origin CORS+credentials setup
even with correct config). The frontend's `API_BASE_URL` (`frontend/src/lib/api.ts`) is
always the empty string on purpose, every call is a relative `/api/...` path — never set
`VITE_API_BASE_URL`, it would defeat the whole point.

Google sign-in rides the same proxy: `GET /api/auth/google` sets `redirectTo` to
`APP_ORIGIN` (the Netlify URL, despite the confusing name — see `backend/src/lib/origins.ts`)
plus `/api/auth/google/callback`, since that's the only origin this project's shared
Supabase instance has allow-listed for redirects. The browser navigates there directly;
Netlify's proxy forwards that specific request to this same backend route
(`GET /api/auth/google/callback` in `backend/src/routes/auth.ts`), which does the real
`exchangeCodeForSession` and sets the session cookie. No relay page, no extra hop, the
browser was never actually talking to Render.

Locally, Vite's dev proxy has the same job as Netlify's, but rewrites the Host header when
forwarding, so the backend can't reliably derive its own request's origin — `backend/.env.example`
ships `APP_ORIGIN=http://localhost:5173` by default for exactly this reason. Don't blank it
out for local dev; without it, Google sign-in still "succeeds" but scopes the session cookie
to `localhost:4000`, which the frontend's own `:5173`-proxied requests never send back.

## How WhatsApp automation works

Direct integration with Meta's WhatsApp Cloud API from the Express backend
(`backend/src/lib/whatsapp.ts`), no third-party workflow tool in between. Sending goes
through one of three approved message templates (confirmation request, payment reminder,
plan update — see `docs/whatsapp_templates.md`). Inbound replies and delivery status land
on the webhook receiver (`backend/src/routes/whatsappWebhook.ts`), get classified by
keyword matching in `backend/src/data/store.ts`, and a vendor with no reply after 48 hours
flips to "needs attention" so it surfaces on the Dashboard and the event's Vendors tab
instead of silently retrying.

## Project layout

```
frontend/   React 19 + Vite + Tailwind, deployed on Netlify
backend/    Node + Express + Supabase (Postgres), deployed on Render
docs/       PRD, build plan, Stitch design brief, WhatsApp template copy
```

Core data model (`backend/supabase/schema.sql`): planners → events (one row per wedding) →
ceremonies → tasks, plus vendors → messages (WhatsApp log), and conflicts for anything the
Intake Parser needs the planner to resolve.

## Local setup

Requires Node 20+, a Supabase project, a Gemini API key, and (optionally, for real sends) a
Meta WhatsApp Cloud API test number.

```bash
cp backend/.env.example backend/.env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, WHATSAPP_*

npm run install:all   # installs both frontend/ and backend/
npm run dev:all        # runs both dev servers together — frontend :5173, backend :4000
```

No env file on the frontend side at all, by design, and none needed in prod either. It
never holds a Supabase key — all auth and data calls go through the backend over a relative
`/api/...` path, proxied to the backend by Vite locally and by Netlify in prod (see "How
auth works" below). There's no `VITE_API_BASE_URL` to set anywhere; `npm run dev:all`
already wires Vite's dev proxy to `localhost:4000`.

Run each side separately instead, if preferred: `npm run server` (backend only) or
`npm run dev` (frontend only) from the repo root, or the usual `cd backend && npm run dev` /
`cd frontend && npm run dev` from each directory.

Run `backend/supabase/schema.sql` once in the Supabase SQL Editor to create the
`sutradhar` schema before starting the backend. Demo data is never seeded into a real
database — see "Mock mode" below for exploring the UI without a real Supabase project or
client brief on hand.

Without `WHATSAPP_ACCESS_TOKEN` set, vendor sends fail gracefully and log the attempt as
"failed" in message history instead of throwing — the rest of the app works fine for a demo.

## Mock mode

Leave `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` unset in `backend/.env`
and the whole app is still fully explorable, read and write, with zero backend
configuration — no database, no real account. `GET /api/auth/session` reports
`{ user, mock: true }`, and `frontend/src/lib/mockStore.ts` takes over every event/vendor/
profile read and write, backed by `localStorage` instead of a network call: three sample
weddings, add-a-task, send-a-message, mark-successful, all of it, persisted on that one
browser only. Sign in with any email and password, nothing is checked. The Completeness
Copilot is the one thing mock mode doesn't fake — it returns an honest empty state instead
of fabricated gap suggestions, since there's no AI knowledge base to check client-side.

This is a genuine standalone demo path, not a stub: it's what `npm run dev:all` gives you
with a freshly cloned repo and no `.env` filled in at all.

## Deploy

- **Frontend** → Netlify (`netlify.toml`), build command `npm run build`, publish
  `frontend/dist`. Its `/api/*` redirect proxies to the Render backend server-to-server —
  update the target host in `netlify.toml` if the Render service is ever renamed. Never set
  `VITE_API_BASE_URL`, the frontend's calls must stay relative for the proxy (and therefore
  the first-party session cookie) to work at all.
- **Backend** → Render (`render.yaml`), build command `npm run build`, start command
  `npm start`, health check `/health`. Set every `sync: false` var in the Render dashboard:
  - `APP_ORIGIN` = the Netlify site's own URL (e.g. `https://sutradhar.netlify.app`) — NOT
    this service's onrender.com URL. The browser navigates here directly for the Google
    OAuth round trip; Netlify's proxy then forwards it to this backend. This is also the
    callback URL to allow-list in Supabase → Authentication → URL Configuration → Redirect
    URLs: `<APP_ORIGIN>/api/auth/google/callback`. This project's shared Supabase instance
    only has the Netlify origin allow-listed, not Render's — that's the entire reason the
    proxy setup exists instead of a simpler direct cross-origin call.
  - `FRONTEND_ORIGIN` = same Netlify URL — only used as a CORS allow-list fallback for
    anyone hitting this API directly instead of through the Netlify proxy.
  - `NODE_ENV=production` — switches session cookies to `secure`, `sameSite: none`, as a
    fallback for that same direct-access case.

## Further reading

`docs/Sutradhar_PRD_v2.1.docx` has the full product spec. `docs/Sutradhar_Build_Plan.md`
has the phased engineering plan and WhatsApp integration steps in order.
`docs/Sutradhar_Stitch_Design_Brief.md` has the design system and per-screen briefs used to
generate this app's UI.
