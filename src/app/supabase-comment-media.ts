const DEFAULT_COMMENT_MEDIA_BUCKET = "comment-media";
const COMMENT_MEDIA_UPLOAD_FUNCTION = "comment-media-upload";
const COMMENT_MEDIA_DELETE_FUNCTION = "comment-media-delete";

function normalizeBaseUrl(value: string | undefined) {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

export function getSupabaseProjectUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseCommentMediaBucket() {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim();
  return bucket || DEFAULT_COMMENT_MEDIA_BUCKET;
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
}

export function getSupabaseCommentMediaFunctionUrl() {
  const projectUrl = getSupabaseProjectUrl();

  if (!projectUrl) {
    return null;
  }

  return `${projectUrl}/functions/v1/${COMMENT_MEDIA_UPLOAD_FUNCTION}`;
}

export function getSupabaseCommentMediaDeleteFunctionUrl() {
  const projectUrl = getSupabaseProjectUrl();

  if (!projectUrl) {
    return null;
  }

  return `${projectUrl}/functions/v1/${COMMENT_MEDIA_DELETE_FUNCTION}`;
}

export type CreateCommentMediaUploadRequest = {
  fileName: string;
  contentType: string;
  fileSize: number;
  profileId?: number | null;
};

export type CreateCommentMediaUploadResponse = {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
  maxFileSizeBytes: number;
};
