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
