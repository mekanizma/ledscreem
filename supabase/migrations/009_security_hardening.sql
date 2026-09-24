-- Stop privilege escalation and hide unpublished content from anonymous clients.

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
    'viewer'
  );
  return new;
end;
$$;

-- Signed-in users cannot change role or email. Service role / direct SQL has no auth.uid().
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

revoke update on table public.profiles from anon, authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists "Anyone can read contents" on public.contents;
drop policy if exists "Anyone can read playable contents" on public.contents;
drop policy if exists "Admins can read all contents" on public.contents;

create policy "Anyone can read playable contents"
  on public.contents for select
  to anon, authenticated
  using (
    active = true
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );

create policy "Admins can read all contents"
  on public.contents for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Anyone can read display_contents" on public.display_contents;
drop policy if exists "Anyone can read playable display_contents" on public.display_contents;
drop policy if exists "Admins can read all display_contents" on public.display_contents;

create policy "Anyone can read playable display_contents"
  on public.display_contents for select
  to anon, authenticated
  using (
    active = true
    and exists (
      select 1
      from public.contents c
      where c.id = content_id
        and c.active = true
        and (c.start_at is null or c.start_at <= now())
        and (c.end_at is null or c.end_at >= now())
    )
  );

create policy "Admins can read all display_contents"
  on public.display_contents for select
  to authenticated
  using (public.is_admin());
