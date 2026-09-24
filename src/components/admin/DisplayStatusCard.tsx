import Link from "next/link";
import { isDisplayOnline } from "@/lib/content/status";
import { formatRelativeTr } from "@/lib/time/timezone";
import type { Display } from "@/lib/supabase/types";

export function DisplayStatusCard({ display }: { display: Display }) {
  const online = isDisplayOnline(display.last_seen);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-900">
            {display.display_code}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">{display.name}</p>
          {display.location ? (
            <p className="text-xs text-slate-500">{display.location}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            online
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`}
            aria-hidden
          />
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Resolution</dt>
          <dd className="font-medium text-slate-800">
            {display.width} × {display.height}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Last seen</dt>
          <dd className="font-medium text-slate-800">
            {formatRelativeTr(display.last_seen)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/display/${display.display_code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Display URL aç
        </Link>
        <Link
          href={`/admin/playlist?code=${encodeURIComponent(display.display_code)}`}
          className="inline-flex text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Yayın sırası
        </Link>
      </div>
    </div>
  );
}
