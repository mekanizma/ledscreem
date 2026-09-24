-- Switch default / existing displays to 65" TV Full HD (1920×1080 landscape)

alter table public.displays
  alter column width set default 1920,
  alter column height set default 1080,
  alter column orientation set default 'landscape';

update public.displays
set
  width = 1920,
  height = 1080,
  orientation = 'landscape',
  updated_at = now();
