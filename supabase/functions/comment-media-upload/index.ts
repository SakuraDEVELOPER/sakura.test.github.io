import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { verifyFirebaseIdToken } from "../_shared/firebase.ts";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type UploadRequestBody = {
  fileName?: unknown;
  contentType?: unknown;
  fileSize?: unknown;
  profileId?: unknown;
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\s+/g, "-");
  const cleaned = normalized.replace(/[^A-Za-z0-9._-]/g, "");

  return cleaned || "upload";
}

function getSafeExtension(fileName: string, contentType: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "jpg";
  }

  if (lowerName.endsWith(".png")) {
    return "png";
  }

  if (lowerName.endsWith(".webp")) {
    return "webp";
  }

  if (lowerName.endsWith(".gif")) {
    return "gif";
  }

  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function buildObjectPath(uid: string, contentType: string, fileName: string) {
  const extension = getSafeExtension(fileName, contentType);
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeFileName = sanitizeFileName(fileName).replace(/\.[^.]+$/, "");
  const objectId = crypto.randomUUID();

  return `comments/${uid}/${year}/${month}/${objectId}-${safeFileName}.${extension}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const authHeader = request.headers.get("Authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing Firebase bearer token." }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const firebaseProjectId = getRequiredEnv("FIREBASE_PROJECT_ID");
    const bucket = Deno.env.get("SUPABASE_STORAGE_BUCKET")?.trim() || "comment-media";
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const requester = await verifyFirebaseIdToken(idToken, firebaseProjectId);

    const body = (await request.json()) as UploadRequestBody;
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : Number.NaN;

    if (!fileName || !contentType || !Number.isFinite(fileSize)) {
      return jsonResponse(
        { error: "fileName, contentType, and fileSize are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return jsonResponse(
        { error: "Only JPEG, PNG, WEBP, and GIF files are allowed." },
        { status: 400 }
      );
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return jsonResponse(
        { error: "File is larger than the allowed 50 MB limit." },
        { status: 400 }
      );
    }

    const objectPath = buildObjectPath(requester.uid, contentType, fileName);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !data?.token) {
      return jsonResponse(
        { error: error?.message ?? "Could not create a signed upload URL." },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return jsonResponse({
      bucket,
      path: objectPath,
      token: data.token,
      publicUrl,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected upload preparation error.",
      },
      { status: 500 }
    );
  }
});
