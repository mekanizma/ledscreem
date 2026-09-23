import { createClient } from "@/lib/supabase/server";
import { DisplayStatusCard } from "@/components/admin/DisplayStatusCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Monitor } from "lucide-react";
import { asDisplay } from "@/lib/supabase/types";
import { DISPLAY_CONFIG } from "@/lib/config/display";

export default async function DisplaysPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("displays")
    .select("*")
    .order("created_at", { ascending: true });

  const displays = (data ?? []).map(asDisplay);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ekranlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          LED cihazları ve online/offline durumu
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          Ekranlar yüklenirken bir hata oluştu.
        </p>
      ) : displays.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="Henüz ekran yok"
          description={`Supabase seed migration ile LED-001 (${DISPLAY_CONFIG.width}×${DISPLAY_CONFIG.height}) oluşturabilirsiniz.`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displays.map((d) => (
            <DisplayStatusCard key={d.id} display={d} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Yeni ekran ekleme</p>
        <p className="mt-1">
          `displays` tablosuna yeni kayıt ekleyin. Display URL formatı:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            /display/LED-00X
          </code>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Varsayılan çözünürlük: {DISPLAY_CONFIG.width} × {DISPLAY_CONFIG.height}{" "}
          ({DISPLAY_CONFIG.orientation})
        </p>
      </div>
    </div>
  );
}
