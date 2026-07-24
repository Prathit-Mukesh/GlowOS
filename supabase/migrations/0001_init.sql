-- =============================================================================
-- GlowOS — consolidated schema + Row Level Security (v2, idempotent)
-- =============================================================================
-- Safe to re-run from scratch: every statement is IF NOT EXISTS / OR REPLACE /
-- drop-then-create. Strict ordering: extensions → enums → TABLES → indexes →
-- helper functions (anything that references a table comes AFTER all tables) →
-- RLS enable → policies → triggers → RPCs → storage bucket.
--
-- SECURITY MODEL:
--   * RLS is ON for EVERY table and DENY-BY-DEFAULT. A table with RLS enabled
--     and no matching policy returns zero rows / rejects writes.
--   * Users may only ever touch their OWN rows: user_id = auth.uid().
--   * Users CANNOT delete their rows directly. Deletion happens only through
--     the delete_my_data() SECURITY DEFINER RPC (one-tap hard delete).
--   * payments / subscriptions / audit_log are written ONLY by the service role
--     (server, verified webhooks). Users get read-only access to their own.
--   * products are world-readable (active only) and admin-writable.
--   * The anon key is safe to expose ONLY because these policies are airtight.
--     supabase/tests/rls.test.ts proves cross-user access fails.
--   * The SQL-editor role (postgres, table owner) is NOT subject to RLS here,
--     so dashboard seeding/administration keeps working; the service role has
--     BYPASSRLS. Anon and authenticated users are fully policy-bound.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type budget_tier as enum ('t500', 't1500', 't5000');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_module as enum ('body', 'skin', 'style', 'mind', 'voice');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sub_status as enum ('active', 'halted', 'cancelled', 'expired', 'created', 'pending');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2. TABLES (all created before any function/policy references them)
-- =============================================================================

-- profiles ---------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  age_band       text,
  gender         text,
  budget_tier    budget_tier not null default 't500',
  goals          jsonb not null default '[]'::jsonb,
  quiz_answers   jsonb not null default '{}'::jsonb,
  role           user_role not null default 'user',
  -- 18+ age gate: recorded at signup with a timestamp (DPDP consent trail).
  age_confirmed  boolean not null default false,
  age_verified_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- blueprints -------------------------------------------------------------------
create table if not exists public.blueprints (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     text not null default '1.0',
  content     jsonb not null,
  model_used  text not null default 'rules-v1',
  created_at  timestamptz not null default now()
);

-- polish_scores ----------------------------------------------------------------
create table if not exists public.polish_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     text not null default 'score-v1',
  body        int  not null check (body between 0 and 100),
  skin        int  not null check (skin between 0 and 100),
  style       int  not null check (style between 0 and 100),
  mind        int  not null check (mind between 0 and 100),
  voice       int  not null check (voice between 0 and 100),
  total       int  not null check (total between 0 and 100),
  computed_at timestamptz not null default now()
);

-- daily_actions ----------------------------------------------------------------
create table if not exists public.daily_actions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action_date date not null default (now() at time zone 'utc')::date,
  module      app_module not null,
  title       text not null,
  description text,
  evidence    text,
  minutes     int not null default 5 check (minutes between 0 and 60),
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- streaks ----------------------------------------------------------------------
create table if not exists public.streaks (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  current      int not null default 0 check (current >= 0),
  longest      int not null default 0 check (longest >= 0),
  last_checkin date,
  pet_stage    int not null default 0 check (pet_stage between 0 and 4),
  updated_at   timestamptz not null default now()
);

-- subscriptions ----------------------------------------------------------------
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  razorpay_sub_id     text unique,
  plan                text not null,
  status              sub_status not null default 'created',
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- payments ---------------------------------------------------------------------
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete set null,
  razorpay_payment_id  text unique,
  amount               int not null,           -- in paise
  currency             text not null default 'INR',
  status               text not null,
  raw_webhook          jsonb,                  -- dispute audit trail
  created_at           timestamptz not null default now()
);

-- products (founder-curated; AI may only reference these) ----------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  module        app_module not null,
  name          text not null,
  budget_tier   budget_tier not null,
  url           text,
  evidence_note text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- voice_logs (Phase 3) ---------------------------------------------------------
create table if not exists public.voice_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  transcript   text,
  wpm          int,
  filler_count int,
  score        int check (score between 0 and 100),
  created_at   timestamptz not null default now()
);

-- audit_log (service-role writes only; IPs are hashed, never raw) --------------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event      text not null,
  ip_hash    text,              -- SHA-256(ip + salt), never a raw IP
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------
create index if not exists blueprints_user_created_idx
  on public.blueprints (user_id, created_at desc);
create index if not exists polish_scores_user_idx
  on public.polish_scores (user_id, computed_at desc);
create index if not exists daily_actions_user_date_idx
  on public.daily_actions (user_id, action_date);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists products_module_tier_idx
  on public.products (module, budget_tier) where active;
create index if not exists voice_logs_user_idx on public.voice_logs (user_id, created_at desc);
create index if not exists audit_log_user_idx on public.audit_log (user_id, created_at desc);

-- =============================================================================
-- 4. Helper functions (AFTER tables — bodies reference public.profiles etc.)
-- =============================================================================

-- is_admin(): SECURITY DEFINER avoids recursive RLS on profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- On new auth user, create a profile + streak row so the client never needs
-- INSERT rights it could abuse. Runs as definer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.streaks (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end; $$;

-- =============================================================================
-- 5. ROW LEVEL SECURITY — enable on EVERY table (deny-by-default)
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.blueprints    enable row level security;
alter table public.polish_scores enable row level security;
alter table public.daily_actions enable row level security;
alter table public.streaks       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;
alter table public.products      enable row level security;
alter table public.voice_logs    enable row level security;
alter table public.audit_log     enable row level security;

-- -----------------------------------------------------------------------------
-- 6. Policies (drop-then-create so the file is safely re-runnable)
-- -----------------------------------------------------------------------------

-- profiles: owner read/insert/update. NO user delete. Admin may read all.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'user');  -- users can never self-promote to admin

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all" on public.profiles
  for select using (public.is_admin());

-- blueprints: owner select/insert; no update/delete.
drop policy if exists "blueprints_rw_own" on public.blueprints;
create policy "blueprints_rw_own" on public.blueprints
  for select using (user_id = auth.uid());

drop policy if exists "blueprints_insert_own" on public.blueprints;
create policy "blueprints_insert_own" on public.blueprints
  for insert with check (user_id = auth.uid());

-- polish_scores: owner select/insert; no update/delete.
drop policy if exists "polish_select_own" on public.polish_scores;
create policy "polish_select_own" on public.polish_scores
  for select using (user_id = auth.uid());

drop policy if exists "polish_insert_own" on public.polish_scores;
create policy "polish_insert_own" on public.polish_scores
  for insert with check (user_id = auth.uid());

-- daily_actions: owner select/insert/update (check-off); no delete.
drop policy if exists "actions_select_own" on public.daily_actions;
create policy "actions_select_own" on public.daily_actions
  for select using (user_id = auth.uid());

drop policy if exists "actions_insert_own" on public.daily_actions;
create policy "actions_insert_own" on public.daily_actions
  for insert with check (user_id = auth.uid());

drop policy if exists "actions_update_own" on public.daily_actions;
create policy "actions_update_own" on public.daily_actions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- streaks: owner select/insert/update; no delete.
drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select using (user_id = auth.uid());

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own" on public.streaks
  for insert with check (user_id = auth.uid());

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own" on public.streaks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- voice_logs: owner select/insert; no update/delete.
drop policy if exists "voice_select_own" on public.voice_logs;
create policy "voice_select_own" on public.voice_logs
  for select using (user_id = auth.uid());

drop policy if exists "voice_insert_own" on public.voice_logs;
create policy "voice_insert_own" on public.voice_logs
  for insert with check (user_id = auth.uid());

-- subscriptions / payments: owner READ-ONLY. Writes only via service role,
-- which has BYPASSRLS — so we intentionally add NO insert/update policy.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid());

-- audit_log: owner may read own; writes only via service role (no write policy).
drop policy if exists "audit_select_own" on public.audit_log;
create policy "audit_select_own" on public.audit_log
  for select using (user_id = auth.uid());

-- products: anyone may read ACTIVE rows; only admins may write.
drop policy if exists "products_read_active" on public.products;
create policy "products_read_active" on public.products
  for select using (active = true or public.is_admin());

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products
  for insert with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Triggers (drop-then-create)
-- -----------------------------------------------------------------------------
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists streaks_touch on public.streaks;
create trigger streaks_touch before update on public.streaks
  for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 8. ONE-TAP HARD DELETE (Delete my data) — SECURITY DEFINER RPC
-- =============================================================================
-- Deletes every row the caller owns AND their storage objects, then removes the
-- auth user. Callable only by an authenticated user, and only ever affects the
-- caller (auth.uid()). No parameters = cannot be tricked into deleting others.
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- storage objects first (private voice bucket), then relational rows.
  delete from storage.objects where owner = uid;

  delete from public.voice_logs    where user_id = uid;
  delete from public.daily_actions where user_id = uid;
  delete from public.polish_scores where user_id = uid;
  delete from public.blueprints    where user_id = uid;
  delete from public.streaks       where user_id = uid;
  delete from public.subscriptions where user_id = uid;
  -- keep payments for legal/financial audit but detach identity.
  update public.payments set user_id = null where user_id = uid;
  update public.audit_log set user_id = null where user_id = uid;
  delete from public.profiles      where id = uid;

  -- finally remove the auth account (cascades any leftovers).
  delete from auth.users where id = uid;
end; $$;

revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;

-- Export-my-data: returns the caller's rows as one JSON document.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile',       (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'blueprints',    (select coalesce(jsonb_agg(b), '[]') from public.blueprints b where b.user_id = auth.uid()),
    'polish_scores', (select coalesce(jsonb_agg(s), '[]') from public.polish_scores s where s.user_id = auth.uid()),
    'daily_actions', (select coalesce(jsonb_agg(a), '[]') from public.daily_actions a where a.user_id = auth.uid()),
    'streaks',       (select to_jsonb(st) from public.streaks st where st.user_id = auth.uid()),
    'subscriptions', (select coalesce(jsonb_agg(su), '[]') from public.subscriptions su where su.user_id = auth.uid()),
    'voice_logs',    (select coalesce(jsonb_agg(v), '[]') from public.voice_logs v where v.user_id = auth.uid()),
    'exported_at',   now()
  );
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- =============================================================================
-- 9. Storage: private bucket for voice clips (Phase 3), locked down now.
-- =============================================================================
-- Bucket is PRIVATE — access only via short-lived signed URLs. Paths are
-- randomized {uuid}/{uuid}.webm and owned by the uploader.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice',
  'voice',
  false,
  10485760,  -- 10 MB
  array['audio/webm', 'audio/mp4', 'audio/wav']
)
on conflict (id) do nothing;

-- Users may only touch objects they own, inside the voice bucket.
drop policy if exists "voice_read_own" on storage.objects;
create policy "voice_read_own" on storage.objects
  for select using (bucket_id = 'voice' and owner = auth.uid());

drop policy if exists "voice_insert_own" on storage.objects;
create policy "voice_insert_own" on storage.objects
  for insert with check (bucket_id = 'voice' and owner = auth.uid());

drop policy if exists "voice_delete_own" on storage.objects;
create policy "voice_delete_own" on storage.objects
  for delete using (bucket_id = 'voice' and owner = auth.uid());
