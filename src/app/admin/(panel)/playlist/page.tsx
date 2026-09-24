import { createClient } from "@/lib/supabase/server";
import { PlaylistBoard, type PlaylistRow } from "@/components/admin/PlaylistBoard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListOrdered } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { asContent, asDisplay } from "@/lib/supabase/types";
import type { DisplayContent } from "@/lib/supabase/types";

export default async function PlaylistPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: codeParam } = await searchParams;
  const supabase = await createClient();

  const { data: allRows } = await supabase
    .from("displays")
    .select("*")
    .order("display_code", { ascending: true });

  const allDisplays = (allRows ?? []).map(asDisplay);

  if (allDisplays.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Yayın Sırası</h1>
        <EmptyState
          icon={ListOrdered}
          title="Ekran bulunamadı"
          description="Önce Ekranlar sayfasından TV1 / TV2 ekleyin."
          action={
            <Link href="/admin/displays">
              <Button>Ekranlar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selected =
    allDisplays.find((d) => d.display_code === codeParam) ?? allDisplays[0];

  const { data: rows, error } = await supabase
    .from("display_contents")
    .select("*, content:contents(*)")
    .eq("display_id", selected.id)
    .order("sort_order", { ascending: true });

  const playlist: PlaylistRow[] = (rows ?? []).map((row) => {
    const contentRaw = row.content as unknown;
    const contentRow = (
      Array.isArray(contentRaw) ? contentRaw[0] : contentRaw
    ) as Parameters<typeof asContent>[0];
    return {
      ...(row as DisplayContent),
      content: asContent(contentRow),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yayın Sırası</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selected.display_code} · {selected.name} · sürükle-bırak ile sıralayın
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allDisplays.map((d) => {
            const active = d.id === selected.id;
            return (
              <Link
                key={d.id}
                href={`/admin/playlist?code=${encodeURIComponent(d.display_code)}`}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {d.display_code}
              </Link>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          Yayın sırası yüklenirken bir hata oluştu.
        </p>
      ) : (
        <PlaylistBoard
          key={selected.id}
          displayId={selected.id}
          initialRows={playlist}
        />
      )}
    </div>
  );
}
