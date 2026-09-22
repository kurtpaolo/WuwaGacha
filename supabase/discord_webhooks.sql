-- Discord Webhooks Table for Wuthering Waves Convene Simulator
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

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

-- Upgrade existing installations with cycle tracking columns
alter table public.discord_webhooks add column if not exists last_broadcast_cycle integer default 0;
alter table public.discord_webhooks add column if not exists last_broadcast_at timestamp with time zone;

-- Enable Row Level Security (RLS)
alter table public.discord_webhooks enable row level security;

-- Policy 1: Allow anyone (anon & authenticated) to read active webhooks for broadcasts
create policy "Allow read access to webhooks"
  on public.discord_webhooks
  for select
  using (true);

-- Policy 2: Allow authenticated and anon users to insert new webhooks
create policy "Allow insert access to webhooks"
  on public.discord_webhooks
  for insert
  with check (true);

-- Policy 3: Allow users to update webhooks (including broadcast cycle updates)
create policy "Allow update access to webhooks"
  on public.discord_webhooks
  for update
  using (true)
  with check (true);

-- Policy 4: Allow users to delete webhooks
create policy "Allow delete access to webhooks"
  on public.discord_webhooks
  for delete
  using (true);

-- (Optional) If you have pg_cron and pg_net extensions enabled in Supabase,
-- you can also schedule the broadcast directly within PostgreSQL:
-- select cron.schedule(
--   'half-hourly-banner-broadcast',
--   '0,30 * * * *',
--   $$ select net.http_post(url := 'https://wuwa-sim.vercel.app/api/banner/broadcast'); $$
-- );
