"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_FIT_MODE,
  DEFAULT_IMAGE_DURATION,
  DEFAULT_VIDEO_END,
  DISPLAY_CONFIG,
  STORAGE_BUCKET,
  type ContentType,
  type FitMode,
  type VideoEndBehavior,
} from "@/lib/config/display";
import type { AnnouncementData, Content } from "@/lib/supabase/types";
import {
  adaptationHint,
  readImageDimensions,
  readVideoMetadata,
  validateMediaFile,
} from "@/lib/content/validation";
import { contentToPreviewItem } from "@/lib/content/playlist";
import { isoToNicosiaLocal, nicosiaLocalToIso } from "@/lib/time/timezone";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PreviewFrame } from "@/components/display/PreviewFrame";

const emptyAnnouncement = (): AnnouncementData => ({
  title: "",
  description: "",
  subtitle: "",
  logo_url: null,
  qr_url: "",
  background: "#0B1F3A",
  text_color: "#FFFFFF",
  alignment: "center",
  show_qr: false,
});

interface ContentFormProps {
  mode: "create" | "edit";
  initial?: Content;
  defaultDisplayId?: string | null;
}

export function ContentForm({ mode, initial, defaultDisplayId }: ContentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<ContentType>(initial?.type ?? "image");
  const [fitMode, setFitMode] = useState<FitMode>(initial?.fit_mode ?? DEFAULT_FIT_MODE);
  const [duration, setDuration] = useState(initial?.duration ?? DEFAULT_IMAGE_DURATION);
  const [videoEnd, setVideoEnd] = useState<VideoEndBehavior>(
    initial?.video_end_behavior ?? DEFAULT_VIDEO_END,
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [startAt, setStartAt] = useState(isoToNicosiaLocal(initial?.start_at));
  const [endAt, setEndAt] = useState(isoToNicosiaLocal(initial?.end_at));
  const [announcement, setAnnouncement] = useState<AnnouncementData>(
    initial?.announcement_data ?? emptyAnnouncement(),
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [mediaPath, setMediaPath] = useState(initial?.media_path ?? "");
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignToDisplay, setAssignToDisplay] = useState(true);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const previewItem = useMemo(() => {
    const draft: Content = {
      id: initial?.id ?? "preview",
      title: title || "Önizleme",
      description,
      type,
      image_url: type === "image" ? localPreview || imageUrl || null : null,
      video_url: type === "video" ? localPreview || videoUrl || null : null,
      media_path: mediaPath || null,
      duration,
      fit_mode: fitMode,
      video_end_behavior: videoEnd,
      active,
      start_at: null,
      end_at: null,
      announcement_data:
        type === "announcement"
          ? { ...announcement, show_qr: Boolean(announcement.qr_url && announcement.show_qr) }
          : null,
      created_at: "",
      updated_at: "",
    };
    return contentToPreviewItem(draft);
  }, [
    initial?.id,
    title,
    description,
    type,
    localPreview,
    imageUrl,
    videoUrl,
    mediaPath,
    duration,
    fitMode,
    videoEnd,
    active,
    announcement,
  ]);

  const onFile = useCallback(async (file: File | null) => {
    setError(null);
    setFileHint(null);
    if (!file) return;

    const check = validateMediaFile(file);
    if (!check.ok || !check.kind) {
      setError(check.error ?? "Geçersiz dosya");
      return;
    }

    setType(check.kind);

    try {
      if (check.kind === "image") {
        const meta = await readImageDimensions(file);
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return meta.objectUrl;
        });
        setFileHint(
          adaptationHint(
            meta.width,
            meta.height,
            DISPLAY_CONFIG.width,
            DISPLAY_CONFIG.height,
          ),
        );
        setDuration((d) => (d > 0 ? d : DEFAULT_IMAGE_DURATION));
      } else {
        const meta = await readVideoMetadata(file);
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return meta.objectUrl;
        });
        setFileHint(
          adaptationHint(
            meta.width,
            meta.height,
            DISPLAY_CONFIG.width,
            DISPLAY_CONFIG.height,
          ),
        );
        setDuration(meta.duration);
      }

      // Upload immediately for reliability
      setUploadProgress(0);
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${check.kind}/${crypto.randomUUID()}.${ext}`;

      // Simulate progress since supabase-js doesn't expose upload progress easily
      const progressTimer = setInterval(() => {
        setUploadProgress((p) => (p === null || p >= 90 ? p : p + 8));
      }, 200);

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      clearInterval(progressTimer);

      if (upErr) {
        setUploadProgress(null);
        setError(upErr.message);
        return;
      }

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setMediaPath(path);
      if (check.kind === "image") {
        setImageUrl(pub.publicUrl);
        setVideoUrl("");
      } else {
        setVideoUrl(pub.publicUrl);
        setImageUrl("");
      }
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 800);
    } catch (e) {
      setUploadProgress(null);
      setError(e instanceof Error ? e.message : "Yükleme başarısız");
    }
  }, []);

  const save = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Başlık zorunludur.");
      return;
    }
    if (type === "image" && !imageUrl) {
      setError("Görsel yükleyin.");
      return;
    }
    if (type === "video" && !videoUrl) {
      setError("Video yükleyin.");
      return;
    }
    if (type === "announcement" && !announcement.description.trim()) {
      setError("Duyuru metni zorunludur.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      image_url: type === "image" ? imageUrl : type === "announcement" ? null : null,
      video_url: type === "video" ? videoUrl : null,
      media_path: mediaPath || null,
      duration: Math.max(1, Number(duration) || DEFAULT_IMAGE_DURATION),
      fit_mode: fitMode,
      video_end_behavior: videoEnd,
      active,
      start_at: nicosiaLocalToIso(startAt),
      end_at: nicosiaLocalToIso(endAt),
      announcement_data:
        type === "announcement"
          ? ({
              ...announcement,
              show_qr: Boolean(announcement.qr_url?.trim() && announcement.show_qr),
              qr_url: announcement.qr_url?.trim() || null,
            } as unknown as import("@/lib/supabase/types").Json)
          : null,
    };

    try {
      if (mode === "create") {
        const { data, error: insErr } = await supabase
          .from("contents")
          .insert(payload)
          .select("*")
          .single();
        if (insErr) throw insErr;

        if (assignToDisplay) {
          let displayId = defaultDisplayId;
          if (!displayId) {
            const { data: d } = await supabase
              .from("displays")
              .select("id")
              .eq("display_code", "LED-001")
              .maybeSingle();
            displayId = d?.id ?? null;
          }
          if (displayId && data) {
            const { data: maxRow } = await supabase
              .from("display_contents")
              .select("sort_order")
              .eq("display_id", displayId)
              .order("sort_order", { ascending: false })
              .limit(1)
              .maybeSingle();
            const nextOrder = (maxRow?.sort_order ?? -1) + 1;
            await supabase.from("display_contents").insert({
              display_id: displayId,
              content_id: data.id,
              sort_order: nextOrder,
              active: true,
            });
          }
        }

        router.push("/admin/contents");
        router.refresh();
      } else if (initial) {
        const { error: updErr } = await supabase
          .from("contents")
          .update(payload)
          .eq("id", initial.id);
        if (updErr) throw updErr;
        router.push("/admin/contents");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <Input
          label="Başlık"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn. Üniversite Kayıtları"
          required
        />

        <Textarea
          label="Açıklama"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="İsteğe bağlı"
        />

        <Select
          label="Tür"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as ContentType)}
          options={[
            { value: "image", label: "Görsel" },
            { value: "video", label: "Video" },
            { value: "announcement", label: "Duyuru" },
          ]}
        />

        {type !== "announcement" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="media-file">
              Dosya
            </label>
            <input
              id="media-file"
              type="file"
              accept={
                type === "video"
                  ? "video/mp4,video/webm"
                  : "image/jpeg,image/png,image/webp"
              }
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
            />
            {uploadProgress !== null ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : null}
            {fileHint ? <p className="text-xs text-slate-500">{fileHint}</p> : null}
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-800">Duyuru alanları</p>
            <Input
              label="Üst başlık"
              value={announcement.title}
              onChange={(e) => setAnnouncement((a) => ({ ...a, title: e.target.value }))}
              placeholder="2026-2027"
            />
            <Input
              label="Ana metin"
              value={announcement.description}
              onChange={(e) =>
                setAnnouncement((a) => ({ ...a, description: e.target.value }))
              }
              placeholder="KAYITLAR BAŞLADI"
            />
            <Textarea
              label="Alt yazı"
              value={announcement.subtitle}
              onChange={(e) => setAnnouncement((a) => ({ ...a, subtitle: e.target.value }))}
              placeholder="Yeni dönem kayıtları başlamıştır."
            />
            <Input
              label="QR URL (isteğe bağlı)"
              value={announcement.qr_url ?? ""}
              onChange={(e) => setAnnouncement((a) => ({ ...a, qr_url: e.target.value }))}
              placeholder="https://..."
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={announcement.show_qr}
                onChange={(e) =>
                  setAnnouncement((a) => ({ ...a, show_qr: e.target.checked }))
                }
                className="rounded border-slate-300"
              />
              QR kodu göster
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Arka plan"
                type="color"
                value={announcement.background}
                onChange={(e) =>
                  setAnnouncement((a) => ({ ...a, background: e.target.value }))
                }
              />
              <Input
                label="Yazı rengi"
                type="color"
                value={announcement.text_color}
                onChange={(e) =>
                  setAnnouncement((a) => ({ ...a, text_color: e.target.value }))
                }
              />
            </div>
            <Select
              label="Hizalama"
              value={announcement.alignment}
              onChange={(e) =>
                setAnnouncement((a) => ({
                  ...a,
                  alignment: e.target.value as AnnouncementData["alignment"],
                }))
              }
              options={[
                { value: "left", label: "Sol" },
                { value: "center", label: "Orta" },
                { value: "right", label: "Sağ" },
              ]}
            />
          </div>
        )}

        {type !== "announcement" ? (
          <Select
            label="Görüntüleme"
            name="fit_mode"
            value={fitMode}
            onChange={(e) => setFitMode(e.target.value as FitMode)}
            options={[
              {
                value: "stretch",
                label: "Doldur (kesmeden — 256×640'a yay)",
              },
              {
                value: "contain",
                label: "Sığdır (tamamı görünsün, boşluk olabilir)",
              },
              {
                value: "cover",
                label: "Kırparak doldur (kenarlar kesilir)",
              },
            ]}
          />
        ) : null}

        <Input
          label="Süre (saniye)"
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          hint={
            type === "video"
              ? "Video için varsayılan süre metadata'dan gelir; override edebilirsiniz."
              : undefined
          }
        />

        {type === "video" ? (
          <Select
            label="Video bitince"
            value={videoEnd}
            onChange={(e) => setVideoEnd(e.target.value as VideoEndBehavior)}
            options={[
              { value: "next-on-end", label: "Sonraki içeriğe geç" },
              { value: "loop", label: "Döngü" },
            ]}
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Başlangıç"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            hint="Europe/Nicosia"
          />
          <Input
            label="Bitiş"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Aktif
        </label>

        {mode === "create" ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={assignToDisplay}
              onChange={(e) => setAssignToDisplay(e.target.checked)}
              className="rounded border-slate-300"
            />
            LED-001 yayın sırasına ekle
          </label>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            İptal
          </Button>
          <Button type="button" loading={saving} onClick={() => void save()}>
            {mode === "create" ? "Yayınla" : "Kaydet"}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-6">
        <PreviewFrame item={previewItem} />
      </div>
    </div>
  );
}
