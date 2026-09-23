import type { PlaylistItem } from "@/lib/supabase/types";

const PLAYLIST_KEY = "led-signage:playlist";
const META_KEY = "led-signage:meta";

export interface CachedPlaylist {
  displayCode: string;
  updatedAt: string;
  items: PlaylistItem[];
}

export function savePlaylistCache(displayCode: string, items: PlaylistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPlaylist = {
      displayCode,
      updatedAt: new Date().toISOString(),
      items,
    };
    localStorage.setItem(`${PLAYLIST_KEY}:${displayCode}`, JSON.stringify(payload));
  } catch {
    // Quota or private mode — ignore
  }
}

export function loadPlaylistCache(displayCode: string): CachedPlaylist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PLAYLIST_KEY}:${displayCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPlaylist;
  } catch {
    return null;
  }
}

export function saveDisplayMeta(
  displayCode: string,
  meta: { width: number; height: number; name: string },
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${META_KEY}:${displayCode}`, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function loadDisplayMeta(
  displayCode: string,
): { width: number; height: number; name: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${META_KEY}:${displayCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as { width: number; height: number; name: string };
  } catch {
    return null;
  }
}

/** Prefetch media URLs into browser HTTP cache */
export async function prefetchMedia(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  await Promise.allSettled(
    unique.map(async (url) => {
      try {
        await fetch(url, { mode: "no-cors", cache: "force-cache" });
      } catch {
        // ignore
      }
    }),
  );
}
