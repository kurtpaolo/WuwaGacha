-- =============================================================================
-- Discord Webhooks Setup & Direct Insert for Wuthering Waves Convene Simulator
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- 1. Ensure table exists with all required columns
create table if not exists public.discord_webhooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  name text not null default 'Discord Channel',
  is_active boolean default true,
  last_broadcast_cycle integer default 0,
  last_broadcast_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add columns if upgrading existing table
alter table public.discord_webhooks add column if not exists last_broadcast_cycle integer default 0;
alter table public.discord_webhooks add column if not exists last_broadcast_at timestamp with time zone;
alter table public.discord_webhooks add column if not exists name text not null default 'Discord Channel';
alter table public.discord_webhooks add column if not exists is_active boolean default true;

-- 3. Add UNIQUE constraint on url so duplicates are strictly forbidden
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'discord_webhooks_url_unique'
  ) then
    -- Clean up any existing duplicates first before adding unique constraint (keeping newest)
    delete from public.discord_webhooks a
    using public.discord_webhooks b
    where a.id < b.id and a.url = b.url;

    alter table public.discord_webhooks
      add constraint discord_webhooks_url_unique unique (url);
  end if;
end $$;

-- 4. Enable Row Level Security (RLS) & Policies
alter table public.discord_webhooks enable row level security;

drop policy if exists "Allow read access to webhooks" on public.discord_webhooks;
create policy "Allow read access to webhooks"
  on public.discord_webhooks
  for select
  using (true);

drop policy if exists "Allow insert access to webhooks" on public.discord_webhooks;
create policy "Allow insert access to webhooks"
  on public.discord_webhooks
  for insert
  with check (true);

drop policy if exists "Allow update access to webhooks" on public.discord_webhooks;
create policy "Allow update access to webhooks"
  on public.discord_webhooks
  for update
  using (true)
  with check (true);

drop policy if exists "Allow delete access to webhooks" on public.discord_webhooks;
create policy "Allow delete access to webhooks"
  on public.discord_webhooks
  for delete
  using (true);

-- =============================================================================
-- 5. INSERT YOUR WEBHOOK HERE (Replace the URL with your Discord webhook URL):
-- Safe & idempotent: Won't create duplicates even if executed multiple times!
-- =============================================================================
insert into public.discord_webhooks (url, name, is_active)
values (
  'YOUR_DISCORD_WEBHOOK_URL_HERE',
  'Banner Broadcasts',
  true
)
on conflict (url) do update
set is_active = true;
