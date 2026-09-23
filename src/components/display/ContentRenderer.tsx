"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import type { FitMode } from "@/lib/config/display";
import type { AnnouncementData, PlaylistItem } from "@/lib/supabase/types";

type ViewportMode = "fit" | "fill" | "stretch";

interface ScaledViewportProps {
  width: number;
  height: number;
  className?: string;
  children: ReactNode;
  /**
   * fit     — letterbox (admin preview)
   * fill    — cover parent, may crop canvas
   * stretch — map logical canvas to 100%×100% of parent (LED kiosk default)
   */
  mode?: ViewportMode;
}

/**
 * Maps a logical LED canvas (e.g. 256×640) into the parent element.
 * LED kiosk should use mode="stretch" so every physical pixel is used.
 */
export function ScaledViewport({
  width,
  height,
  className = "",
  children,
  mode = "fit",
}: ScaledViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scaleX: 1, scaleY: 1, vw: width, vh: height });

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    if (mode === "stretch") {
      setBox({
        scaleX: cw / width,
        scaleY: ch / height,
        vw: cw,
        vh: ch,
      });
      return;
    }

    const sx = cw / width;
    const sy = ch / height;
    const s = mode === "fill" ? Math.max(sx, sy) : Math.min(sx, sy);
    setBox({
      scaleX: s,
      scaleY: s,
      vw: width * s,
      vh: height * s,
    });
  }, [width, height, mode]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [measure]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden bg-black ${className}`}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: mode === "stretch" ? "100%" : box.vw,
          height: mode === "stretch" ? "100%" : box.vh,
        }}
      >
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{
            width,
            height,
            transform: `scale(${box.scaleX}, ${box.scaleY})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export interface MediaRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

export function computeMediaRect(
  mediaW: number,
  mediaH: number,
  frameW: number,
  frameH: number,
  fitMode: FitMode | string,
): MediaRect {
  if (mediaW <= 0 || mediaH <= 0 || frameW <= 0 || frameH <= 0) {
    return { width: frameW, height: frameH, left: 0, top: 0 };
  }

  // stretch (default UX): fill LED exactly — no crop, full image visible
  if (fitMode === "stretch" || fitMode === "fill") {
    return { width: frameW, height: frameH, left: 0, top: 0 };
  }

  const mediaRatio = mediaW / mediaH;
  const frameRatio = frameW / frameH;

  let width: number;
  let height: number;

  if (fitMode === "contain") {
    if (mediaRatio > frameRatio) {
      width = frameW;
      height = frameW / mediaRatio;
    } else {
      height = frameH;
      width = frameH * mediaRatio;
    }
  } else {
    // cover — fill frame, crop overflow
    if (mediaRatio > frameRatio) {
      height = frameH;
      width = frameH * mediaRatio;
    } else {
      width = frameW;
      height = frameW / mediaRatio;
    }
  }

  return {
    width,
    height,
    left: (frameW - width) / 2,
    top: (frameH - height) / 2,
  };
}

interface MediaFitProps {
  src: string;
  alt?: string;
  fitMode: FitMode | string;
  kind: "image" | "video";
  frameWidth?: number;
  frameHeight?: number;
  className?: string;
  videoProps?: {
    muted?: boolean;
    loop?: boolean;
    autoPlay?: boolean;
    playsInline?: boolean;
    onEnded?: () => void;
    onError?: () => void;
    onLoadedData?: () => void;
  };
  onImageError?: () => void;
  onImageLoad?: () => void;
}

export function MediaFit({
  src,
  alt = "",
  fitMode,
  kind,
  frameWidth,
  frameHeight,
  className = "",
  videoProps,
  onImageError,
  onImageLoad,
}: MediaFitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({
    w: frameWidth ?? 0,
    h: frameHeight ?? 0,
  });
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (frameWidth && frameHeight) {
      setFrame({ w: frameWidth, h: frameHeight });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setFrame({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frameWidth, frameHeight]);

  const onImgLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      onImageLoad?.();
    },
    [onImageLoad],
  );

  const onVidMeta = useCallback(
    (e: SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setNatural({ w: v.videoWidth, h: v.videoHeight });
      }
      videoProps?.onLoadedData?.();
    },
    [videoProps],
  );

  useEffect(() => {
    setNatural({ w: 0, h: 0 });
  }, [src]);

  const rect =
    natural.w > 0 && natural.h > 0 && frame.w > 0 && frame.h > 0
      ? computeMediaRect(natural.w, natural.h, frame.w, frame.h, fitMode)
      : null;

  // Fallback before metadata loads
  const placedStyle: CSSProperties = rect
    ? {
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        maxWidth: "none",
        maxHeight: "none",
        objectFit: "fill",
        imageOrientation: "from-image",
      }
    : fitMode === "contain"
      ? {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          imageOrientation: "from-image",
        }
      : fitMode === "cover"
        ? {
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: "100%",
            minHeight: "100%",
            width: "auto",
            height: "auto",
            maxWidth: "none",
            maxHeight: "none",
            imageOrientation: "from-image",
          }
        : {
            // stretch — fill frame immediately
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            imageOrientation: "from-image",
          };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden bg-black ${className}`}
    >
      {kind === "video" ? (
        <video
          key={src}
          src={src}
          style={placedStyle}
          className="block"
          muted={videoProps?.muted ?? true}
          loop={videoProps?.loop ?? false}
          autoPlay={videoProps?.autoPlay ?? true}
          playsInline={videoProps?.playsInline ?? true}
          onEnded={videoProps?.onEnded}
          onError={videoProps?.onError}
          onLoadedMetadata={onVidMeta}
          onLoadedData={onVidMeta}
          controls={false}
          disablePictureInPicture
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          style={placedStyle}
          className="block"
          onError={onImageError}
          onLoad={onImgLoad}
          draggable={false}
        />
      )}
    </div>
  );
}

interface AnnouncementSlideProps {
  data: AnnouncementData;
  className?: string;
}

export function AnnouncementSlide({ data, className = "" }: AnnouncementSlideProps) {
  const align =
    data.alignment === "left"
      ? "items-start text-left"
      : data.alignment === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between px-4 py-6 ${align} ${className}`}
      style={{ background: data.background || "#0B1F3A", color: data.text_color || "#fff" }}
    >
      <div className={`flex w-full flex-col gap-2 ${align}`}>
        {data.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logo_url}
            alt=""
            className="mb-2 h-10 w-auto object-contain"
            style={{ maxWidth: "70%" }}
          />
        ) : null}
        {data.title ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
            {data.title}
          </p>
        ) : null}
        {data.description ? (
          <h1 className="text-[22px] leading-tight font-bold tracking-tight">
            {data.description}
          </h1>
        ) : null}
        {data.subtitle ? (
          <p className="mt-2 text-[11px] leading-relaxed opacity-90">{data.subtitle}</p>
        ) : null}
      </div>

      {data.show_qr && data.qr_url ? (
        <div
          className={`mt-4 flex ${
            align.includes("items-center")
              ? "justify-center"
              : align.includes("items-end")
                ? "justify-end"
                : "justify-start"
          }`}
        >
          <div className="rounded-md bg-white p-1.5">
            <QRCodeSVG value={data.qr_url} size={72} level="M" includeMargin={false} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface ContentStageProps {
  width: number;
  height: number;
  children?: ReactNode;
  className?: string;
}

export function ContentStage({ width, height, children, className = "" }: ContentStageProps) {
  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`}
      style={{ width, height }}
    >
      {children}
    </div>
  );
}

interface ContentRendererProps {
  item: PlaylistItem;
  frameWidth?: number;
  frameHeight?: number;
  onMediaEnded?: () => void;
  onMediaError?: () => void;
  preview?: boolean;
}

export function ContentRenderer({
  item,
  frameWidth,
  frameHeight,
  onMediaEnded,
  onMediaError,
  preview = false,
}: ContentRendererProps) {
  if (item.type === "announcement" && item.announcement_data) {
    return <AnnouncementSlide data={item.announcement_data} />;
  }

  if (item.type === "video" && item.video_url) {
    return (
      <MediaFit
        src={item.video_url}
        kind="video"
        fitMode={item.fit_mode}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        videoProps={{
          muted: true,
          autoPlay: true,
          playsInline: true,
          loop: item.video_end_behavior === "loop" || preview,
          onEnded: item.video_end_behavior === "next-on-end" ? onMediaEnded : undefined,
          onError: onMediaError,
        }}
      />
    );
  }

  if (item.type === "image" && item.image_url) {
    return (
      <MediaFit
        src={item.image_url}
        alt={item.title}
        kind="image"
        fitMode={item.fit_mode}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        onImageError={onMediaError}
      />
    );
  }

  return <div className="absolute inset-0 bg-black" />;
}
