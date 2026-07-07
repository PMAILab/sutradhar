# Sutradhar, Detailed Build Plan

This is the engineering plan behind the PRD (Sutradhar_PRD_v2.1.docx). It exists so the MVP gets built in an order that doesn't waste time, and so the two things most likely to slip, WhatsApp template approval and the cultural knowledge base, get started first instead of last.

## 1. This is a fresh build, not a migration

Aayush's call: no use of the existing PlanMyVows code at all. This is a brand new repository, built for a completely different persona (a solo planner, not a couple), and nothing from the old frontend only, no backend, single wedding app carries over, not even the marigold celebration micro interaction. Treat this as a whole new revamped project from an empty repo.

## 2. Architecture

**Frontend:** React 19 plus Vite, built fresh, deployed on **Netlify**. Router structure is built from day one around a planner's multiple concurrent events, there is no single wedding assumption anywhere in this codebase.

**Backend, new:** a small Node plus Express service, deployed on **Render**. This is the first time this product has needed a backend at all. Two reasons it can't be skipped this time: WhatsApp webhooks need a public HTTPS endpoint to call, and a planner managing several weddings needs real persistence across sessions and devices, not local state that resets on refresh.

**Database:** Postgres (Supabase is a reasonable managed option, same choice TailorTrip made, keeps the stack familiar). Core tables: planners, events (one row per wedding, belongs to a planner), ceremonies (belongs to an event), tasks (belongs to a ceremony or event), vendors (belongs to an event), messages (WhatsApp send and reply log, belongs to a vendor or family contact), gaps (Completeness Copilot flags, belongs to an event, with a dismissed flag so a dismissed suggestion never resurfaces).

**AI layer:** Gemini, for two jobs only, the Intake Parser (raw text to structured ceremony plan) and the Completeness Copilot (structured plan plus a religion and region tagged ceremony knowledge base, returns gap suggestions). Keep these as two distinct prompts and two distinct backend endpoints, not one do-everything prompt, so each can be tuned and evaluated separately. The Gemini key lives only in the Render backend's environment variables, never in the Netlify frontend build.

**WhatsApp:** direct integration with Meta's Cloud API from the Express backend. No third party workflow tool. See Section 4 for the actual steps, since this has the longest lead time of anything in this plan and should start in week one.

## 3. Build phases

**Phase 0, before any code (days 1 to 3, parallel with Phase 1)**
- Register the Meta for Developers app, create the WhatsApp Business product, claim the free test business phone number.
- Publish a privacy policy page (a single static page is enough for now).
- Draft and submit the three MVP message templates (confirmation request, payment reminder, plan update) for Meta's review. This step alone can take several days and templates can bounce back needing rewording, so it starts now, not when the backend is ready to send anything.

**Phase 1, backend and data model (week 1)**
- Stand up the Express service and Postgres schema described above.
- Build planner auth: email plus password, and Google sign in. Both are required for the MVP.
- Build the core CRUD for events, ceremonies, tasks, vendors, so there's something real for the frontend to render against.

**Phase 2, Intake Parser and Completeness Copilot (week 2)**
- Intake Parser endpoint: takes pasted text, returns a structured ceremony by ceremony plan. Test it against real messy input, not clean sample text, since the whole point is handling a rough client brief.
- Build the initial ceremony knowledge base (start with 4 to 6 common Indian ceremony types across 2 to 3 religions or regions, expand later rather than trying to cover everything on day one).
- Completeness Copilot endpoint: takes the structured plan plus the knowledge base, returns gap suggestions with a reason attached to each one, not just a bare flag.

**Phase 3, WhatsApp automation (week 2 to 3, once templates are approved)**
- Wire up sending the three approved templates from the backend when a vendor or family contact needs a confirmation, payment reminder, or update.
- Build the webhook receiver for inbound replies and delivery status.
- Build the classification step (confirmed, declined, no response after N hours) and the escalation rule that surfaces a non responsive vendor to the planner instead of retrying silently.

**Phase 4, Daily Prioritization Engine and Multi Event Dashboard (week 3)**
- A ranking function across all of a planner's active events: overdue vendor confirmations first, upcoming ceremony deadlines next, unresolved Completeness Copilot gaps last. Keep the ranking rule simple and explainable for the MVP, this doesn't need to be a learned model yet.
- Build the dashboard screen itself against this ranking.

**Phase 5, frontend polish and demo readiness (week 4)**
- Build out the remaining screens against the Stitch designs (see the design brief).
- Add loading, empty, and error states to every AI facing surface, an AI call that just spins forever or fails silently looks broken in a demo.
- Deploy the frontend to Netlify and the backend to Render.

## 4. WhatsApp integration steps in order

1. Meta for Developers account, create app, add WhatsApp product.
2. Claim the free test business phone number, verify up to 5 recipient numbers for demo purposes (your own number, a teammate's, someone playing "vendor").
3. Publish the privacy policy URL Meta requires.
4. Submit the display name for approval.
5. Draft and submit the three message templates. Keep the wording plainly utilitarian (a status update or a confirmation ask), since anything that reads as promotional gets rejected.
6. Once approved, build the send and webhook flow in the backend.
7. Stay within the unverified tier's 250 conversations per rolling 24 hours for the MVP. Full Business Verification is a later step, only worth doing once there's a real planner using this beyond a demo.

## 5. What's genuinely out of scope for the MVP

No multi user roles or team dashboard (that's the boutique firm persona, Next horizon). No enterprise permissions or SSO (big event company persona, Later horizon). No vendor marketplace or lead generation surface. No couple facing app at all, that direction was deliberately dropped.

## 6. Open questions to settle before coding starts

- Is there a Gemini API budget or rate limit to design around, or is a standard key enough for demo scale traffic.
- Whether the Meta WhatsApp test number, privacy policy page, and message templates from Phase 0 are already set up by the time coding starts, or need to be done in parallel.
