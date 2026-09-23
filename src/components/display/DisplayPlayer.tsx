"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/supabase/types";
import { ContentRenderer, ContentStage } from "@/components/display/ContentRenderer";
import { DEFAULT_TRANSITION } from "@/lib/config/display";

interface DisplayPlayerProps {
  items: PlaylistItem[];
  width: number;
  height: number;
  transition?: "fade" | "crossfade" | "none";
  /** Pending playlist from realtime — applied after current item finishes */
  pendingItems?: PlaylistItem[] | null;
  onPendingApplied?: () => void;
  debug?: boolean;
}

export function DisplayPlayer({
  items,
  width,
  height,
  transition = DEFAULT_TRANSITION,
  pendingItems = null,
  onPendingApplied,
  debug = false,
}: DisplayPlayerProps) {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(items);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PlaylistItem[] | null>(null);
  const playlistRef = useRef(playlist);
  const indexRef = useRef(index);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    pendingRef.current = pendingItems;
  }, [pendingItems]);

  // Sync when items change from parent (initial / force)
  useEffect(() => {
    if (!items.length) return;
    // If current content still exists, keep playing; else jump to new list
    const currentId = playlistRef.current[indexRef.current]?.content_id;
    const stillExists = currentId
      ? items.some((i) => i.content_id === currentId)
      : false;

    if (!stillExists) {
      setPlaylist(items);
      setIndex(0);
      setVisible(true);
      onPendingApplied?.();
    } else if (!pendingItems) {
      // Soft update: queue as pending if order/content changed
      const same =
        items.length === playlistRef.current.length &&
        items.every(
          (it, i) =>
            it.content_id === playlistRef.current[i]?.content_id &&
            it.duration === playlistRef.current[i]?.duration &&
            it.sort_order === playlistRef.current[i]?.sort_order,
        );
      if (!same) {
        pendingRef.current = items;
      }
    }
  }, [items, pendingItems, onPendingApplied]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applyPendingIfAny = useCallback(() => {
    if (pendingRef.current && pendingRef.current.length > 0) {
      const next = pendingRef.current;
      pendingRef.current = null;
      setPlaylist(next);
      setIndex(0);
      onPendingApplied?.();
      return true;
    }
    return false;
  }, [onPendingApplied]);

  const goNext = useCallback(() => {
    clearTimer();

    if (applyPendingIfAny()) {
      setVisible(true);
      return;
    }

    const list = playlistRef.current;
    if (!list.length) return;

    const doSwitch = () => {
      setIndex((i) => (i + 1) % list.length);
      setVisible(true);
    };

    if (transition === "none") {
      doSwitch();
      return;
    }

    setVisible(false);
    timerRef.current = setTimeout(doSwitch, 280);
  }, [applyPendingIfAny, clearTimer, transition]);

  const current = playlist[index] ?? null;

  // Image / announcement timer
  useEffect(() => {
    clearTimer();
    if (!current) return;
    if (current.type === "video" && current.video_end_behavior === "next-on-end") {
      // Video drives next via onEnded; safety timeout = duration * 2 + 5s
      const safety = Math.max(current.duration * 2 + 5, 30) * 1000;
      timerRef.current = setTimeout(() => goNext(), safety);
      return () => clearTimer();
    }

    const ms = Math.max(current.duration, 1) * 1000;
    timerRef.current = setTimeout(() => goNext(), ms);
    return () => clearTimer();
  }, [current, goNext, clearTimer]);

  // Empty playlist — stay black, never show message
  if (!playlist.length || !current) {
    return <ContentStage width={width} height={height} />;
  }

  return (
    <ContentStage width={width} height={height}>
      <div
        className="absolute inset-0 transition-opacity duration-300 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <ContentRenderer
          item={current}
          frameWidth={width}
          frameHeight={height}
          onMediaEnded={goNext}
          onMediaError={goNext}
        />
      </div>
      {debug ? (
        <div className="absolute bottom-0 left-0 z-50 bg-black/70 px-1 text-[8px] text-white">
          {current.title} ({index + 1}/{playlist.length})
        </div>
      ) : null}
    </ContentStage>
  );
}
