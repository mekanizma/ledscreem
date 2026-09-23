import { createClient } from "@/lib/supabase/server";
import { PlaylistBoard, type PlaylistRow } from "@/components/admin/PlaylistBoard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListOrdered } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { asContent, asDisplay } from "@/lib/supabase/types";
import type { DisplayContent } from "@/lib/supabase/types";

export default async function PlaylistPage() {
  const supabase = await createClient();

  const { data: displayRow } = await supabase
    .from("displays")
    .select("*")
    .eq("display_code", "LED-001")
    .maybeSingle();

  if (!displayRow) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Yayın Sırası</h1>
        <EmptyState
          icon={ListOrdered}
          title="Ekran bulunamadı"
          description="Önce LED-001 ekranını oluşturun."
          action={
            <Link href="/admin/displays">
              <Button>Ekranlar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const display = asDisplay(displayRow);

  const { data: rows, error } = await supabase
    .from("display_contents")
    .select("*, content:contents(*)")
    .eq("display_id", display.id)
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yayın Sırası</h1>
        <p className="mt-1 text-sm text-slate-500">
          {display.display_code} · {display.name} · sürükle-bırak ile sıralayın
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          Yayın sırası yüklenirken bir hata oluştu.
        </p>
      ) : (
        <PlaylistBoard displayId={display.id} initialRows={playlist} />
      )}
    </div>
  );
}
