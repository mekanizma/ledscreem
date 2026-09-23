-- Row Level Security policies

alter table public.profiles enable row level security;
alter table public.displays enable row level security;
alter table public.contents enable row level security;
alter table public.display_contents enable row level security;

-- PROFILES
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can update own name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- DISPLAYS
-- Public read so LED devices (anon) can load config
create policy "Anyone can read displays"
  on public.displays for select
  to anon, authenticated
  using (true);

create policy "Admins can insert displays"
  on public.displays for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update displays"
  on public.displays for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete displays"
  on public.displays for delete
  to authenticated
  using (public.is_admin());

-- CONTENTS
-- Public read for display playback (filtering done in app)
create policy "Anyone can read contents"
  on public.contents for select
  to anon, authenticated
  using (true);

create policy "Admins can insert contents"
  on public.contents for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update contents"
  on public.contents for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete contents"
  on public.contents for delete
  to authenticated
  using (public.is_admin());

-- DISPLAY_CONTENTS
create policy "Anyone can read display_contents"
  on public.display_contents for select
  to anon, authenticated
  using (true);

create policy "Admins can insert display_contents"
  on public.display_contents for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update display_contents"
  on public.display_contents for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete display_contents"
  on public.display_contents for delete
  to authenticated
  using (public.is_admin());
