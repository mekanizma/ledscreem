import { createClient } from "@/lib/supabase/server";
import { DisplayStatusCard } from "@/components/admin/DisplayStatusCard";
import { CreateDisplayForm } from "@/components/admin/CreateDisplayForm";
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

  const nextCode = (() => {
    const nums = displays
      .map((d) => d.display_code.match(/^TV(\d+)$/i)?.[1])
      .filter(Boolean)
      .map(Number);
    const max = nums.length ? Math.max(...nums) : 0;
    return `TV${max + 1}`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ekranlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Birden fazla TV (TV1, TV2…) yönetin · online/offline durumu
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
          description={`Aşağıdan TV1, TV2 gibi ekranlar ekleyin (${DISPLAY_CONFIG.width}×${DISPLAY_CONFIG.height}).`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displays.map((d) => (
            <DisplayStatusCard key={d.id} display={d} />
          ))}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Yeni ekran ekle</h2>
        <p className="mt-1 text-sm text-slate-500">
          Her TV kendi yayın sırasına sahiptir. Player URL:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            /display/TV1
          </code>
        </p>
        <div className="mt-4">
          <CreateDisplayForm suggestedCode={nextCode} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Varsayılan çözünürlük: {DISPLAY_CONFIG.width} × {DISPLAY_CONFIG.height}{" "}
          ({DISPLAY_CONFIG.orientation})
        </p>
      </section>
    </div>
  );
}
