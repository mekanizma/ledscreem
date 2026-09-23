"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Power } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Content } from "@/lib/supabase/types";
import { getContentScheduleStatus, STATUS_LABELS } from "@/lib/content/status";
import { formatDuration, formatNicosia } from "@/lib/time/timezone";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

const TYPE_LABELS = {
  image: "Görsel",
  video: "Video",
  announcement: "Duyuru",
} as const;

export function ContentTable({ contents }: { contents: Content[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleActive = async (content: Content) => {
    setBusyId(content.id);
    const supabase = createClient();
    await supabase
      .from("contents")
      .update({ active: !content.active })
      .eq("id", content.id);
    setBusyId(null);
    router.refresh();
  };

  const remove = async (content: Content) => {
    if (!confirm(`"${content.title}" silinsin mi?`)) return;
    setBusyId(content.id);
    const supabase = createClient();
    if (content.media_path) {
      await supabase.storage.from("content-media").remove([content.media_path]);
    }
    await supabase.from("contents").delete().eq("id", content.id);
    setBusyId(null);
    router.refresh();
  };

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Önizleme</th>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Süre</th>
                <th className="px-4 py-3">Başlangıç</th>
                <th className="px-4 py-3">Bitiş</th>
                <th className="px-4 py-3">Güncelleme</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contents.map((c) => {
                const status = getContentScheduleStatus(c);
                const meta = STATUS_LABELS[status];
                const thumb =
                  c.type === "image"
                    ? c.image_url
                    : c.type === "video"
                      ? c.video_url
                      : null;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex h-14 w-8 items-center justify-center overflow-hidden rounded bg-slate-900">
                        {thumb ? (
                          c.type === "video" ? (
                            <video src={thumb} className="h-full w-full object-cover" muted />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          )
                        ) : (
                          <span
                            className="h-full w-full"
                            style={{
                              background:
                                c.announcement_data?.background ?? "#0B1F3A",
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[c.type]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDuration(c.duration)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatNicosia(c.start_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatNicosia(c.end_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatNicosia(c.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Aktif/pasif"
                          disabled={busyId === c.id}
                          onClick={() => void toggleActive(c)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Link
                          href={`/admin/contents/${c.id}`}
                          className="inline-flex h-9 items-center rounded-lg px-3 text-slate-700 hover:bg-slate-100"
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Sil"
                          disabled={busyId === c.id}
                          onClick={() => void remove(c)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {contents.map((c) => {
          const status = getContentScheduleStatus(c);
          const meta = STATUS_LABELS[status];
          return (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{c.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {TYPE_LABELS[c.type]} · {formatDuration(c.duration)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.color}`}
                >
                  {meta.label}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === c.id}
                  onClick={() => void toggleActive(c)}
                >
                  {c.active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
                <Link
                  href={`/admin/contents/${c.id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium"
                >
                  Düzenle
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === c.id}
                  onClick={() => void remove(c)}
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
