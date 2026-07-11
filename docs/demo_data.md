# Demo data seeded into the live app

Three real weddings, seeded under the `aayushagrawal2095@gmail.com` planner
account so every feature (intake parsing, conflicts, tasks, Completeness
Copilot, vendor WhatsApp coordination, dashboard, a completed wedding) has
something real to show. Not synthetic JSON: each wedding went through the
actual intake flow (real Gemini/Vertex call), and each has one vendor that
got a real WhatsApp template send.

Event ids (for direct links / cleanup):

| Couple | Tradition | Event id |
|---|---|---|
| Ananya and Rohan | Hindu (North Indian) | `95b78a8e-21b7-43ba-a7ac-75b21dcadce3` |
| Sana and Imran | Muslim (Nikah) | `d921fb72-f98c-40a9-89cd-f07f20ea6a57` |
| Simran and Gurpreet | Sikh (Anand Karaj) | `a8e6f02e-7bb6-4f8a-9e6f-efa36d582da2`, marked **successfully completed** |

`AI insights & tips` was also switched on in this account's Settings, off is
the product default (see `backend/src/routes/profile.ts`), on is what makes
the Completeness Copilot panel show suggestions instead of "turned off".

## The 3 briefs (pasted into New Event > paste brief, verbatim)

### 1. Ananya and Rohan (Hindu, active, deliberately has an unresolved conflict)

```
Hi, this is for Ananya and Rohan's wedding, second week of December in Udaipur.

Mehendi is Dec 10th evening, at the family's farmhouse, close relatives only, maybe 70 people. Ananya's mom wants a live santoor player if we can arrange it.

Sangeet Dec 11th at the hotel banquet hall, need a DJ and a choreographer for the couple's entry, around 180 guests.

Wedding is Dec 12th morning, traditional Hindu ceremony at the City Palace lawns, pandit is Ananya's family's own so no need to book, roughly 350 guests. Note: the mandap decorator hasn't been finalized yet, two names floating around, Royal Decor vs Udaipur Blooms, family hasn't picked one.

Reception same night, Dec 12th, at the palace itself, 450 guests, need catering and a live band, budget for the reception alone is around 18 lakhs.

Total budget for everything is 50 lakhs. Groom's side contact is Rohan's brother, Karan.
```

The "two decorator names, undecided" line is intentional — Gemini correctly
picked it up as a conflict ("Royal Decor" vs "Udaipur Blooms") under the
Plan tab's "Needs your confirmation" banner.

### 2. Sana and Imran (Muslim Nikah, active)

```
Coordinating Sana and Imran's Nikah, Hyderabad, last week of January.

Mangni (engagement) already done in December, not part of this.

Mehendi function Jan 24th at the bride's home, ladies only, around 50 guests, henna artist needed.

Nikah ceremony Jan 25th afternoon at the Masjid, Qazi is already arranged through the family, roughly 120 guests attending the nikah itself.

Walima Jan 26th evening, groom's side hosting at a banquet hall, 300 guests expected, catering, biryani counter is a must, family's very particular about this, and photography still need to be locked in.

Mehr amount and other nikah-specific details being handled directly by the families, not something we need to track here.
```

### 3. Simran and Gurpreet (Sikh Anand Karaj, marked successfully completed)

```
Simran and Gurpreet's Anand Karaj, everything at Guru Nanak Darbar Gurdwara in Chandigarh, March 14th.

Akhand Path starts two days before, March 12th, at the same Gurdwara, family only.

Anand Karaj ceremony March 14th morning, Granthi is arranged through the Gurdwara itself, expecting 400 guests, langar hall capacity is 500 so we're fine there.

Reception same evening, March 14th, at the Gurdwara's community hall, same guest count roughly, need a caterer for the reception, langar covers the ceremony day meal separately, and a photographer, both still pending confirmation.

Total guests across the day around 400, single venue for everything so no travel logistics to worry about.
```

This is the only one of the three with a single venue for the whole wedding
("everything at Guru Nanak Darbar Gurdwara") — deliberately, so `city`,
`guestCount` (400), and `venue` all populate on the event record instead of
staying null (per-ceremony venues, like weddings 1 and 2, correctly leave
those top-level fields null).

## Vendors per wedding

One vendor per wedding is real (phone `917828792582`, got an actual
`vendor_confirmation_request` WhatsApp template send through Meta). The rest
have fabricated message history inserted directly into the `messages` table
(no real WhatsApp traffic), covering every `VendorStatus` the UI supports.

| Wedding | Vendor | Role | Real send? | Seeded status |
|---|---|---|---|---|
| Ananya & Rohan | Royal Decor Co | Mandap decorator | **Yes** | sent (real) |
| | Santoor by Vikram | Live musician | No | confirmed |
| | Beatdrop DJ Crew | Sangeet DJ | No | needs_attention (failed send) |
| | Lakeview Catering | Reception caterer | No | sent |
| Sana & Imran | Henna by Ayesha | Mehendi artist | **Yes** | sent (real) |
| | Paradise Biryani Counters | Walima caterer | No | needs_attention (stale, 60h no reply) |
| | Frame & Focus Studio | Photographer | No | sent |
| | Emerald Banquets | Venue manager | No | confirmed |
| Simran & Gurpreet | Chandigarh Reception Caterers | Reception caterer | **Yes** | sent (real) |
| | Momentframe Photography | Photographer | No | confirmed |
| | Backup Florals Co | Florist | No | declined |
| | Community Hall Sound | Sound & lights | No | sent |

`not_contacted` isn't seeded on any vendor — add one manually to see that
state, it's the default before any message is sent.

## How this was actually done (for reproducing or extending)

1. Minted a real Supabase session for the target planner account without
   touching their password: `supabase.auth.admin.generateLink({ type:
   "magiclink", email })`, then `supabase.auth.verifyOtp({ token_hash,
   type: "magiclink" })` on a plain (anon-key) client. Returns a normal
   `access_token`/`refresh_token` session for an existing user, Google
   OAuth or not.
2. Drove the real running app (`npm run dev:all`) with Playwright, cookie
   `sd_at=<access_token>` set for `localhost` — same cookie the backend
   itself sets after a real login (see `backend/src/lib/cookies.ts`), so
   every request after that hit real `requireAuth` middleware normally.
3. For each wedding: pasted the brief into `/intake`, clicked "Structure
   this plan" (real `/api/intake/parse` call, real Gemini), added 4
   vendors through the Vendors tab UI, sent one real WhatsApp template to
   the first vendor through the actual "Send message" form.
4. Fabricated the other vendors' message history with a direct insert into
   `sutradhar.messages` (service-role Supabase client), varying
   `delivery_status`/`direction`/`timestamp` to hit every vendor status.
5. Marked the Sikh wedding successful through the real "Mark as
   successfully completed" button.

To add a fourth wedding the same way: paste a new brief into `/intake` as
the planner, add vendors normally through the Vendors tab. No script is
required for the parts that go through the real UI, only the fabricated
(non-real-send) message history needs a direct DB insert if you want that
variety without spending real WhatsApp sends.
