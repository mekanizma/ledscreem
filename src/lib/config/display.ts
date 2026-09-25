/** Default canvas for 65" TV (Full HD 16:9 landscape). */
export const DISPLAY_CONFIG = {
  width: 1920,
  height: 1080,
  orientation: "landscape" as const,
  aspectRatio: 1920 / 1080,
};

export type DisplayOrientation = "portrait" | "landscape";

export type FitMode = "stretch" | "contain" | "cover";

export type ContentType = "image" | "video" | "announcement";

export type VideoEndBehavior = "next-on-end" | "loop";

export type TransitionType = "fade" | "crossfade" | "none";

/** Default: show the full image without cropping or distorting its aspect ratio. */
export const DEFAULT_FIT_MODE: FitMode = "stretch";
export const DEFAULT_IMAGE_DURATION = 10;
export const DEFAULT_TRANSITION: TransitionType = "fade";
export const DEFAULT_VIDEO_END: VideoEndBehavior = "next-on-end";
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const OFFLINE_THRESHOLD_MS = 90_000;
export const TIMEZONE = "Europe/Nicosia";

export const MEDIA_LIMITS = {
  imageMaxBytes: 20 * 1024 * 1024,
  videoMaxBytes: 4 * 1024 * 1024 * 1024, // 4 GB (exact: 4294967296)
  imageMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const,
  videoMimeTypes: ["video/mp4", "video/webm"] as const,
  imageExtensions: [".jpg", ".jpeg", ".png", ".webp"] as const,
  videoExtensions: [".mp4", ".webm"] as const,
};

export const STORAGE_BUCKET = "content-media";
