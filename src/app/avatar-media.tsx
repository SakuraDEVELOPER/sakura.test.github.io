/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useState, type CSSProperties } from "react";

export const AVATAR_FILE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm";

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

export const MAX_PASSTHROUGH_AVATAR_BYTES = 512 * 1024;

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

type AvatarMediaProps = {
  alt: string;
  className: string;
  src: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  decoding?: "auto" | "async" | "sync";
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

  useEffect(() => {
    setResolvedSrc(src);

    if (!ANIMATED_DATA_URL_PATTERN.test(src.trim())) {
      return;
    }

    let objectUrl: string | null = null;

    try {
      objectUrl = URL.createObjectURL(dataUrlToBlob(src));
      setResolvedSrc(objectUrl);
    } catch {
      setResolvedSrc(src);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (isVideoAvatarSource(resolvedSrc)) {
    return (
      <video
        key={resolvedSrc}
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
      />
    );
  }

  return (
    <img
      key={resolvedSrc}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      decoding={isAnimatedAvatarSource(resolvedSrc) ? undefined : decoding}
      className={className}
      style={style}
    />
  );
}
