"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/supabase/types";
import { ContentRenderer, ContentStage } from "@/components/display/ContentRenderer";
import { DEFAULT_TRANSITION } from "@/lib/config/display";
import { playlistsMatch, resumeIndexAfterUpdate } from "@/lib/content/playlist";

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
  const goNextRef = useRef<() => void>(() => {});

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
    const next = pendingRef.current;
    if (!next || next.length === 0) return false;

    pendingRef.current = null;
    const currentId = playlistRef.current[indexRef.current]?.content_id;

    if (playlistsMatch(playlistRef.current, next)) {
      onPendingApplied?.();
      return false;
    }

    setPlaylist(next);
    setIndex(resumeIndexAfterUpdate(next, currentId));
    onPendingApplied?.();
    return true;
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

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  // Restart only when the slide itself changes. Parent refreshes must not reset the countdown.
  useEffect(() => {
    clearTimer();
    if (!current) return;
    if (current.type === "video" && current.video_end_behavior === "next-on-end") {
      const safety = Math.max(current.duration * 2 + 5, 30) * 1000;
      timerRef.current = setTimeout(() => goNextRef.current(), safety);
      return () => clearTimer();
    }

    const ms = Math.max(current.duration, 1) * 1000;
    timerRef.current = setTimeout(() => goNextRef.current(), ms);
    return () => clearTimer();
  }, [
    current?.content_id,
    current?.duration,
    current?.type,
    current?.video_end_behavior,
    clearTimer,
  ]);

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
