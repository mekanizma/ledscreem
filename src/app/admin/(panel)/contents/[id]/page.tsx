import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentForm } from "@/components/admin/ContentForm";
import { asContent } from "@/lib/supabase/types";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İçerik Düzenle</h1>
        <p className="mt-1 text-sm text-slate-500">{content.title}</p>
      </div>
      <ContentForm mode="edit" initial={content} />
    </div>
  );
}
