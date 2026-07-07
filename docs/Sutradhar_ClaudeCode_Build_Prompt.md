# Sutradhar, Claude Code Build Prompt

Paste everything below into Claude Code inside the Sutradhar repo. It is written to make Claude Code ask questions before building, so there are fewer bugs and less rework.

---

You are my senior full stack engineer building **Sutradhar**, an AI copilot for solo wedding planners, from a brand new, empty repository. This is a responsive web app with login. I have the product spec, a detailed build plan, and the visual designs (in Stitch, connected to you). There is no existing codebase to build on, an earlier, unrelated version of this product exists but is being fully discarded, do not look for it or reference it. Your job is to build the MVP to a finished, demo ready state against the designs, the PRD, and the build plan, from scratch.

**Do not start coding yet. First read the context, then ask me your questions, then propose a detailed plan and wait for my go ahead.** I would rather answer ten questions now than fix ten bugs later.

## Ways of working (important)

1. Work on a **new branch called `feature/aayush`**, created from the current main branch. Never commit to main. Confirm the branch is created before your first commit.
2. Before writing code, ask me every clarifying question you have. Group them so I can answer in one pass. If something is ambiguous mid build, stop and ask rather than guessing.
3. After my answers, give me a short build plan (phases and what each delivers) and wait for my approval before you start.
4. Build in small, reviewable increments. Commit often with clear messages. After each meaningful chunk, tell me what you did and what is next.
5. Never hardcode secrets. All keys (database, LLM, WhatsApp) come from environment variables and a `.env` that is gitignored.
6. Keep the app building and lint clean at every step. Run the build and type check before you say something is done.
7. If you change the plan or discover the spec is wrong, tell me and pause.

## Context to read first

- **Product spec:** `Sutradhar_PRD_v2.1.docx` in this repo's `docs/` folder. Read it before you do anything else, it defines the pivot rationale, the market and competitive research, the solo planner persona, the four MVP capabilities, requirements, prioritization, GTM, success metrics, and risks. Everything you build should trace back to a decision made in this document.
- **Build plan:** `Sutradhar_Build_Plan.md`, also in `docs/`. It lays out the architecture, the data model, the phase order, and specifically the WhatsApp integration steps in the order they need to happen, since template approval has the longest lead time of anything here and should start immediately, not last.
- **Designs:** the Stitch designs are connected to you, built from `Sutradhar_Stitch_Design_Brief.md`. Match them closely: a professional, seamless SaaS feel with a warm ink, deep maroon, and marigold gold palette, not a dreamy couple facing aesthetic.
- **Existing code:** none. This is a fresh repository. An earlier, unrelated version of this product exists elsewhere but is being fully discarded, treat this as a brand new project with no prior code to reuse, extend, or reference.

## What the product must do (MVP scope)

Built for one persona only: the solo, independent wedding planner with no team. Wedding vertical only.

1. **Auth:** planner signs up and logs in via email and password, or via Google sign in. Both are required for the MVP.
2. **Multi event dashboard:** every active wedding the planner is running, with a daily prioritization view surfacing the two or three most urgent items across all of them, not just one event at a time.
3. **New client intake:** paste a raw WhatsApp brief or notes; the Intake Parser structures it into a ceremony by ceremony plan.
4. **Completeness Copilot:** checks the structured plan against a religion and region aware ceremony knowledge base, flags gaps with a reason attached to each, offers personalized suggestions, and lets the planner permanently dismiss one that doesn't apply.
5. **WhatsApp automation:** direct integration with Meta's Cloud API (no third party workflow tool), sending approved templates for vendor and family confirmations, payment reminders, and plan updates, tracking replies via webhook, and escalating to the planner when a vendor goes unresponsive instead of retrying silently forever.
6. **Event view:** a single wedding's ceremony plan, vendors, and message history in one place.
7. **Successful event marker:** an event is marked complete and counted toward the North Star when it hits its targeted date with no missed vendor deadline.

## Quality bar

- Designed desktop first, that's where a planner does the real work, but fully responsive so the dashboard and status views hold up on a tablet or phone too.
- Every AI facing surface (Intake Parser, Completeness Copilot, WhatsApp status) has three states: loading, empty, and error. Nothing should look silently broken.
- All copy is plain spoken and human. Do not use dashes (em dash, en dash, or hyphen as a pause) anywhere in the UI copy, and avoid an AI sounding tone. Use commas, colons, or short sentences.
- Cultural and religious content in the ceremony knowledge base must be accurate. Getting a ceremony detail wrong is not a neutral bug in this product, it directly damages the trust the whole pitch depends on. Flag anything you are not confident about instead of guessing.
- Fire analytics events matching the PRD's success metrics: structured plan generated, gap flagged, gap confirmed by planner, gap dismissed, vendor message sent, vendor confirmed, vendor escalated, event marked successful.

## Deployment and stack, already decided

- Frontend on **Netlify**. Backend on **Render**. Set up build and deploy configuration for both from the start rather than as an afterthought.
- LLM is **Gemini**, used only from the Render backend. The API key lives in Render's environment variables, never in the Netlify frontend build or in any client side code.
- Database: Supabase.

## Please ask me about these before you start (at least)

1. Is there a Gemini API rate limit or budget I should design around?
2. Have the Meta WhatsApp test number, privacy policy page, and message templates from the build plan's Phase 0 already been set up, or should that happen in parallel with your first week of coding?
3. Any screens in Stitch that are not final yet, so I know what to treat as source of truth?

Once I answer, propose your plan and start on the `feature/aayush` branch.
