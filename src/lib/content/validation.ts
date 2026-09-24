import { MEDIA_LIMITS } from "@/lib/config/display";

export interface MediaValidationResult {
  ok: boolean;
  error?: string;
  kind?: "image" | "video";
  width?: number;
  height?: number;
  duration?: number;
  objectUrl?: string;
}

function isImageMime(type: string): boolean {
  return (MEDIA_LIMITS.imageMimeTypes as readonly string[]).includes(type);
}

function isVideoMime(type: string): boolean {
  return (MEDIA_LIMITS.videoMimeTypes as readonly string[]).includes(type);
}

function extensionOf(file: File): string {
  const name = file.name.trim();
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

/** Detect kind from MIME, falling back to file extension (Windows often sends empty MIME). */
export function detectMediaKind(file: File): "image" | "video" | null {
  if (isImageMime(file.type)) return "image";
  if (isVideoMime(file.type)) return "video";

  const ext = extensionOf(file);
  if ((MEDIA_LIMITS.imageExtensions as readonly string[]).includes(ext)) return "image";
  if ((MEDIA_LIMITS.videoExtensions as readonly string[]).includes(ext)) return "video";
  return null;
}

function formatVideoLimit(): string {
  const gb = MEDIA_LIMITS.videoMaxBytes / (1024 * 1024 * 1024);
  if (gb >= 1 && Number.isInteger(gb)) return `${gb} GB`;
  return `${Math.round(MEDIA_LIMITS.videoMaxBytes / (1024 * 1024))} MB`;
}

export function validateMediaFile(file: File): {
  ok: boolean;
  error?: string;
  kind?: "image" | "video";
} {
  const kind = detectMediaKind(file);
  if (!kind) {
    return {
      ok: false,
      error: "Desteklenen formatlar: JPG, PNG, WEBP, MP4, WebM.",
    };
  }

  if (kind === "image" && file.size > MEDIA_LIMITS.imageMaxBytes) {
    return {
      ok: false,
      error: `Görsel en fazla ${MEDIA_LIMITS.imageMaxBytes / (1024 * 1024)} MB olabilir.`,
    };
  }

  if (kind === "video" && file.size > MEDIA_LIMITS.videoMaxBytes) {
    return {
      ok: false,
      error: `Video en fazla ${formatVideoLimit()} olabilir.`,
    };
  }

  return { ok: true, kind };
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, objectUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Görsel okunamadı."));
    };
    img.src = objectUrl;
  });
}

export function readVideoMetadata(
  file: File,
): Promise<{ width: number; height: number; duration: number; objectUrl: string }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const finish = (width: number, height: number, duration: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve({
        width,
        height,
        duration: duration > 0 ? duration : 10,
        objectUrl,
      });
      video.removeAttribute("src");
      video.load();
    };

    // Large files can stall metadata; still allow upload with defaults.
    const timeout = window.setTimeout(() => finish(0, 0, 10), 8_000);

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.ceil(video.duration) : 0;
      finish(video.videoWidth, video.videoHeight, duration);
    };
    video.onerror = () => finish(0, 0, 10);
    video.src = objectUrl;
  });
}

export function adaptationHint(
  width: number,
  height: number,
  displayWidth: number,
  displayHeight: number,
): string {
  if (!width || !height) {
    return `Ekran ${displayWidth}×${displayHeight}. Varsayılan "Doldur" kesmeden tüm görseli ekran ölçüsüne yayar.`;
  }
  return `Bu medya ${width}×${height}. Ekran ${displayWidth}×${displayHeight}. Varsayılan "Doldur" kesmeden tüm görseli ekran ölçüsüne yayar. "Sığdır" boşluk bırakır. "Kırparak doldur" kenarları kesebilir.`;
}
