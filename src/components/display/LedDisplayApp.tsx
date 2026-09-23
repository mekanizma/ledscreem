"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, DisplayContentWithContent, PlaylistItem } from "@/lib/supabase/types";
import { asContent, asDisplay } from "@/lib/supabase/types";
import { mapToPlaylistItems } from "@/lib/content/playlist";
import { filterPlayablePlaylist } from "@/lib/content/status";
import {
  loadPlaylistCache,
  savePlaylistCache,
  saveDisplayMeta,
  prefetchMedia,
} from "@/lib/cache/offline";
import { HEARTBEAT_INTERVAL_MS, DISPLAY_CONFIG } from "@/lib/config/display";
import { ScaledViewport } from "@/components/display/ContentRenderer";
import { DisplayPlayer } from "@/components/display/DisplayPlayer";

interface LedDisplayAppProps {
  displayCode: string;
  debug?: boolean;
}

async function fetchPlaylist(
  displayCode: string,
): Promise<{ display: Display; items: PlaylistItem[] } | null> {
  const supabase = createClient();

  const { data: displayRow, error: dErr } = await supabase
    .from("displays")
    .select("*")
    .eq("display_code", displayCode)
    .maybeSingle();

  if (dErr || !displayRow) return null;
  const display = asDisplay(displayRow);

  const { data: rows, error: pErr } = await supabase
    .from("display_contents")
    .select("*, content:contents(*)")
    .eq("display_id", display.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (pErr) return { display, items: [] };

  const mappedRows: DisplayContentWithContent[] = (rows ?? []).map((row) => {
    const contentRaw = row.content as unknown;
    const contentRow = (
      Array.isArray(contentRaw) ? contentRaw[0] : contentRaw
    ) as Parameters<typeof asContent>[0];
    return {
      id: row.id,
      display_id: row.display_id,
      content_id: row.content_id,
      sort_order: row.sort_order,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      content: asContent(contentRow),
    };
  });

  const mapped = mapToPlaylistItems(mappedRows, { onlyPlayable: true });

  return { display, items: mapped };
}

export function LedDisplayApp({ displayCode, debug = false }: LedDisplayAppProps) {
  const [display, setDisplay] = useState<Display | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [pendingItems, setPendingItems] = useState<PlaylistItem[] | null>(null);
  const [ready, setReady] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const displayIdRef = useRef<string | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyFetched = useCallback(
    (displayRow: Display, playlist: PlaylistItem[], soft: boolean) => {
      setDisplay(displayRow);
      displayIdRef.current = displayRow.id;
      saveDisplayMeta(displayCode, {
        width: displayRow.width,
        height: displayRow.height,
        name: displayRow.name,
      });
      savePlaylistCache(displayCode, playlist);

      const mediaUrls = playlist
        .flatMap((i) => [i.image_url, i.video_url, i.announcement_data?.logo_url])
        .filter((u): u is string => Boolean(u));
      void prefetchMedia(mediaUrls);

      if (soft) {
        setPendingItems(playlist);
      } else {
        setItems(playlist);
        setPendingItems(null);
      }
      setReady(true);
    },
    [displayCode],
  );

  const load = useCallback(
    async (soft = false) => {
      try {
        const result = await fetchPlaylist(displayCode);
        if (result) {
          applyFetched(result.display, result.items, soft);
          return;
        }
      } catch {
        // fall through to cache
      }

      const cached = loadPlaylistCache(displayCode);
      if (cached?.items?.length) {
        setItems(filterPlayablePlaylist(cached.items));
        setReady(true);
      }

      // Retry later
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => void load(soft), 10_000);
    },
    [displayCode, applyFetched],
  );

  // Initial load + cache bootstrap
  useEffect(() => {
    const cached = loadPlaylistCache(displayCode);
    if (cached?.items?.length) {
      setItems(filterPlayablePlaylist(cached.items));
      setReady(true);
    }
    void load(false);
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [displayCode, load]);

  // Heartbeat
  useEffect(() => {
    const send = async () => {
      try {
        const supabase = createClient();
        await supabase.rpc("touch_display_heartbeat", {
          p_display_code: displayCode,
        });
      } catch {
        // silent
      }
    };

    void send();
    heartbeatRef.current = setInterval(() => void send(), HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [displayCode]);

  // Re-filter schedule every 30s (start_at / end_at)
  useEffect(() => {
    scheduleRef.current = setInterval(() => {
      setItems((prev) => filterPlayablePlaylist(prev));
      setPendingItems((prev) => (prev ? filterPlayablePlaylist(prev) : null));
    }, 30_000);
    return () => {
      if (scheduleRef.current) clearInterval(scheduleRef.current);
    };
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`display:${displayCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contents" },
        () => void load(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "display_contents" },
        () => void load(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "displays" },
        () => void load(true),
      )
      .subscribe();

    channelRef.current = channel;

    const onOnline = () => void load(true);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("online", onOnline);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [displayCode, load]);

  const width = display?.width ?? DISPLAY_CONFIG.width;
  const height = display?.height ?? DISPLAY_CONFIG.height;

  // Until ready with nothing cached — stay black (no loading text)
  if (!ready && items.length === 0) {
    return <div className="h-full w-full bg-black" />;
  }

  return (
    <ScaledViewport
      width={width}
      height={height}
      mode="stretch"
      className="h-full w-full"
    >
      <DisplayPlayer
        items={items}
        width={width}
        height={height}
        pendingItems={pendingItems}
        onPendingApplied={() => {
          if (pendingItems) {
            setItems(pendingItems);
            setPendingItems(null);
          }
        }}
        debug={debug}
      />
    </ScaledViewport>
  );
}
