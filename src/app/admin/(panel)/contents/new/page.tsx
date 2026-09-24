import { ContentForm } from "@/components/admin/ContentForm";
import { createClient } from "@/lib/supabase/server";
import { asDisplay } from "@/lib/supabase/types";

export default async function NewContentPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("displays")
    .select("*")
    .order("display_code", { ascending: true });

  const displays = (data ?? []).map(asDisplay);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni İçerik</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ekranda yayınlanacak görsel, video veya duyuru oluşturun
        </p>
      </div>
      <ContentForm
        mode="create"
        displays={displays.map((d) => ({
          id: d.id,
          display_code: d.display_code,
          name: d.name,
        }))}
      />
    </div>
  );
}
