"use client";

import { DISPLAY_CONFIG } from "@/lib/config/display";
import type { PlaylistItem } from "@/lib/supabase/types";
import {
  ContentRenderer,
  ContentStage,
  ScaledViewport,
} from "@/components/display/ContentRenderer";

interface PreviewFrameProps {
  item: PlaylistItem | null;
  className?: string;
  maxHeight?: number;
  label?: string;
}

/**
 * Admin live preview at logical display resolution, scaled to fit container.
 * Landscape (e.g. 65" TV 1920×1080) stays within viewport on mobile.
 */
export function PreviewFrame({
  item,
  className = "",
  maxHeight = 480,
  label = "TV Önizleme",
}: PreviewFrameProps) {
  const { width, height, aspectRatio } = DISPLAY_CONFIG;
  const previewHeight = Math.min(maxHeight, 520);

  return (
    <div className={`flex w-full flex-col items-center gap-2 ${className}`}>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label} · {width}×{height}
      </p>
      <div
        className="w-full max-w-full overflow-hidden rounded-lg border border-slate-800 bg-black shadow-lg ring-1 ring-slate-900/10"
        style={{
          maxWidth: Math.min(previewHeight * aspectRatio, 960),
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <ScaledViewport width={width} height={height} className="h-full w-full" mode="fit">
          <ContentStage width={width} height={height}>
            {item ? (
              <ContentRenderer
                item={item}
                frameWidth={width}
                frameHeight={height}
                preview
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-[10px] text-slate-500">
                Önizleme yok
              </div>
            )}
          </ContentStage>
        </ScaledViewport>
      </div>
      {item?.type === "image" || item?.type === "video" ? (
        <p className="max-w-sm px-2 text-center text-[11px] leading-snug text-slate-500">
          {item.fit_mode === "contain"
            ? "Sığdır: görselin tamamı görünür, gerekirse boşluk kalır."
            : item.fit_mode === "cover"
              ? "Kırp: ekran dolar, kenarlar kesilebilir."
              : `Doldur: görsel kesilmeden ${width}×${height} alana yayılır.`}
        </p>
      ) : null}
    </div>
  );
}
