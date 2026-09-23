-- Demo seed data
-- Run AFTER creating an admin user and setting profiles.role = 'admin'

insert into public.displays (
  name, location, display_code, width, height, orientation, status
) values (
  'Ana Bina Duyuru Ekranı',
  'Ana Bina Giriş',
  'LED-001',
  256,
  640,
  'portrait',
  'unknown'
)
on conflict (display_code) do nothing;

-- Sample announcement contents
insert into public.contents (
  title, description, type, duration, fit_mode, active, announcement_data
)
select * from (values
  (
    'Üniversite Kayıtları'::text,
    '2026-2027 akademik yıl kayıtları'::text,
    'announcement'::text,
    10,
    'cover'::text,
    true,
    '{
      "title": "2026-2027",
      "description": "KAYITLAR BAŞLADI",
      "subtitle": "Yeni dönem kayıtları başlamıştır. Detaylı bilgi için QR kodu okutunuz.",
      "logo_url": null,
      "qr_url": "https://example.com/kayit",
      "background": "#0B1F3A",
      "text_color": "#FFFFFF",
      "alignment": "center",
      "show_qr": true
    }'::jsonb
  ),
  (
    'Burs Başvuruları'::text,
    'Burs ve destek başvuruları'::text,
    'announcement'::text,
    12,
    'cover'::text,
    true,
    '{
      "title": "BURS",
      "description": "BAŞVURULAR AÇIK",
      "subtitle": "Öğrenci burs başvuruları devam etmektedir.",
      "logo_url": null,
      "qr_url": "https://example.com/burs",
      "background": "#1A3A2A",
      "text_color": "#F5F5F0",
      "alignment": "center",
      "show_qr": true
    }'::jsonb
  ),
  (
    'Akademik Takvim'::text,
    'Dönem akademik takvimi'::text,
    'announcement'::text,
    10,
    'cover'::text,
    true,
    '{
      "title": "AKADEMİK",
      "description": "TAKVİM",
      "subtitle": "Dönem başlangıç ve sınav tarihlerini takip ediniz.",
      "logo_url": null,
      "qr_url": null,
      "background": "#2A1F0B",
      "text_color": "#FFF8E7",
      "alignment": "center",
      "show_qr": false
    }'::jsonb
  ),
  (
    'Mezuniyet Töreni'::text,
    'Mezuniyet töreni duyurusu'::text,
    'announcement'::text,
    10,
    'cover'::text,
    true,
    '{
      "title": "MEZUNİYET",
      "description": "TÖRENİ",
      "subtitle": "Tarih ve yer bilgisi için QR kodu okutunuz.",
      "logo_url": null,
      "qr_url": "https://example.com/mezuniyet",
      "background": "#1A0B2A",
      "text_color": "#F8F0FF",
      "alignment": "center",
      "show_qr": true
    }'::jsonb
  )
) as v(title, description, type, duration, fit_mode, active, announcement_data)
where not exists (
  select 1 from public.contents c where c.title = v.title
);

-- Attach all seed contents to LED-001
insert into public.display_contents (display_id, content_id, sort_order, active)
select d.id, c.id, row_number() over (order by c.created_at) - 1, true
from public.displays d
cross join public.contents c
where d.display_code = 'LED-001'
  and c.title in (
    'Üniversite Kayıtları',
    'Burs Başvuruları',
    'Akademik Takvim',
    'Mezuniyet Töreni'
  )
on conflict (display_id, content_id) do nothing;
