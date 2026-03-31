/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useState, type CSSProperties } from "react";

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
const ANIMATED_IMAGE_DATA_URL_PATTERN = /^data:(image\/gif|image\/webp)/i;

const isAnimatedAvatarSource = (value: string | null | undefined) =>
  typeof value === "string" &&
  (
    ANIMATED_DATA_URL_PATTERN.test(value.trim()) ||
    /\.((gif)|(webp))(?:$|[?#])/i.test(value.trim())
  );

const isAnimatedImageAvatarSource = (value: string | null | undefined) =>
  typeof value === "string" &&
  (
    ANIMATED_IMAGE_DATA_URL_PATTERN.test(value.trim()) ||
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

  useEffect(() => {
    let objectUrl: string | null = null;
    let animationFrameId = 0;
    setHasLoadError(false);

    if (!isAnimatedAvatarSource(src)) {
      setResolvedSrc(src);
      setRenderKey((currentKey) => currentKey + 1);
      return;
    }

    setResolvedSrc("");

    try {
      objectUrl = ANIMATED_DATA_URL_PATTERN.test(src.trim())
        ? URL.createObjectURL(dataUrlToBlob(src))
        : src;
    } catch {
      objectUrl = src;
    }

    animationFrameId = window.requestAnimationFrame(() => {
      setResolvedSrc(objectUrl ?? src);
      setRenderKey((currentKey) => currentKey + 1);
    });

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

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
      <video
        key={`${renderKey}:${resolvedSrc}`}
        src={resolvedSrc}
        aria-label={alt}
        title={alt}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        className={className}
        style={style}
        onError={() => {
          setHasLoadError(true);
        }}
      />
    );
  }

  if (isAnimatedImageAvatarSource(resolvedSrc)) {
    return (
      <span
        key={`${renderKey}:${resolvedSrc}`}
        role="img"
        aria-label={alt}
        title={alt}
        className={className}
        style={{
          ...style,
          display: "block",
          backgroundImage: `url("${resolvedSrc}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }

  return (
    <img
      key={`${renderKey}:${resolvedSrc}`}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      decoding={isAnimatedAvatarSource(resolvedSrc) ? undefined : decoding}
      className={className}
      style={style}
      onError={() => {
        setHasLoadError(true);
      }}
    />
  );
}
