import {
  DISPLAY_CONFIG,
  HEARTBEAT_INTERVAL_MS,
  OFFLINE_THRESHOLD_MS,
  TIMEZONE,
} from "@/lib/config/display";
import { createClient } from "@/lib/supabase/server";
import { asProfile } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRow } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const profile = profileRow ? asProfile(profileRow) : null;

  const { data: adminRows } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const admins = (adminRows ?? []).map(asProfile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">Sistem ve hesap bilgileri</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Hesabım</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">E-posta</dt>
            <dd className="break-all font-medium">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Rol</dt>
            <dd className="font-medium capitalize">{profile?.role ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Ad</dt>
            <dd className="font-medium">{profile?.full_name ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Admin hesaplar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sisteme giriş yapabilen yönetici hesapları
        </p>
        {admins.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Henüz admin hesap yok.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {a.full_name || "—"}
                  </p>
                  <p className="break-all text-xs text-slate-500">{a.email}</p>
                </div>
                <span className="mt-1 inline-flex w-fit shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 sm:mt-0">
                  admin
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Ekran yapılandırması</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Varsayılan çözünürlük</dt>
            <dd className="font-mono font-medium">
              {DISPLAY_CONFIG.width} × {DISPLAY_CONFIG.height}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Orientation</dt>
            <dd className="font-medium capitalize">{DISPLAY_CONFIG.orientation}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Aspect ratio</dt>
            <dd className="font-mono font-medium">
              {DISPLAY_CONFIG.aspectRatio.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Timezone</dt>
            <dd className="font-medium">{TIMEZONE}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Heartbeat</dt>
            <dd className="font-medium">{HEARTBEAT_INTERVAL_MS / 1000} sn</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Offline eşiği</dt>
            <dd className="font-medium">{OFFLINE_THRESHOLD_MS / 1000} sn</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
