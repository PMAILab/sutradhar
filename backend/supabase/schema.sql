-- Sutradhar schema, run once in Supabase SQL Editor (Project > SQL Editor > New query).
-- Matches the table list in docs/Sutradhar_Build_Plan.md section 2, plus a
-- conflicts table for StructuredPlan.conflicts (backend/src/types/plan.ts).
--
-- Everything lives under the "sutradhar" Postgres schema, not "public", so
-- this can share a Supabase project with another app without table name
-- collisions. After running this: Project Settings > API > Data API
-- Settings > "Exposed schemas", add "sutradhar" (public is exposed by
-- default, custom schemas are not).
--
-- IDs are app-generated text, not DB uuids: the backend already builds
-- ceremony/task ids client-side before insert (see intake.ts, events.ts),
-- so primary keys here are text to match rather than fight that.
-- planner_id is required — every event is real, created through the app by
-- an authenticated planner, no planner-less seed data. planners.id is a
-- reference to Supabase's own auth.users, not a
-- separate signup table, since Supabase Auth already owns email and
-- password_hash and the Google identity link.
--
-- Auth is handled by Supabase Auth (Google + email/password) via the
-- backend-proxied cookie session (see backend/src/routes/auth.ts) — the
-- BFF (Express server, backend/src) is the only thing that ever talks to
-- this database, using the service role key, which bypasses row level
-- security entirely. The RLS policies below are defense-in-depth, not the
-- actual access control: the real security boundary is the server manually
-- filtering every query by the authenticated request's planner id (see
-- requireAuth.ts and every route's req.plannerId use). They only start to
-- matter if a future change ever adds direct client-side Supabase access.
--
-- WARNING: the drop below wipes all data currently in "sutradhar" (not
-- "public", not any other app's schema). Comment it out if this schema
-- already has real data you want to keep, and use targeted ALTERs instead.

drop schema if exists sutradhar cascade;

create extension if not exists pgcrypto;

create schema if not exists sutradhar;

grant usage on schema sutradhar to service_role, anon, authenticated;
alter default privileges in schema sutradhar grant all on tables to service_role;
alter default privileges in schema sutradhar grant all on sequences to service_role;

-- ─── Analytics ──────────────────────────────────────────────────────────
-- Best-effort event log (backend/src/lib/analytics.ts) — not user-scoped
-- queryable data, so no RLS here, only the service-role insert path.

create table sutradhar.analytics_events (
  id          bigint generated always as identity primary key,
  event_type  text not null,
  event_data  text,                 -- JSON payload
  created_at  timestamptz not null default now()
);

create index analytics_events_type_idx on sutradhar.analytics_events (event_type);
create index analytics_events_created_idx on sutradhar.analytics_events (created_at);
grant all on sutradhar.analytics_events to service_role;
grant usage, select on sequence sutradhar.analytics_events_id_seq to service_role;

-- ─── Planners ───────────────────────────────────────────────────────────
-- Display name stays in auth.users (Supabase Auth), updated server-side via
-- the admin API — this table holds preferences that have nowhere else to
-- live: notification/automation toggles and the profile fields Settings
-- exposes (backend/src/routes/profile.ts).

create table sutradhar.planners (
  id                 uuid primary key references auth.users(id) on delete cascade,
  phone              text,
  language           text not null default 'English (UK)',
  timezone           text not null default 'IST (UTC+5:30)',
  whatsapp_enabled   boolean not null default true,
  vendor_follow_ups  boolean not null default true,
  daily_summary      boolean not null default true,
  browser_push       boolean not null default true,
  ai_insights        boolean not null default false,
  updated_at         timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

alter table sutradhar.planners enable row level security;
grant all on sutradhar.planners to service_role;
create policy "select own planner row" on sutradhar.planners for select using (auth.uid() = id);
create policy "update own planner row" on sutradhar.planners for update using (auth.uid() = id);

-- Every Supabase Auth signup (email/password or Google) lands in
-- auth.users; this mirrors it into sutradhar.planners so events.planner_id
-- has something in-schema to point at.
create or replace function sutradhar.handle_new_planner()
returns trigger as $$
begin
  insert into sutradhar.planners (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = sutradhar;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function sutradhar.handle_new_planner();

-- ─── Events ─────────────────────────────────────────────────────────────

create table sutradhar.events (
  id text primary key,
  planner_id uuid not null references sutradhar.planners(id) on delete cascade,
  couple_names text,
  wedding_date date,
  tradition text,
  tradition_confidence text check (tradition_confidence in ('high', 'medium', 'low')),
  city text,
  guest_count integer,
  venue_name text,
  venue_address text,
  venue_capacity integer,
  last_gap_count integer not null default 0,
  dismissed_gap_ids text[] not null default '{}',
  completed_at timestamptz,
  successful boolean,
  created_at timestamptz not null default now()
);

alter table sutradhar.events enable row level security;
grant all on sutradhar.events to service_role;
create policy "select own events" on sutradhar.events for select using (auth.uid() = planner_id);
create policy "insert own events" on sutradhar.events for insert with check (auth.uid() = planner_id);
create policy "update own events" on sutradhar.events for update using (auth.uid() = planner_id);
create policy "delete own events" on sutradhar.events for delete using (auth.uid() = planner_id);

-- ─── Ceremonies / tasks ───────────────────────────────────────────────────
-- No planner_id column of their own — ownership is join-through-events, so
-- policies check via an EXISTS subquery instead of a direct column compare.

create table sutradhar.ceremonies (
  id text primary key,
  event_id text not null references sutradhar.events(id) on delete cascade,
  name text not null,
  notes text,
  position integer not null default 0
);

alter table sutradhar.ceremonies enable row level security;
grant all on sutradhar.ceremonies to service_role;
create policy "access own ceremonies" on sutradhar.ceremonies for all using (
  exists (select 1 from sutradhar.events e where e.id = ceremonies.event_id and e.planner_id = auth.uid())
);

create table sutradhar.tasks (
  id text primary key,
  ceremony_id text not null references sutradhar.ceremonies(id) on delete cascade,
  title text not null,
  vendor text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'needs_review'))
);

alter table sutradhar.tasks enable row level security;
grant all on sutradhar.tasks to service_role;
create policy "access own tasks" on sutradhar.tasks for all using (
  exists (
    select 1 from sutradhar.ceremonies c
    join sutradhar.events e on e.id = c.event_id
    where c.id = tasks.ceremony_id and e.planner_id = auth.uid()
  )
);

-- ─── Vendors / messages ───────────────────────────────────────────────────

create table sutradhar.vendors (
  id text primary key,
  event_id text not null references sutradhar.events(id) on delete cascade,
  name text not null,
  role text,
  phone_number text not null,
  created_at timestamptz not null default now()
);

alter table sutradhar.vendors enable row level security;
grant all on sutradhar.vendors to service_role;
create policy "access own vendors" on sutradhar.vendors for all using (
  exists (select 1 from sutradhar.events e where e.id = vendors.event_id and e.planner_id = auth.uid())
);

create table sutradhar.messages (
  id text primary key,
  vendor_id text not null references sutradhar.vendors(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  body text not null,
  template_name text,
  wa_message_id text,
  delivery_status text check (delivery_status in ('sent', 'delivered', 'read', 'failed')),
  error_reason text,
  timestamp timestamptz not null default now()
);

alter table sutradhar.messages enable row level security;
grant all on sutradhar.messages to service_role;
create policy "access own messages" on sutradhar.messages for all using (
  exists (
    select 1 from sutradhar.vendors v
    join sutradhar.events e on e.id = v.event_id
    where v.id = messages.vendor_id and e.planner_id = auth.uid()
  )
);

-- ─── Gaps / conflicts ─────────────────────────────────────────────────────

-- Unused by the backend today (gap dismissal is tracked via
-- events.dismissed_gap_ids, gaps are recomputed on each check-gaps call,
-- not persisted). Kept for the build plan's future direction.
create table sutradhar.gaps (
  id text primary key,
  event_id text not null references sutradhar.events(id) on delete cascade,
  ceremony_id text references sutradhar.ceremonies(id) on delete set null,
  ceremony_name text,
  label text not null,
  reason text not null,
  severity text not null check (severity in ('important', 'worth_checking')),
  kb_version text,
  dismissed boolean not null default false
);

alter table sutradhar.gaps enable row level security;
grant all on sutradhar.gaps to service_role;
create policy "access own gaps" on sutradhar.gaps for all using (
  exists (select 1 from sutradhar.events e where e.id = gaps.event_id and e.planner_id = auth.uid())
);

create table sutradhar.conflicts (
  id text primary key,
  event_id text not null references sutradhar.events(id) on delete cascade,
  description text not null,
  options text[] not null default '{}',
  resolved boolean not null default false,
  resolved_value text
);

alter table sutradhar.conflicts enable row level security;
grant all on sutradhar.conflicts to service_role;
create policy "access own conflicts" on sutradhar.conflicts for all using (
  exists (select 1 from sutradhar.events e where e.id = conflicts.event_id and e.planner_id = auth.uid())
);

create index events_planner_id_idx on sutradhar.events(planner_id);
create index ceremonies_event_id_idx on sutradhar.ceremonies(event_id);
create index tasks_ceremony_id_idx on sutradhar.tasks(ceremony_id);
create index vendors_event_id_idx on sutradhar.vendors(event_id);
create index messages_vendor_id_idx on sutradhar.messages(vendor_id);
create index gaps_event_id_idx on sutradhar.gaps(event_id);
create index conflicts_event_id_idx on sutradhar.conflicts(event_id);

-- Custom schemas don't inherit Supabase's default public-schema grants,
-- PostgREST needs these explicitly or every request 403s with
-- "permission denied for schema sutradhar".
--At last expose all tables in DATA API settings in project settings
grant all on all tables in schema sutradhar to service_role;
grant all on all sequences in schema sutradhar to service_role;
