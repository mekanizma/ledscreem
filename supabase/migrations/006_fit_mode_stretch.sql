-- Allow stretch fit mode (fill LED without cropping)
alter table public.contents
  drop constraint if exists contents_fit_mode_check;

alter table public.contents
  add constraint contents_fit_mode_check
  check (fit_mode in ('stretch', 'contain', 'cover'));

alter table public.contents
  alter column fit_mode set default 'stretch';

-- Existing "cover" contents were cropping posters — switch to stretch
update public.contents
set fit_mode = 'stretch'
where fit_mode = 'cover';
