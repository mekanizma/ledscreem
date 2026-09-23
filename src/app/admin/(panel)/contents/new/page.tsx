import { ContentForm } from "@/components/admin/ContentForm";

export default function NewContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni İçerik</h1>
        <p className="mt-1 text-sm text-slate-500">
          LED ekranda yayınlanacak görsel, video veya duyuru oluşturun
        </p>
      </div>
      <ContentForm mode="create" />
    </div>
  );
}
