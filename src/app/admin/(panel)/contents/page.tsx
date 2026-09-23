import Link from "next/link";
import { Plus, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContentTable } from "@/components/admin/ContentTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { asContent } from "@/lib/supabase/types";

export default async function ContentsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("updated_at", { ascending: false });

  const contents = (data ?? []).map(asContent);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">İçerikler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Görsel, video ve duyuru yönetimi
          </p>
        </div>
        <Link href="/admin/contents/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden />
            Yeni İçerik
          </Button>
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          İçerik yüklenirken bir hata oluştu.
        </p>
      ) : contents.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Henüz içerik eklenmemiş."
          description="İlk afiş, video veya duyurunuzu ekleyerek yayına başlayın."
          action={
            <Link href="/admin/contents/new">
              <Button>
                <Plus className="h-4 w-4" />
                Yeni İçerik
              </Button>
            </Link>
          }
        />
      ) : (
        <ContentTable contents={contents} />
      )}
    </div>
  );
}
