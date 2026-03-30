import { isSupabaseConfigured, supabase, supabaseCommentMediaBucket } from "./supabase";

const MAX_COMMENT_MEDIA_BYTES = 50 * 1024 * 1024;
const ALLOWED_COMMENT_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);
const ALLOWED_AVATAR_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
]);
const MAX_AVATAR_UPLOAD_BYTES = 50 * 1024 * 1024;

export type SupabaseCommentMediaUploadResult = {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
  size: number;
  reused: boolean;
};

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim().replace(/\s+/g, "-");
  const cleaned = trimmed.replace(/[^A-Za-z0-9._-]/g, "");

  return cleaned || "upload";
}

function inferFileExtension(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default: {
      const nameParts = file.name.split(".");
      return nameParts.length > 1 ? sanitizeFileName(nameParts.pop() ?? "") || "bin" : "bin";
    }
  }
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function createFileContentHash(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(digest);
}

async function buildObjectPath(file: File, folder: string, userId = "guest") {
  const safeUserId = sanitizeFileName(userId);
  const hash = await createFileContentHash(file);
  const extension = inferFileExtension(file);

  return `${folder}/${safeUserId}/${hash}.${extension}`;
}

export function validateSupabaseCommentMediaFile(file: File) {
  if (!ALLOWED_COMMENT_MEDIA_TYPES.has(file.type)) {
    throw new Error("Only PNG, JPG, WEBP, GIF, MP4, and WEBM files are supported.");
  }

  if (file.size <= 0 || file.size > MAX_COMMENT_MEDIA_BYTES) {
    throw new Error("The selected file exceeds the 50 MB limit.");
  }
}

export function validateSupabaseAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_MEDIA_TYPES.has(file.type)) {
    throw new Error("Avatar must be PNG, JPG, WEBP, GIF, MP4, or WEBM.");
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw new Error("The selected avatar exceeds the 50 MB limit.");
  }
}

async function uploadStorageObject(file: File, objectPath: string): Promise<SupabaseCommentMediaUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this build.");
  }
  const { error } = await supabase.storage
    .from(supabaseCommentMediaBucket)
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  const alreadyExists = Boolean(
    error &&
      (String((error as { statusCode?: string | number } | null)?.statusCode ?? "") === "409" ||
        /already exists/i.test(error.message))
  );

  if (error && !alreadyExists) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(supabaseCommentMediaBucket).getPublicUrl(objectPath);

  return {
    bucket: supabaseCommentMediaBucket,
    path: objectPath,
    publicUrl,
    contentType: file.type,
    size: file.size,
    reused: alreadyExists,
  };
}

export async function uploadSupabaseCommentMedia(
  file: File,
  userId: string
): Promise<SupabaseCommentMediaUploadResult> {
  validateSupabaseCommentMediaFile(file);
  return uploadStorageObject(file, await buildObjectPath(file, "comments", userId));
}

export async function uploadSupabaseAvatarMedia(
  file: File,
  userId: string
): Promise<SupabaseCommentMediaUploadResult> {
  validateSupabaseAvatarFile(file);
  return uploadStorageObject(file, await buildObjectPath(file, "avatars", userId));
}

export async function uploadSupabaseCommentMediaTest(file: File) {
  validateSupabaseCommentMediaFile(file);
  return uploadStorageObject(file, await buildObjectPath(file, "tests"));
}

export async function deleteSupabaseStorageObject(objectPath: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this build.");
  }

  const normalizedObjectPath = objectPath.trim();

  if (!normalizedObjectPath) {
    return;
  }

  const { error } = await supabase.storage
    .from(supabaseCommentMediaBucket)
    .remove([normalizedObjectPath]);

  if (error) {
    throw error;
  }
}

export async function deleteSupabaseCommentMedia(objectPath: string) {
  return deleteSupabaseStorageObject(objectPath);
}
