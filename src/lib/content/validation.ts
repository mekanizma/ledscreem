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

export function validateMediaFile(file: File): { ok: boolean; error?: string; kind?: "image" | "video" } {
  if (isImageMime(file.type)) {
    if (file.size > MEDIA_LIMITS.imageMaxBytes) {
      return {
        ok: false,
        error: `Görsel en fazla ${MEDIA_LIMITS.imageMaxBytes / (1024 * 1024)} MB olabilir.`,
      };
    }
    return { ok: true, kind: "image" };
  }
  if (isVideoMime(file.type)) {
    if (file.size > MEDIA_LIMITS.videoMaxBytes) {
      return {
        ok: false,
        error: `Video en fazla ${MEDIA_LIMITS.videoMaxBytes / (1024 * 1024)} MB olabilir.`,
      };
    }
    return { ok: true, kind: "video" };
  }
  return {
    ok: false,
    error: "Desteklenen formatlar: JPG, PNG, WEBP, MP4, WebM.",
  };
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
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.ceil(video.duration) : 0;
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: duration > 0 ? duration : 10,
        objectUrl,
      });
      cleanup();
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      cleanup();
      reject(new Error("Video metadata okunamadı."));
    };
    video.src = objectUrl;
  });
}

export function adaptationHint(
  width: number,
  height: number,
  displayWidth: number,
  displayHeight: number,
): string {
  return `Bu medya ${width}×${height}. Ekran ${displayWidth}×${displayHeight}. Varsayılan "Doldur" kesmeden tüm görseli ekran ölçüsüne yayar. "Sığdır" boşluk bırakır. "Kırparak doldur" kenarları kesebilir.`;
}

