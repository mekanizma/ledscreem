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
 * Admin live preview at logical LED resolution, scaled to fit container.
 */
export function PreviewFrame({
  item,
  className = "",
  maxHeight = 480,
  label = "LED Önizleme",
}: PreviewFrameProps) {
  const { width, height, aspectRatio } = DISPLAY_CONFIG;
  const previewHeight = Math.min(maxHeight, 520);
  const previewWidth = previewHeight * aspectRatio;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label} · {width}×{height}
      </p>
      <div
        className="overflow-hidden rounded-lg border border-slate-800 bg-black shadow-lg ring-1 ring-slate-900/10"
        style={{
          width: previewWidth,
          height: previewHeight,
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
        <p className="max-w-[220px] text-center text-[11px] leading-snug text-slate-500">
          {item.fit_mode === "contain"
            ? "Sığdır: görselin tamamı görünür, gerekirse boşluk kalır."
            : item.fit_mode === "cover"
              ? "Kırp: ekran dolar, kenarlar kesilebilir."
              : "Doldur: görsel kesilmeden 256×640 alana yayılır."}
        </p>
      ) : null}
    </div>
  );
}
