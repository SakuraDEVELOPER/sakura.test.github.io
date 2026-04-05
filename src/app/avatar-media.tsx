/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export const AVATAR_FILE_ACCEPT =
  ".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm";

export const AVATAR_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);

export const PASSTHROUGH_AVATAR_CONTENT_TYPES = new Set([
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

export const MAX_PASSTHROUGH_AVATAR_BYTES = 700 * 1024;

export const isVideoAvatarSource = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized.startsWith("data:video/") ||
    /\.((mp4)|(webm))(?:$|[?#])/i.test(normalized)
  );
};

const ANIMATED_DATA_URL_PATTERN = /^data:(image\/gif|image\/webp|video\/(?:mp4|webm))/i;
const isAnimatedAvatarSource = (value: string | null | undefined) =>
  typeof value === "string" &&
  (
    ANIMATED_DATA_URL_PATTERN.test(value.trim()) ||
    /\.((gif)|(webp))(?:$|[?#])/i.test(value.trim())
  );

const dataUrlToBlob = (dataUrl: string) => {
  const separatorIndex = dataUrl.indexOf(",");

  if (separatorIndex === -1) {
    throw new Error("Invalid data URL.");
  }

  const metadata = dataUrl.slice(0, separatorIndex);
  const payload = dataUrl.slice(separatorIndex + 1);
  const mimeMatch = metadata.match(/^data:([^;,]+)/i);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";

  if (/;base64/i.test(metadata)) {
    const binary = window.atob(payload);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
  }

  return new Blob([decodeURIComponent(payload)], { type: mimeType });
};

const avatarVideoSyncAnchorBySource = new Map<string, number>();
const AVATAR_VIDEO_SYNC_DRIFT_TOLERANCE_SECONDS = 0.28;

const getAvatarVideoSyncAnchor = (source: string) => {
  const normalizedSource = source.trim();

  if (!normalizedSource) {
    return Date.now();
  }

  const existingAnchor = avatarVideoSyncAnchorBySource.get(normalizedSource);

  if (typeof existingAnchor === "number") {
    return existingAnchor;
  }

  const nextAnchor = Date.now();
  avatarVideoSyncAnchorBySource.set(normalizedSource, nextAnchor);
  return nextAnchor;
};

const syncAvatarVideoTime = (
  mediaElement: HTMLVideoElement | null,
  source: string
) => {
  if (!mediaElement || !Number.isFinite(mediaElement.duration) || mediaElement.duration <= 0) {
    return;
  }

  const anchor = getAvatarVideoSyncAnchor(source);
  const elapsedSeconds = Math.max(0, (Date.now() - anchor) / 1000);
  const expectedTime = elapsedSeconds % mediaElement.duration;
  const drift = Math.abs(mediaElement.currentTime - expectedTime);

  if (drift > AVATAR_VIDEO_SYNC_DRIFT_TOLERANCE_SECONDS) {
    try {
      mediaElement.currentTime = expectedTime;
    } catch {}
  }

  const playAttempt = mediaElement.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {});
  }
};

type AvatarMediaProps = {
  alt: string;
  className: string;
  src: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  decoding?: "auto" | "async" | "sync";
};

const initialsFromLabel = (value: string) => {
  const parts = value
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
};

export function AvatarMedia({
  alt,
  className,
  src,
  style,
  loading,
  decoding,
}: AvatarMediaProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [renderKey, setRenderKey] = useState(0);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    setHasLoadError(false);
    setIsLoaded(false);
    setRetryAttempt(0);

    if (!isAnimatedAvatarSource(src)) {
      setResolvedSrc(src);
      setRenderKey((currentKey) => currentKey + 1);
      return;
    }

    try {
      objectUrl = ANIMATED_DATA_URL_PATTERN.test(src.trim())
        ? URL.createObjectURL(dataUrlToBlob(src))
        : src;
    } catch {
      objectUrl = src;
    }

    setResolvedSrc(objectUrl ?? src);
    setRenderKey((currentKey) => currentKey + 1);

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  useEffect(() => {
    if (!hasLoadError || retryAttempt >= 1) {
      return;
    }

    const retryTimeoutId = window.setTimeout(() => {
      setHasLoadError(false);
      setIsLoaded(false);
      setRetryAttempt((currentAttempt) => currentAttempt + 1);
      setRenderKey((currentKey) => currentKey + 1);
    }, 150);

    return () => {
      window.clearTimeout(retryTimeoutId);
    };
  }, [hasLoadError, retryAttempt]);

  useEffect(() => {
    if (!isVideoAvatarSource(resolvedSrc) || hasLoadError) {
      return;
    }

    const syncPlayback = () => {
      syncAvatarVideoTime(videoElementRef.current, resolvedSrc);
    };

    syncPlayback();
    const intervalId = window.setInterval(syncPlayback, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [resolvedSrc, renderKey, hasLoadError]);

  if (!resolvedSrc || hasLoadError) {
    return (
      <span
        role="img"
        aria-label={alt}
        title={alt}
        className={`${className} flex items-center justify-center bg-[#171012] text-[11px] font-black uppercase text-[#ffb7c5]`}
        style={style}
      >
        {initialsFromLabel(alt)}
      </span>
    );
  }

  if (isVideoAvatarSource(resolvedSrc)) {
    return (
      <span
        role="img"
        aria-label={alt}
        title={alt}
        className={`${className} relative isolate overflow-hidden bg-[#171012]`}
        style={style}
      >
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase text-[#ffb7c5]">
          {initialsFromLabel(alt)}
        </span>
        <video
          ref={videoElementRef}
          key={`${renderKey}:${resolvedSrc}`}
          src={resolvedSrc}
          aria-label={alt}
          title={alt}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className={`absolute inset-0 h-full w-full object-cover transition duration-100 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoadedData={() => {
            syncAvatarVideoTime(videoElementRef.current, resolvedSrc);
            setIsLoaded(true);
          }}
          onCanPlay={() => {
            syncAvatarVideoTime(videoElementRef.current, resolvedSrc);
            setIsLoaded(true);
          }}
          onError={() => {
            setHasLoadError(true);
          }}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={alt}
      title={alt}
      className={`${className} relative isolate overflow-hidden bg-[#171012]`}
      style={style}
    >
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase text-[#ffb7c5]">
        {initialsFromLabel(alt)}
      </span>
      <img
        key={`${renderKey}:${resolvedSrc}`}
        src={resolvedSrc}
        alt=""
        aria-label={alt}
        title={alt}
        loading={loading}
        decoding={isAnimatedAvatarSource(resolvedSrc) ? undefined : decoding}
        className={`absolute inset-0 h-full w-full object-cover transition duration-100 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => {
          setIsLoaded(true);
        }}
        onError={() => {
          setHasLoadError(true);
        }}
      />
    </span>
  );
}
