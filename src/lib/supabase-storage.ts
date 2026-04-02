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
const normalizeSupabaseSyncFunctionUrl = (value: string) =>
  value.trim().replace(/\/+$/, "").replace(/\/firebase-sync$/i, "/app-sync");

const supabaseSyncFunctionUrl = (() => {
  const explicitUrl = process.env.NEXT_PUBLIC_SUPABASE_SYNC_FUNCTION_URL?.trim() ?? "";

  if (explicitUrl) {
    return normalizeSupabaseSyncFunctionUrl(explicitUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  if (!supabaseUrl) {
    return "";
  }

  try {
    const baseUrl = new URL(supabaseUrl);
    const baseSuffix = ".supabase.co";
    const nextHost = baseUrl.host.endsWith(baseSuffix)
      ? `${baseUrl.host.slice(0, baseUrl.host.length - baseSuffix.length)}.functions.supabase.co`
      : baseUrl.host;

    return `${baseUrl.protocol}//${nextHost}/app-sync`;
  } catch {
    return "";
  }
})();

type StorageRuntimeWindow = Window & {
  sakuraAppAuth?: {
    getAuthToken?: () => Promise<string | null>;
  };
  sakuraSupabaseCurrentSession?: {
    access_token?: string | null;
  } | null;
  sakuraStartSupabaseAuth?: (() => Promise<unknown>) | undefined;
};

type SignedUploadPayload = {
  bucket: string;
  path: string;
  token: string;
};

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

function getRuntimeWindow() {
  return window as StorageRuntimeWindow;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const value = (error as { message?: unknown }).message;
    return typeof value === "string" ? value : "";
  }

  return error instanceof Error ? error.message : "";
}

function isStorageRlsError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("row-level security") ||
    message.includes("violates row-level security policy") ||
    message.includes("new row violates")
  );
}

async function getAppBridgeAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return (await getRuntimeWindow().sakuraAppAuth?.getAuthToken?.()) ?? null;
  } catch {
    return null;
  }
}

async function getSupabaseBridgeAuthToken() {
  if (!isSupabaseConfigured || !supabase || typeof window === "undefined") {
    return null;
  }

  try {
    if (!getRuntimeWindow().sakuraSupabaseCurrentSession?.access_token) {
      await getRuntimeWindow().sakuraStartSupabaseAuth?.();
    }
  } catch {
  }

  try {
    const runtimeToken = getRuntimeWindow().sakuraSupabaseCurrentSession?.access_token;

    if (typeof runtimeToken === "string" && runtimeToken) {
      return runtimeToken;
    }
  } catch {
  }

  try {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data.session?.access_token;
    return typeof sessionToken === "string" && sessionToken ? sessionToken : null;
  } catch {
    return null;
  }
}

async function getStorageBridgeAuthToken() {
  const bridgeToken = await getAppBridgeAuthToken();

  if (bridgeToken) {
    return bridgeToken;
  }

  return await getSupabaseBridgeAuthToken();
}

async function callSupabaseSyncFunction<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabaseSyncFunctionUrl) {
    throw new Error("Supabase sync function URL is not configured for this build.");
  }

  const authToken = await getStorageBridgeAuthToken();

  if (!authToken) {
    throw new Error("Supabase Storage bridge requires an active signed-in session.");
  }

  const response = await fetch(supabaseSyncFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & T)
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || `Supabase sync function returned ${response.status}.`);
  }

  return (payload ?? {}) as T;
}

async function createSignedUploadTarget(
  bucket: string,
  objectPath: string
): Promise<SignedUploadPayload> {
  return callSupabaseSyncFunction<SignedUploadPayload>({
    action: "create_signed_upload_url",
    bucket,
    objectPath,
  });
}

async function deleteStorageObjectViaBridge(bucket: string, objectPath: string) {
  await callSupabaseSyncFunction<{ ok: true }>({
    action: "delete_storage_object",
    bucket,
    objectPath,
  });
}

async function uploadStorageObjectViaBridge(
  file: File,
  objectPath: string
): Promise<SupabaseCommentMediaUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this build.");
  }

  const signedUpload = await createSignedUploadTarget(supabaseCommentMediaBucket, objectPath);
  const uploadPath =
    typeof signedUpload.path === "string" && signedUpload.path ? signedUpload.path : objectPath;
  const uploadToken =
    typeof signedUpload.token === "string" && signedUpload.token ? signedUpload.token : "";

  if (!uploadToken) {
    throw new Error("Supabase Storage bridge did not return an upload token.");
  }

  const { error } = await supabase.storage
    .from(supabaseCommentMediaBucket)
    .uploadToSignedUrl(uploadPath, uploadToken, file, {
      cacheControl: "3600",
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(supabaseCommentMediaBucket).getPublicUrl(uploadPath);

  return {
    bucket: supabaseCommentMediaBucket,
    path: uploadPath,
    publicUrl,
    contentType: file.type,
    size: file.size,
    reused: false,
  };
}

async function buildObjectPath(file: File, folder: string, userId = "guest") {
  const safeUserId = sanitizeFileName(userId);
  const safeBaseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "upload";
  const extension = inferFileExtension(file);
  const uniqueSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${folder}/${safeUserId}/${safeBaseName}-${uniqueSuffix}.${extension}`;
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

  if (error) {
    if (isStorageRlsError(error)) {
      return uploadStorageObjectViaBridge(file, objectPath);
    }

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
    reused: false,
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
    if (isStorageRlsError(error)) {
      await deleteStorageObjectViaBridge(supabaseCommentMediaBucket, normalizedObjectPath);
      return;
    }

    throw error;
  }
}

export async function deleteSupabaseCommentMedia(objectPath: string) {
  return deleteSupabaseStorageObject(objectPath);
}

