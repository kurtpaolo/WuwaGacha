-- ==============================================================================
-- WUTHERING WAVES CONVENE SIMULATOR - SUPABASE DATABASE SCHEMA
-- Ultra-optimized, storage-saving, free-tier friendly schema.
-- ==============================================================================

-- Enable pgcrypto extension for secure SHA-256 and blowfish password hashing
create extension if not exists pgcrypto;

-- 1. PROFILES TABLE (Stores 1 row per user: Astrite, Pity, Guarantees, Showcase, True Stats)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  astrite integer not null default 25600 check (astrite >= 0),
  pity_5star integer not null default 0 check (pity_5star >= 0 and pity_5star <= 80),
  pity_4star integer not null default 0 check (pity_4star >= 0 and pity_4star <= 10),
  guaranteed_limited boolean not null default false,
  guaranteed_featured_4 boolean not null default false,
  selected_char_id text not null default 'shorekeeper',
  avatar_id text not null default 'shorekeeper',
  custom_title text not null default 'The Rover',
  total_pulls integer not null default 0 check (total_pulls >= 0),
  wins_5050 integer not null default 0 check (wins_5050 >= 0),
  total_5050 integer not null default 0 check (total_5050 >= 0),
  security_question text,
  security_answer_hash text,
  showcase_ids text[] default '{}',
  claimed_title_ids text[] default '{"the_rover"}',
  last_tacet_claim timestamptz not null default now(),
  is_vip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure newly added columns & constraints exist if table was already created
alter table public.profiles add column if not exists avatar_id text not null default 'shorekeeper';
alter table public.profiles add column if not exists custom_title text not null default 'The Rover';
alter table public.profiles add column if not exists total_pulls integer not null default 0;
alter table public.profiles add column if not exists wins_5050 integer not null default 0;
alter table public.profiles add column if not exists total_5050 integer not null default 0;
alter table public.profiles add column if not exists security_question text;
alter table public.profiles add column if not exists security_answer_hash text;
alter table public.profiles add column if not exists showcase_ids text[] default '{}';
alter table public.profiles add column if not exists claimed_title_ids text[] default '{"the_rover"}';
alter table public.profiles add column if not exists last_tacet_claim timestamptz not null default now();
alter table public.profiles add column if not exists is_vip boolean not null default false;
alter table public.profiles add column if not exists login_streak integer not null default 1;
alter table public.profiles add column if not exists max_login_streak integer not null default 1;
alter table public.profiles add column if not exists last_login_date text;
alter table public.profiles add column if not exists pvp_wins integer not null default 0;
alter table public.profiles add column if not exists pvp_losses integer not null default 0;
alter table public.profiles add column if not exists pvp_streak integer not null default 0;
alter table public.profiles add column if not exists pvp_max_streak integer not null default 0;
alter table public.profiles add column if not exists pvp_points integer not null default 0;
alter table public.profiles add column if not exists tower_run_state jsonb;
alter table public.profiles drop constraint if exists profiles_astrite_check;
alter table public.profiles add constraint profiles_astrite_check check (astrite >= 0);

-- 2. USER INVENTORY TABLE (Stores ONLY featured 5-star resonators, NO weapons, NO losses)
-- Max 7 copies per resonator (1 base S0 + 6 duplicate wavebands = S6 max).
-- Even after years of pulling, a user can have at most ~30 tiny rows (under 3 KB per user).
create table if not exists public.user_inventory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  character_id text not null,
  character_name text not null,
  count integer not null default 1 check (count >= 1 and count <= 7),
  first_pulled_at timestamptz not null default now(),
  last_pulled_at timestamptz not null default now(),
  constraint unique_user_character unique(user_id, character_id)
);

-- 3. USER SECURITY TABLE (Stores hashed security answers in private isolation)
create table if not exists public.user_security (
  user_id uuid references auth.users on delete cascade primary key,
  security_question text,
  security_answer_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate any existing security hashes from profiles to user_security
insert into public.user_security (user_id, security_question, security_answer_hash)
select id, security_question, security_answer_hash
from public.profiles
where security_answer_hash is not null
on conflict (user_id) do update
set security_question = excluded.security_question,
    security_answer_hash = excluded.security_answer_hash;

-- Create fast indexes for queries
create index if not exists idx_user_inventory_user_id on public.user_inventory(user_id);
create index if not exists idx_profiles_username on public.profiles(username);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.user_inventory enable row level security;
alter table public.user_security enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

drop policy if exists "Users can view own inventory" on public.user_inventory;
drop policy if exists "Anyone can view user inventory" on public.user_inventory;
drop policy if exists "Users can insert own inventory" on public.user_inventory;
drop policy if exists "Users can update own inventory" on public.user_inventory;
drop policy if exists "Users can delete own inventory" on public.user_inventory;

drop policy if exists "Users can view own security" on public.user_security;
drop policy if exists "Users can update own security" on public.user_security;
drop policy if exists "Users can insert own security" on public.user_security;

-- User Security Policies (Strict private access only by account owner)
create policy "Users can view own security"
  on public.user_security for select
  using (auth.uid() = user_id);

create policy "Users can update own security"
  on public.user_security for update
  using (auth.uid() = user_id);

create policy "Users can insert own security"
  on public.user_security for insert
  with check (auth.uid() = user_id);

-- Profiles policies (Public read allows visiting other players' profiles Anime Vanguards style)
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Inventory policies (Public read allows inspecting other players' inventories)
create policy "Anyone can view user inventory"
  on public.user_inventory for select
  using (true);

create policy "Users can insert own inventory"
  on public.user_inventory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.user_inventory for update
  using (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.user_inventory for delete
  using (auth.uid() = user_id);

-- 4. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- Creates profile record with starting 16,000 Astrite as soon as account is registered.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_user_name text;
  raw_sec_q text;
  raw_sec_h text;
begin
  raw_user_name := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  raw_sec_q := new.raw_user_meta_data->>'security_question';
  raw_sec_h := new.raw_user_meta_data->>'security_answer_hash';

  insert into public.profiles (
    id,
    username,
    astrite,
    pity_5star,
    pity_4star,
    guaranteed_limited,
    guaranteed_featured_4,
    selected_char_id,
    avatar_id,
    custom_title,
    claimed_title_ids,
    security_question,
    security_answer_hash
  ) values (
    new.id,
    raw_user_name,
    25600,
    0,
    0,
    false,
    false,
    'shorekeeper',
    'shorekeeper',
    'The Rover',
    '{"the_rover"}',
    raw_sec_q,
    raw_sec_h
  )
  on conflict (id) do update
    set username = excluded.username,
        custom_title = coalesce(excluded.custom_title, profiles.custom_title),
        security_question = coalesce(excluded.security_question, profiles.security_question);

  -- Store security answer hash in private user_security table
  if raw_sec_q is not null or raw_sec_h is not null then
    insert into public.user_security (user_id, security_question, security_answer_hash)
    values (new.id, raw_sec_q, raw_sec_h)
    on conflict (user_id) do update
    set security_question = excluded.security_question,
        security_answer_hash = excluded.security_answer_hash,
        updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger firing on auth.users creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. AUTOMATIC EMAIL CONFIRMATION TRIGGER
-- Automatically confirms registrations in the database so username/password works instantly
create or replace function public.auto_confirm_new_user()
returns trigger as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_before_insert on auth.users;
create trigger on_auth_user_before_insert
  before insert on auth.users
  for each row execute procedure public.auto_confirm_new_user();

-- 6. AUTOMATIC EMAIL CONFIRMATION ON USER UPDATE
-- Automatically confirms email changes so username changes take effect immediately
create or replace function public.auto_confirm_user_update()
returns trigger as $$
begin
  if new.email is distinct from old.email then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_before_update on auth.users;
create trigger on_auth_user_before_update
  before update on auth.users
  for each row execute procedure public.auto_confirm_user_update();

-- 7. FORGOT PASSWORD SECURITY FUNCTIONS
-- Allows retrieval of user's security question without disclosing the answer
create or replace function public.get_user_security_question(p_username text)
returns text as $$
declare
  v_question text;
begin
  select security_question into v_question
  from public.profiles
  where lower(username) = lower(trim(p_username));

  return v_question;
end;
$$ language plpgsql security definer;

-- Securely resets user password when correct security answer is provided
create or replace function public.reset_password_with_security_answer(
  p_username text,
  p_answer text,
  p_new_password text
) returns jsonb as $$
declare
  v_user_id uuid;
  v_stored_hash text;
  v_input_hash text;
begin
  select id into v_user_id
  from public.profiles
  where lower(username) = lower(trim(p_username));

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'No account found with this username');
  end if;

  -- Read from private user_security table first, fallback to profiles
  select security_answer_hash into v_stored_hash
  from public.user_security
  where user_id = v_user_id;

  if v_stored_hash is null or v_stored_hash = '' then
    select security_answer_hash into v_stored_hash
    from public.profiles
    where id = v_user_id;
  end if;

  if v_stored_hash is null or v_stored_hash = '' then
    return jsonb_build_object('success', false, 'error', 'No security question set up for this account');
  end if;

  v_input_hash := encode(digest(lower(trim(p_answer)), 'sha256'), 'hex');
  if v_input_hash <> v_stored_hash then
    return jsonb_build_object('success', false, 'error', 'Incorrect answer to security question');
  end if;

  -- Update encrypted password in auth.users
  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  where id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- 8. PLAYER SEARCH & PROFILE INSPECTION FUNCTIONS (SECURITY DEFINER)
-- Allows players to search and view any player's profile and inventory safely,
-- completely bypassing any restrictive RLS issues.

-- Search players by partial or exact username (handles leading @ and case-insensitivity)
drop function if exists public.search_players(text);
create or replace function public.search_players(p_query text)
returns table (
  id uuid,
  username text,
  avatar_id text,
  custom_title text,
  astrite integer,
  pity_5star integer,
  is_vip boolean
) language plpgsql security definer as $$
declare
  v_clean text;
begin
  v_clean := lower(trim(regexp_replace(p_query, '^@+', '')));
  if v_clean = '' then
    return;
  end if;

  return query
  select
    p.id,
    p.username,
    coalesce(p.avatar_id, 'shorekeeper') as avatar_id,
    coalesce(p.custom_title, 'The Rover') as custom_title,
    p.astrite,
    p.pity_5star,
    coalesce(p.is_vip, false) as is_vip
  from public.profiles p
  where lower(p.username) ilike '%' || v_clean || '%'
  order by
    case
      when lower(p.username) = v_clean then 0
      when lower(p.username) like v_clean || '%' then 1
      else 2
    end,
    p.username asc
  limit 15;
end;
$$;

-- Fetch full public profile + inventory for a specific player in a single round-trip
create or replace function public.get_player_profile(p_username text)
returns jsonb language plpgsql security definer as $$
declare
  v_clean text;
  v_profile public.profiles%rowtype;
  v_inventory jsonb;
  v_showcase text[];
begin
  v_clean := lower(trim(regexp_replace(p_username, '^@+', '')));
  
  select * into v_profile
  from public.profiles
  where lower(username) = v_clean
  limit 1;

  if v_profile.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', inv.id,
      'character_id', inv.character_id,
      'character_name', inv.character_name,
      'count', inv.count,
      'first_pulled_at', inv.first_pulled_at,
      'last_pulled_at', inv.last_pulled_at
    ) order by inv.count desc, inv.last_pulled_at desc
  ), '[]'::jsonb) into v_inventory
  from public.user_inventory inv
  where inv.user_id = v_profile.id;

  -- If user hasn't explicitly set showcase_ids, default to their top owned resonators from inventory (up to 6)
  if v_profile.showcase_ids is null or cardinality(v_profile.showcase_ids) = 0 then
    select coalesce(array_agg(sub.character_id), '{}'::text[])
    into v_showcase
    from (
      select character_id
      from public.user_inventory
      where user_id = v_profile.id
      order by count desc, last_pulled_at desc
      limit 6
    ) sub;
  else
    v_showcase := v_profile.showcase_ids;
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'username', v_profile.username,
    'astrite', v_profile.astrite,
    'pity_5star', v_profile.pity_5star,
    'avatar_id', coalesce(v_profile.avatar_id, 'shorekeeper'),
    'custom_title', coalesce(v_profile.custom_title, 'The Rover'),
    'showcase_ids', v_showcase,
    'claimed_title_ids', coalesce(v_profile.claimed_title_ids, '{"the_rover"}'::text[]),
    'total_pulls', coalesce(v_profile.total_pulls, 0),
    'wins_5050', coalesce(v_profile.wins_5050, 0),
    'total_5050', coalesce(v_profile.total_5050, 0),
    'created_at', v_profile.created_at,
    'is_vip', coalesce(v_profile.is_vip, false),
    'inventory', v_inventory
  );
end;
$$;

-- Securely claims a title reward, adds to claimed_title_ids, and credits astrite reward to user profile
drop function if exists public.claim_player_title(uuid, text, integer);
create or replace function public.claim_player_title(
  p_user_id uuid,
  p_title_id text,
  p_reward_astrite integer
) returns jsonb language plpgsql security definer as $$
declare
  v_current_claimed text[];
  v_current_astrite integer;
  v_updated_claimed text[];
  v_new_astrite integer;
begin
  -- Guard: Claiming VIP title strictly requires is_vip status in database
  if p_title_id = 'vip' then
    if not exists (select 1 from public.profiles where id = p_user_id and is_vip = true) then
      return jsonb_build_object('success', false, 'error', 'VIP status required to claim this title');
    end if;
  end if;

  select coalesce(claimed_title_ids, '{"the_rover"}'::text[]), astrite
  into v_current_claimed, v_current_astrite
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User profile not found');
  end if;

  -- Check if already claimed
  if p_title_id = any(v_current_claimed) then
    return jsonb_build_object(
      'success', true,
      'claimed_titles', v_current_claimed,
      'reward_astrite', 0,
      'new_astrite', v_current_astrite
    );
  end if;

  -- Append to claimed array and add astrite
  v_updated_claimed := array_append(v_current_claimed, p_title_id);
  v_new_astrite := v_current_astrite + greatest(coalesce(p_reward_astrite, 0), 0);

  update public.profiles
  set claimed_title_ids = v_updated_claimed,
      astrite = v_new_astrite,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'claimed_titles', v_updated_claimed,
    'reward_astrite', greatest(coalesce(p_reward_astrite, 0), 0),
    'new_astrite', v_new_astrite
  );
end;
$$;

-- 9. ADMINISTRATIVE FUNCTIONS: GRANT / REVOKE VIP
create or replace function public.grant_vip(p_username text)
returns jsonb language plpgsql security definer as $$
begin
  update public.profiles
  set is_vip = true,
      claimed_title_ids = case 
        when 'vip' = any(claimed_title_ids) then claimed_title_ids
        else array_append(claimed_title_ids, 'vip')
      end,
      updated_at = now()
  where lower(username) = lower(trim(p_username));

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  return jsonb_build_object('success', true, 'message', 'VIP granted successfully');
end;
$$;

create or replace function public.revoke_vip(p_username text)
returns jsonb language plpgsql security definer as $$
begin
  update public.profiles
  set is_vip = false,
      claimed_title_ids = array_remove(claimed_title_ids, 'vip'),
      custom_title = case when custom_title = 'VIP' then 'The Rover' else custom_title end,
      updated_at = now()
  where lower(username) = lower(trim(p_username));

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  return jsonb_build_object('success', true, 'message', 'VIP revoked successfully');
end;
$$;

-- Securely saves a player's showcase resonator IDs (up to 6)
create or replace function public.save_player_showcase(
  p_user_id uuid,
  p_showcase_ids text[]
) returns jsonb language plpgsql security definer as $$
begin
  update public.profiles
  set showcase_ids = p_showcase_ids,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Securely saves a player's active title
create or replace function public.save_player_title(
  p_user_id uuid,
  p_custom_title text
) returns jsonb language plpgsql security definer as $$
begin
  update public.profiles
  set custom_title = p_custom_title,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Securely saves a player's active avatar
create or replace function public.save_player_avatar(
  p_user_id uuid,
  p_avatar_id text
) returns jsonb language plpgsql security definer as $$
begin
  update public.profiles
  set avatar_id = p_avatar_id,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Securely saves a player's security question and answer hash
drop function if exists public.save_user_security_question(uuid, text, text);
create or replace function public.save_user_security_question(
  p_user_id uuid,
  p_question text,
  p_answer_hash text
) returns jsonb language plpgsql security definer as $$
begin
  -- Update display question on profiles
  update public.profiles
  set security_question = p_question,
      updated_at = now()
  where id = p_user_id;

  -- Store security answer hash privately in user_security
  insert into public.user_security (user_id, security_question, security_answer_hash)
  values (p_user_id, p_question, p_answer_hash)
  on conflict (user_id) do update
  set security_question = excluded.security_question,
      security_answer_hash = excluded.security_answer_hash,
      updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

-- Securely saves a player's Tower of Adversity run state
create or replace function public.save_player_tower_state(
  p_user_id uuid,
  p_tower_state jsonb
) returns jsonb language plpgsql security definer as $$
begin
  update public.profiles
  set tower_run_state = p_tower_state,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Grant execution permissions
grant execute on function public.get_user_security_question(text) to authenticated, anon;
grant execute on function public.reset_password_with_security_answer(text, text, text) to authenticated, anon;
grant execute on function public.search_players(text) to authenticated, anon;
grant execute on function public.get_player_profile(text) to authenticated, anon;
grant execute on function public.save_player_showcase(uuid, text[]) to authenticated, anon;
grant execute on function public.save_player_title(uuid, text) to authenticated, anon;
grant execute on function public.save_player_avatar(uuid, text) to authenticated, anon;
grant execute on function public.claim_player_title(uuid, text, integer) to authenticated, anon;
grant execute on function public.save_user_security_question(uuid, text, text) to authenticated, anon;
grant execute on function public.grant_vip(text) to authenticated, anon;
grant execute on function public.revoke_vip(text) to authenticated, anon;
grant execute on function public.save_player_tower_state(uuid, jsonb) to authenticated, anon;


