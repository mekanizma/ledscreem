import type { Content, PlaylistItem } from "@/lib/supabase/types";
import { OFFLINE_THRESHOLD_MS } from "@/lib/config/display";

export type ContentScheduleStatus =
  | "active"
  | "inactive"
  | "scheduled"
  | "expired";

export function getContentScheduleStatus(
  content: Pick<Content, "active" | "start_at" | "end_at">,
  now = new Date(),
): ContentScheduleStatus {
  if (!content.active) return "inactive";

  const start = content.start_at ? new Date(content.start_at) : null;
  const end = content.end_at ? new Date(content.end_at) : null;

  if (start && now < start) return "scheduled";
  if (end && now > end) return "expired";
  return "active";
}

export function isContentPlayable(
  content: Pick<Content, "active" | "start_at" | "end_at">,
  now = new Date(),
): boolean {
  return getContentScheduleStatus(content, now) === "active";
}

export function filterPlayablePlaylist(
  items: PlaylistItem[],
  now = new Date(),
): PlaylistItem[] {
  return items
    .filter((item) =>
      isContentPlayable(
        {
          active: true,
          start_at: item.start_at,
          end_at: item.end_at,
        },
        now,
      ),
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function isDisplayOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff <= OFFLINE_THRESHOLD_MS;
}

export const STATUS_LABELS: Record<
  ContentScheduleStatus,
  { label: string; color: string; emoji: string }
> = {
  active: { label: "Aktif", color: "text-emerald-700 bg-emerald-50", emoji: "🟢" },
  inactive: { label: "Pasif", color: "text-slate-600 bg-slate-100", emoji: "⚪" },
  scheduled: { label: "Zamanlanmış", color: "text-amber-700 bg-amber-50", emoji: "🕒" },
  expired: { label: "Süresi Dolmuş", color: "text-rose-700 bg-rose-50", emoji: "🔴" },
};
