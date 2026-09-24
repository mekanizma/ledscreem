# Ekran Yönlendirme — Duyuru Yayın Yönetim Sistemi

Uzaktan yönetilebilir, 7/24 çalışan profesyonel ekran yönlendirme / duyuru yayın platformu.

**Varsayılan çözünürlük:** `1920 × 1080` (65" TV, landscape)

```text
ADMIN PANEL  →  SUPABASE (Auth / DB / Storage / Realtime)  →  EKRAN PLAYER
```

---

## 1. Proje amacı

Kurum / üniversite ekranlarında görsel, video ve yazılı duyuru / yönlendirme yayınlamak. Yönetici web panelinden içerik ekler; internete bağlı display cihazı (Mini PC, Raspberry Pi, Android Box, Windows) otomatik güncellenir.

## 2. Sistem mimarisi

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Auth | Supabase Authentication |
| Veri | Supabase PostgreSQL |
| Medya | Supabase Storage (`content-media`) |
| Canlı güncelleme | Supabase Realtime |
| Offline | localStorage playlist cache + PWA / Workbox |
| İkonlar | Lucide React |

Merkezi display config: `src/lib/config/display.ts`

```ts
const DISPLAY_CONFIG = {
  width: 1920,
  height: 1080,
  orientation: "landscape",
  aspectRatio: 1920 / 1080,
};
```

Her ekranın kendi `width` / `height` alanı vardır; ileride farklı çözünürlükler desteklenir.

## 3. Kullanılan teknolojiler

- Next.js + React 19
- TypeScript (strict)
- Tailwind CSS 4
- `@supabase/ssr` + `@supabase/supabase-js`
- `@dnd-kit` (playlist drag & drop)
- `qrcode.react`
- `date-fns` / `date-fns-tz` (`Europe/Nicosia`)
- Custom service worker (`public/sw.js`) — PWA cache

## 4. Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluşturun.
2. **Project Settings → API** içinden URL ve `anon` key alın.
3. `.env.local` dosyasını `.env.example` örneğine göre doldurun.
4. SQL Editor’de migration dosyalarını sırayla çalıştırın.

## 5. Database migration

Klasör: `supabase/migrations/`

| Dosya | İçerik |
|-------|--------|
| `001_initial_schema.sql` | Tablolar, trigger’lar, heartbeat RPC, realtime |
| `002_rls.sql` | Row Level Security |
| `003_storage.sql` | `content-media` bucket + politikalar |
| `004_seed.sql` | LED-001 + örnek duyurular |

Supabase SQL Editor’de **001 → 004** sırasıyla çalıştırın.

Realtime: migration `contents`, `display_contents`, `displays` tablolarını publication’a ekler. Dashboard → Database → Replication’dan doğrulayın.

## 6. Storage kurulumu

Bucket adı: **`content-media`** (public read)

İzin verilen MIME:

- `image/jpeg`, `image/png`, `image/webp`
- `video/mp4`, `video/webm`

Limitler uygulama tarafında da kontrol edilir (`MEDIA_LIMITS`).

## 7. RLS

- **Admin** (`profiles.role = 'admin'`): içerik / playlist / display CRUD
- **Anon (ekran cihazı)**: okuma + `touch_display_heartbeat` RPC
- Service role key **frontend’de yoktur**

## 8. Environment variables

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

İsteğe bağlı (yalnızca sunucu / script):

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

## 9. Admin kullanıcı oluşturma

1. Supabase → **Authentication → Users → Add user**
2. E-posta + şifre ile kullanıcı oluşturun
3. SQL:

```sql
update public.profiles
set role = 'admin', full_name = 'Sistem Yöneticisi'
where email = 'admin@ornek.edu';
```

4. `/admin/login` ile giriş yapın

## 10. Development

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev
```

- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Display: [http://localhost:3000/display/LED-001](http://localhost:3000/display/LED-001)
- Debug overlay: `/display/LED-001?debug=1`

## 11. Production — Render

Repo: [github.com/mekanizma/ledscreem](https://github.com/mekanizma/ledscreem)  
Blueprint: kökteki `render.yaml` (Frankfurt, Node 20, `master`, auto-deploy).

### Deploy adımları

1. [render.com](https://render.com) → **New → Blueprint** → `mekanizma/ledscreem` repo’sunu bağla.
2. Environment değerlerini doldur (build öncesi zorunlu):

| Key | Örnek |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | `https://ledscreem.onrender.com` |

3. Deploy bitince Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://ledscreem.onrender.com`
   - **Redirect URLs:** `https://ledscreem.onrender.com/**`
4. LED kiosk URL: `https://ledscreem.onrender.com/display/LED-001`

### Plan notu

`render.yaml` **Starter** plan kullanır (sürekli açık). Free plan uyur; 7/24 LED için uygun değildir.

### Yerel production denemesi

```bash
npm run build
npm start
```

HTTPS zorunludur (PWA + Secure cookie) — Render bunu sağlar.

## 12. LED display kurulumu

1. Display cihazında Chrome / Chromium / Edge açın
2. URL: `https://YOUR_DOMAIN/display/LED-001`
3. Tam ekran (F11) veya kiosk modu
4. Otomatik açılışta bu URL’yi başlatın
5. Ekran uykuya / ekran koruyucuya girmesin

## 13. Browser kiosk kurulumu

**Windows (Chrome):**

```bat
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=https://YOUR_DOMAIN/display/LED-001 --check-for-update-interval=604800
```

**Raspberry Pi / Linux:**

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars https://YOUR_DOMAIN/display/LED-001
```

**Android Box:** Fully Kiosk Browser veya Chrome kiosk shortcut.

## 14. Offline çalışma

- Son başarılı playlist `localStorage`’a yazılır
- Medya URL’leri Workbox `CacheFirst` ile cache’lenir
- İnternet kesilince son playlist sessizce devam eder (ziyaretçiye hata mesajı yok)
- Bağlantı gelince Realtime + `online` event ile senkronize olur

## 15. Birden fazla ekran ekleme

```sql
insert into public.displays (name, location, display_code, width, height, orientation)
values ('Kütüphane', 'Kütüphane Hol', 'LED-002', 1920, 1080, 'landscape');
```

Sonra `display_contents` ile o ekrana özel playlist bağlayın.

URL: `/display/LED-002`

---

## Admin menü

- Dashboard
- İçerikler
- Yayın Sırası (drag & drop)
- Ekranlar (online / offline heartbeat)
- Zamanlama (`Europe/Nicosia`)
- Ayarlar

## Display davranışı

- Mantıksal viewport: ekranın `width × height` (varsayılan 1920×1080)
- Browser çözünürlüğüne orantılı scale (`object-fit: cover | contain`)
- Aspect ratio asla bozulmaz
- Video: `autoplay` + `muted` + `playsInline`, varsayılan `next-on-end`
- Realtime playlist değişince mevcut içerik biter, sonra yeni listeye geçilir
- Heartbeat: 30 sn · Offline eşiği: 90 sn

## Proje yapısı (özet)

```text
src/
  app/admin/(panel)/     Admin sayfaları
  app/admin/login/       Giriş
  app/display/[code]/   LED player
  components/admin/      Panel UI
  components/display/    Player + preview
  lib/config/display.ts  Merkezi config
  lib/supabase/          Client / server / middleware
  lib/cache/offline.ts   Offline cache
supabase/migrations/     SQL
```

## Güvenlik notları

- `SUPABASE_SERVICE_ROLE_KEY` asla `NEXT_PUBLIC_*` yapmayın
- Admin route’ları middleware + `profiles.role` ile korunur
- Display yalnızca okuma + heartbeat yetkisine sahiptir
