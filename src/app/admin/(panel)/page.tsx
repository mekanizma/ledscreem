import {
  Images,
  Monitor,
  Radio,
  Wifi,
  WifiOff,
  Clapperboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/StatCard";
import { DisplayStatusCard } from "@/components/admin/DisplayStatusCard";
import { isContentPlayable, isDisplayOnline } from "@/lib/content/status";
import { formatNicosia } from "@/lib/time/timezone";
import { asContent, asDisplay } from "@/lib/supabase/types";
import type { Content, Display } from "@/lib/supabase/types";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: contents }, { data: displays }, { data: displayContents }] =
    await Promise.all([
      supabase
        .from("contents")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("displays").select("*").order("name"),
      supabase
        .from("display_contents")
        .select("id, active, content:contents(active, start_at, end_at)")
        .eq("active", true),
    ]);

  const allContents: Content[] = (contents ?? []).map(asContent);
  const allDisplays: Display[] = (displays ?? []).map(asDisplay);

  const total = allContents.length;
  const active = allContents.filter((c) => c.active).length;
  const onAir = allContents.filter((c) => isContentPlayable(c)).length;
  const onlineDisplays = allDisplays.filter((d) => isDisplayOnline(d.last_seen)).length;
  const offlineDisplays = allDisplays.length - onlineDisplays;

  const recent = allContents.slice(0, 6);

  // Rough "yayında" count: playable items currently in any playlist
  const playableInPlaylist = (displayContents ?? []).filter((row) => {
    const raw = row.content as unknown;
    const c = (Array.isArray(raw) ? raw[0] : raw) as {
      active: boolean;
      start_at: string | null;
      end_at: string | null;
    } | null;
    return c ? isContentPlayable(c) : false;
  }).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ekran yönlendirme sistemi genel durumu
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Toplam İçerik" value={total} icon={Images} />
        <StatCard label="Aktif İçerik" value={active} icon={Clapperboard} />
        <StatCard
          label="Yayında"
          value={playableInPlaylist || onAir}
          icon={Radio}
          hint="Playlist'te oynatılabilir"
        />
        <StatCard label="Ekranlar" value={allDisplays.length} icon={Monitor} />
        <StatCard label="Online Ekran" value={onlineDisplays} icon={Wifi} />
        <StatCard label="Offline Ekran" value={offlineDisplays} icon={WifiOff} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Ekranlar</h2>
            <Link
              href="/admin/displays"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Tümü
            </Link>
          </div>
          <div className="space-y-3">
            {allDisplays.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                Henüz ekran tanımlı değil.
              </p>
            ) : (
              allDisplays.map((d) => <DisplayStatusCard key={d.id} display={d} />)
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Son Güncellenen İçerikler
            </h2>
            <Link
              href="/admin/contents"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Tümü
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {recent.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                Henüz içerik eklenmemiş.
              </li>
            ) : (
              recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/contents/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {c.title}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">{c.type}</p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">
                      {formatNicosia(c.updated_at, "dd.MM HH:mm")}
                    </time>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
