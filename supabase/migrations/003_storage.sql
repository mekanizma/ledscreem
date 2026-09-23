-- Storage bucket for content media

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  209715200, -- 200 MB
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
create policy "Public read content-media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'content-media');

-- Admin write
create policy "Admins upload content-media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-media'
    and public.is_admin()
  );

create policy "Admins update content-media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'content-media' and public.is_admin())
  with check (bucket_id = 'content-media' and public.is_admin());

create policy "Admins delete content-media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'content-media' and public.is_admin());
