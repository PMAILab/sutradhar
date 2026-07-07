# Sutradhar, Stitch Design Brief

A build ready design brief for Google Stitch. Sutradhar is a **responsive web app, designed desktop first** and kept fully usable on tablet and phone, with **login via email and password or Google**. The user is a working professional, a solo wedding planner, not a couple planning their own wedding, and they do their real work (reviewing a plan, managing vendors, resolving gaps) at a desk. Everything here should feel like a serious tool that professional would trust with their business, with just enough cultural warmth to feel like it was built for Indian weddings specifically, not a generic SaaS dashboard with a marigold sticker on it.

The name Sutradhar means the one who holds the thread, the narrator in Indian classical theatre who ties every scene together without stepping into the drama itself. Let a single connecting thread motif show up quietly across the product (a thin curved line linking related cards, a subtle connecting stroke behind the dashboard), a visual echo of the planner's actual job.

How to use this: paste the **Base prompt** first so Stitch locks the theme. Then generate the screens one at a time using each screen prompt. If a screen feels cluttered, add "more white space, fewer elements, one primary action" and regenerate.

---

## Base prompt (paste first)

Design a responsive web app called **Sutradhar**, an AI copilot for solo Indian wedding planners. Its job is to take a planner from a messy, unstructured client brief to a fully organized, culturally accurate wedding plan, then keep chasing vendors and family for them so they aren't the only one doing it. The aesthetic is professional and seamless first, culturally warm second: think a well built operations tool a working professional would trust daily, with a restrained Indian wedding palette instead of generic SaaS blue. Confident, calm, and fast to scan, this person is working, not dreaming about their own wedding.

Design language:
- Clarity first. This is a working tool used daily, not a romantic mood board. Strong grid, clear hierarchy, generous but efficient spacing, nothing decorative that slows down scanning a dashboard.
- A warm, editorial palette instead of default SaaS blue: warm ivory background, deep ink text, one deep maroon primary accent, one marigold gold secondary accent used sparingly for highlights and success states.
- A quiet connecting thread motif: a thin curved line or stroke that visually links related items (vendor to ceremony, task to event) without becoming decoration for its own sake. Use it sparingly, mainly on the dashboard and the event detail view.
- Structure with soft cards and hairlines, not heavy shadows. Status is always shown with color and a clear label together, never color alone.
- Typography pairs a confident serif for the wordmark and section titles with a clean, highly legible sans for all working UI and data, since scanning speed matters more than romance here.
- Motion is quiet and functional: a soft check animation when a gap is resolved or an event is marked successful, nothing else.

Palette:
- Background warm ivory #F8F5EE
- Ink text #2A2320
- Secondary text warm grey #6B6460
- Hairlines and borders #D9CFC9
- Primary accent, deep maroon #8B1E3F, used for primary actions and key emphasis
- Secondary accent, marigold gold #B8860B, used sparingly for success states, highlights, and the thread motif
- Urgent or overdue state, a warm terracotta #B5533C, never a harsh alarm red
- Confirmed or success state, a muted sage or the marigold gold, never a bright system green

Typography:
- Wordmark and section titles: a confident, slightly editorial serif such as Fraunces or Lora, used sparingly.
- All working interface, data, and body text: a clean, highly legible sans such as Inter, since this is scanned quickly and often.
- Status labels and micro tags in uppercase, small size, medium weight, paired with a color dot, never color alone.

Components:
- Buttons: one solid maroon primary, a quiet outline secondary. Confident but not showy.
- Cards: soft ivory or white surface, 1px hairline border, small radius, clear internal hierarchy (title, status, key numbers).
- Status pills: small rounded tags with a color dot plus a text label (Confirmed, Pending, Overdue, Needs review).
- The thread motif: a thin 1 to 2px curved stroke in a muted version of the maroon or gold, connecting related cards on the dashboard, never overlapping text.

Responsive rules:
- Design desktop first. This is where a planner actually reviews a plan, works through Completeness Copilot suggestions, and manages vendors, so desktop layouts should be the primary, most considered version of every screen.
- Desktop (primary): a persistent left sidebar (Dashboard, Events, Vendors, Settings) with the Sutradhar wordmark at top, generous multi column layouts, and enough width to show status detail without truncating.
- Tablet and mobile (secondary, must still work): the sidebar collapses to a bottom tab bar (Dashboard, Events, Add, Vendors, Profile), and multi column layouts fold down to a single column. These should read as a faithful, simplified version of the desktop screen, a planner checking status from their phone should never lose functionality, just density.
- Dashboard cards stack in a responsive grid, three per row on desktop, two on tablet, one column on mobile.

Consistency:
- Every AI facing surface (Intake Parser, Completeness Copilot, WhatsApp status) needs three clear states: a calm loading state ("Reading your notes...", "Checking for gaps..."), an empty state, and a plain spoken error state. Keep these understated, matching the rest of the design.

---

## 1. Login and sign up

A calm, centered authentication screen on the ivory background, designed for a desktop browser window first (a simple centered card works fine on mobile too, no need for a split image layout). Small Sutradhar wordmark in the serif at the top with a one line tagline underneath in the sans, "The thread that holds your wedding season together." A "Continue with Google" button first, a thin hairline divider with a small "or", then email and password fields with clear labels and a solid maroon "Log in" button, and a quiet text toggle to "Create an account" instead. No imagery, no clutter, this is a professional tool, not a landing page.

## 2. Dashboard, the daily view

The screen a planner opens every morning. A serif greeting at the top, "Good morning, [Name]. Here's what needs you today." Below it, a short, clearly ranked list of the two or three most urgent items across all active weddings (an overdue vendor confirmation, an unresolved gap, an approaching ceremony deadline), each item showing which wedding it belongs to. Below that, a grid of Active Event cards, each showing the couple's names, the wedding date, a small progress indicator, and a status pill. A thin thread stroke quietly connects the urgent items list to the event cards they belong to. Three per row on desktop, one column on mobile.

## 3. New client intake

A focused screen for starting a new wedding. A large text area with the placeholder "Paste the client's WhatsApp messages, notes, or a rough brief here." A solid maroon "Structure this plan" button below it. Once submitted, an animated "Reading your notes and building the ceremony plan..." state with a calm, minimal loading indicator, not a spinner that feels uncertain.

## 4. Structured plan, ceremony by ceremony

The result of intake, shown as a clean, tabbed view with one tab per ceremony (Haldi, Mehendi, Sangeet, Wedding, Reception, adjusting to whichever ceremonies apply). Each tab shows a simple task list with status pills (Pending, Confirmed, Needs review) and the vendor attached to each task. A calm "Review and confirm" action at the top once the planner is happy with the structure.

## 5. Completeness Copilot panel

A side panel or modal that opens from the structured plan view. A serif header, "A few things worth checking." Below it, a list of flagged gaps, each with a short plain language reason ("Nikah ceremonies usually involve a Mehr agreement, this isn't in your plan yet") and two actions per item, "Add to plan" and "Not relevant for this wedding" (which dismisses it permanently for this event). Calm, respectful tone, this should feel like a sharp assistant, not a nagging checklist.

## 6. Vendor and family automation view

A list of vendors and family contacts for one event, each row showing name, role (caterer, photographer, bride's family, etc), and a WhatsApp status pill (Sent, Confirmed, No response, Needs your attention). A quiet "Send reminder" action per row and a small message history you can expand to see what was actually sent and replied. Rows needing escalation are visually distinct using the terracotta status color, not just bold text.

## 7. Event detail view

The single wedding home, bringing together the ceremony plan, the vendor list, and recent WhatsApp activity in one page, organized as calm tabs or sections rather than everything at once. A prominent wedding date and countdown at the top, and a "Mark as successfully completed" action that becomes available as the date approaches.

## 8. Successful event, completion state

A brief, quiet celebratory moment when an event is marked successfully completed, a small marigold gold check animation and a short serif line, "Another wedding, delivered." Understated, professional, not a confetti explosion, this is a work tool, the reward should feel earned and calm.

## 9. Settings and profile

A simple account page: planner name, email, notification preferences for WhatsApp automation, and a log out action. Minimal, functional, no decoration needed here.

---

## Build notes for whoever codes it

- Keep the maroon and marigold palette restrained, most of the interface should read as ivory, ink, and hairlines, with the accents reserved for status and emphasis, not everywhere.
- The thread motif is a detail, not a load bearing design element, don't let it interfere with legibility or data density.
- Reuse one card component across Dashboard, Event Detail, and Vendor rows so the build stays consistent.
- Match the routes the app actually needs: Login, Dashboard, New Intake, Event Detail (with Ceremony Plan, Vendors, Completeness Copilot as sub views), Settings.
