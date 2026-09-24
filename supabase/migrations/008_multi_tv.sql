-- Multi-TV: ensure TV1 and TV2 exist (65" Full HD landscape)

-- Rename legacy LED-001 → TV1 when TV1 is free
update public.displays
set
  display_code = 'TV1',
  name = coalesce(nullif(name, ''), 'TV 1'),
  width = 1920,
  height = 1080,
  orientation = 'landscape',
  updated_at = now()
where display_code = 'LED-001'
  and not exists (select 1 from public.displays where display_code = 'TV1');

insert into public.displays (
  name, location, display_code, width, height, orientation, status
) values
  ('TV 1', 'Salon / TV 1', 'TV1', 1920, 1080, 'landscape', 'unknown'),
  ('TV 2', 'Salon / TV 2', 'TV2', 1920, 1080, 'landscape', 'unknown')
on conflict (display_code) do update set
  name = excluded.name,
  location = excluded.location,
  width = excluded.width,
  height = excluded.height,
  orientation = excluded.orientation,
  updated_at = now();
