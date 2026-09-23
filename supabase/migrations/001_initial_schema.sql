-- LED Digital Signage — Initial Schema
-- Timezone-aware scheduling uses timestamptz (app uses Europe/Nicosia)

create extension if not exists "pgcrypto";

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Displays (LED screens)
create table if not exists public.displays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  display_code text not null unique,
  width integer not null default 256,
  height integer not null default 640,
  orientation text not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  last_seen timestamptz,
  status text not null default 'unknown' check (status in ('online', 'offline', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists displays_display_code_idx on public.displays (display_code);

-- Contents (media & announcements)
create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('image', 'video', 'announcement')),
  image_url text,
  video_url text,
  media_path text,
  duration integer not null default 10 check (duration > 0),
  fit_mode text not null default 'cover' check (fit_mode in ('cover', 'contain')),
  video_end_behavior text not null default 'next-on-end' check (video_end_behavior in ('next-on-end', 'loop')),
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  announcement_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contents_active_idx on public.contents (active);
create index if not exists contents_type_idx on public.contents (type);

-- Display ↔ Content playlist junction
create table if not exists public.display_contents (
  id uuid primary key default gen_random_uuid(),
  display_id uuid not null references public.displays(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (display_id, content_id)
);

create index if not exists display_contents_display_sort_idx
  on public.display_contents (display_id, sort_order);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger displays_updated_at
  before update on public.displays
  for each row execute function public.set_updated_at();

create trigger contents_updated_at
  before update on public.contents
  for each row execute function public.set_updated_at();

create trigger display_contents_updated_at
  before update on public.display_contents
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check helper
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Heartbeat RPC (callable by anon; only updates last_seen/status)
create or replace function public.touch_display_heartbeat(p_display_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.displays
  set
    last_seen = now(),
    status = 'online',
    updated_at = now()
  where display_code = p_display_code;
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.touch_display_heartbeat(text) to anon, authenticated;

-- Realtime
alter publication supabase_realtime add table public.contents;
alter publication supabase_realtime add table public.display_contents;
alter publication supabase_realtime add table public.displays;
