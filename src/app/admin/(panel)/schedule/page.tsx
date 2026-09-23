import { createClient } from "@/lib/supabase/server";
import { getContentScheduleStatus, STATUS_LABELS } from "@/lib/content/status";
import { formatNicosia } from "@/lib/time/timezone";
import { asContent } from "@/lib/supabase/types";
import Link from "next/link";
import { TIMEZONE } from "@/lib/config/display";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contents")
    .select("*")
    .or("start_at.not.is.null,end_at.not.is.null")
    .order("start_at", { ascending: true });

  const contents = (data ?? []).map(asContent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zamanlama</h1>
        <p className="mt-1 text-sm text-slate-500">
          Başlangıç / bitiş tarihli içerikler · saat dilimi {TIMEZONE}
        </p>
      </div>

      {contents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Zamanlanmış içerik yok. İçerik düzenlerken başlangıç ve bitiş tarihi
          belirleyebilirsiniz.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {contents.map((c) => {
            const status = getContentScheduleStatus(c);
            const meta = STATUS_LABELS[status];
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/contents/${c.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatNicosia(c.start_at)} → {formatNicosia(c.end_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${meta.color}`}
                  >
                    {meta.emoji} {meta.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
