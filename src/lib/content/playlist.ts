import type { Content, DisplayContentWithContent, PlaylistItem } from "@/lib/supabase/types";
import { isContentPlayable } from "@/lib/content/status";

export function mapToPlaylistItems(
  rows: DisplayContentWithContent[],
  options?: { onlyPlayable?: boolean; now?: Date },
): PlaylistItem[] {
  const now = options?.now ?? new Date();

  const items: PlaylistItem[] = rows
    .filter((row) => row.active && row.content)
    .map((row) => ({
      id: row.id,
      display_content_id: row.id,
      content_id: row.content_id,
      sort_order: row.sort_order,
      title: row.content.title,
      type: row.content.type,
      duration: row.content.duration,
      fit_mode: row.content.fit_mode,
      video_end_behavior: row.content.video_end_behavior,
      image_url: row.content.image_url,
      video_url: row.content.video_url,
      announcement_data: row.content.announcement_data,
      start_at: row.content.start_at,
      end_at: row.content.end_at,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (options?.onlyPlayable) {
    return items.filter((item) =>
      isContentPlayable(
        {
          active: true,
          start_at: item.start_at,
          end_at: item.end_at,
        },
        now,
      ),
    );
  }

  return items;
}

export function playlistsMatch(a: PlaylistItem[], b: PlaylistItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.content_id === b[i]?.content_id &&
      item.duration === b[i]?.duration &&
      item.sort_order === b[i]?.sort_order &&
      item.type === b[i]?.type &&
      item.image_url === b[i]?.image_url &&
      item.video_url === b[i]?.video_url &&
      item.fit_mode === b[i]?.fit_mode &&
      item.video_end_behavior === b[i]?.video_end_behavior,
  );
}

/** Continue after the slide that just finished, instead of restarting at the first item. */
export function resumeIndexAfterUpdate(
  next: PlaylistItem[],
  currentId: string | undefined,
): number {
  if (!next.length) return 0;
  const currentIdx = currentId
    ? next.findIndex((item) => item.content_id === currentId)
    : -1;
  if (currentIdx < 0) return 0;
  return (currentIdx + 1) % next.length;
}

export function contentToPreviewItem(content: Content, sortOrder = 0): PlaylistItem {
  return {
    id: content.id,
    display_content_id: content.id,
    content_id: content.id,
    sort_order: sortOrder,
    title: content.title,
    type: content.type,
    duration: content.duration,
    fit_mode: content.fit_mode,
    video_end_behavior: content.video_end_behavior,
    image_url: content.image_url,
    video_url: content.video_url,
    announcement_data: content.announcement_data,
    start_at: content.start_at,
    end_at: content.end_at,
  };
}
