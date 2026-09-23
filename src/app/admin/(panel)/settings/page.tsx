import { DISPLAY_CONFIG, HEARTBEAT_INTERVAL_MS, OFFLINE_THRESHOLD_MS, TIMEZONE } from "@/lib/config/display";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">Sistem ve hesap bilgileri</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Hesap</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">E-posta</dt>
            <dd className="font-medium">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Rol</dt>
            <dd className="font-medium capitalize">{profile?.role ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Ad</dt>
            <dd className="font-medium">{profile?.full_name ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Display Configuration</h2>
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
