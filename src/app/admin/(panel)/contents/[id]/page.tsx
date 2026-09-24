import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentForm } from "@/components/admin/ContentForm";
import { asContent, asDisplay } from "@/lib/supabase/types";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const content = asContent(data);

  const [{ data: displayRows }, { data: links }] = await Promise.all([
    supabase
      .from("displays")
      .select("*")
      .order("display_code", { ascending: true }),
    supabase
      .from("display_contents")
      .select("display_id")
      .eq("content_id", id),
  ]);

  const displays = (displayRows ?? []).map(asDisplay);
  const initialDisplayIds = (links ?? []).map((l) => l.display_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İçerik Düzenle</h1>
        <p className="mt-1 text-sm text-slate-500">{content.title}</p>
      </div>
      <ContentForm
        mode="edit"
        initial={content}
        displays={displays.map((d) => ({
          id: d.id,
          display_code: d.display_code,
          name: d.name,
        }))}
        initialDisplayIds={initialDisplayIds}
      />
    </div>
  );
}
