import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, createSign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_PAGE_SIZE = 200;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getGoogleAccessToken(clientEmail, privateKey) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: FIRESTORE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const assertion = `${unsignedToken}.${signature}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain Google access token: ${response.status} ${response.statusText}`);
  }

  const payloadJson = await response.json();

  if (!payloadJson?.access_token) {
    throw new Error("Google token response did not include access_token.");
  }

  return payloadJson.access_token;
}

function parseFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    const result = {};

    for (const [key, fieldValue] of Object.entries(fields)) {
      result[key] = parseFirestoreValue(fieldValue);
    }

    return result;
  }
  if ("arrayValue" in value) {
    const values = value.arrayValue?.values ?? [];
    return values.map(parseFirestoreValue);
  }

  return null;
}

function parseFirestoreDocument(document) {
  const parsed = {};

  for (const [key, value] of Object.entries(document?.fields ?? {})) {
    parsed[key] = parseFirestoreValue(value);
  }

  return parsed;
}

function parseTimestamp(value) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeMessage(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 280);
}

function normalizeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function stableUuidFromText(value) {
  const digest = createHash("sha256").update(value).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function resolveAuthorName(source, authorProfileId) {
  const normalizedAuthorName = normalizeText(source.authorName);

  if (normalizedAuthorName) {
    return normalizedAuthorName;
  }

  if (typeof authorProfileId === "number" && Number.isFinite(authorProfileId)) {
    return `Profile #${authorProfileId}`;
  }

  return "Member";
}

function mapFirebaseCommentToSupabaseRow(documentName, source, profileContext) {
  const targetProfileId = normalizeNumber(source.profileId);

  if (targetProfileId === null || !profileContext.validProfileIds.has(targetProfileId)) {
    return {
      row: null,
      skipReason: `missing target profile ${String(source.profileId ?? "")}`.trim(),
    };
  }

  const firebaseAuthorUid = normalizeText(source.authorUid);
  const directAuthorProfileId = normalizeNumber(source.authorProfileId);
  const fallbackAuthorProfileId =
    firebaseAuthorUid && profileContext.profileByFirebaseUid.has(firebaseAuthorUid)
      ? profileContext.profileByFirebaseUid.get(firebaseAuthorUid).profile_id
      : null;
  const authorProfileId = [directAuthorProfileId, fallbackAuthorProfileId].find(
    (value) => typeof value === "number" && profileContext.validProfileIds.has(value)
  ) ?? null;
  const matchedAuthorProfile =
    (firebaseAuthorUid && profileContext.profileByFirebaseUid.get(firebaseAuthorUid)) ??
    (authorProfileId !== null ? profileContext.profileByProfileId.get(authorProfileId) : null) ??
    null;
  const message = normalizeMessage(source.message);
  const mediaUrl = normalizeText(source.mediaURL);

  if (!message && !mediaUrl) {
    return {
      row: null,
      skipReason: "empty message and no media",
    };
  }

  return {
    row: {
      id: stableUuidFromText(documentName),
      profile_id: targetProfileId,
      author_profile_id: authorProfileId,
      auth_user_id: matchedAuthorProfile?.auth_user_id ?? null,
      firebase_author_uid: firebaseAuthorUid,
      author_name: resolveAuthorName(source, authorProfileId),
      author_photo_url: normalizeText(source.authorPhotoURL),
      author_accent_role: normalizeText(source.authorAccentRole),
      message,
      media_url: mediaUrl,
      media_type: normalizeText(source.mediaType),
      media_path: normalizeText(source.mediaPath),
      media_size: normalizeNumber(source.mediaSize),
      created_at: parseTimestamp(source.createdAt) ?? new Date().toISOString(),
      updated_at:
        parseTimestamp(source.updatedAt) ??
        parseTimestamp(source.createdAt) ??
        new Date().toISOString(),
    },
    skipReason: null,
  };
}

async function listFirestoreDocuments(projectId, accessToken, collectionName, limit) {
  const documents = [];
  let pageToken = null;

  while (true) {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`
    );
    url.searchParams.set("pageSize", String(FIRESTORE_PAGE_SIZE));

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to list Firebase ${collectionName}: ${response.status} ${response.statusText}`
      );
    }

    const payload = await response.json();
    const currentDocuments = Array.isArray(payload?.documents) ? payload.documents : [];

    for (const document of currentDocuments) {
      documents.push({
        name: document.name,
        data: parseFirestoreDocument(document),
      });

      if (typeof limit === "number" && documents.length >= limit) {
        return documents;
      }
    }

    if (!payload?.nextPageToken) {
      return documents;
    }

    pageToken = payload.nextPageToken;
  }
}

async function loadProfileContext(supabase) {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_id, firebase_uid, auth_user_id");

  if (error) {
    throw new Error(`Failed to load Supabase profiles: ${error.message}`);
  }

  const profileByFirebaseUid = new Map();
  const profileByProfileId = new Map();
  const validProfileIds = new Set();

  for (const row of data ?? []) {
    if (typeof row?.profile_id === "number" && Number.isFinite(row.profile_id)) {
      validProfileIds.add(row.profile_id);
      profileByProfileId.set(row.profile_id, row);
    }

    if (typeof row?.firebase_uid === "string" && row.firebase_uid.trim()) {
      profileByFirebaseUid.set(row.firebase_uid.trim(), row);
    }
  }

  return {
    validProfileIds,
    profileByFirebaseUid,
    profileByProfileId,
  };
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((argument) => argument.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

  const projectId = process.env.FIREBASE_PROJECT_ID || requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? null;
  const firebaseServiceAccountEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL ?? null;
  const firebaseServiceAccountPrivateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ?? null;

  let clientEmail = firebaseServiceAccountEmail;
  let privateKey = firebaseServiceAccountPrivateKey;

  if (firebaseServiceAccountJson) {
    const parsedServiceAccount = JSON.parse(firebaseServiceAccountJson);
    clientEmail = clientEmail ?? parsedServiceAccount.client_email ?? null;
    privateKey = privateKey ?? parsedServiceAccount.private_key ?? null;
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase service account credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_EMAIL and FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profileContext = await loadProfileContext(supabase);

  if (!profileContext.validProfileIds.size) {
    throw new Error("Supabase profiles table is empty. Migrate profiles before comments.");
  }

  const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  const sourceComments = await listFirestoreDocuments(
    projectId,
    accessToken,
    "profileComments",
    Number.isFinite(limit) ? limit : null
  );

  const mappedComments = [];
  const skippedComments = [];

  for (const entry of sourceComments) {
    const result = mapFirebaseCommentToSupabaseRow(entry.name, entry.data, profileContext);

    if (result.row) {
      mappedComments.push(result.row);
      continue;
    }

    skippedComments.push({
      name: entry.name,
      reason: result.skipReason ?? "unknown",
    });
  }

  console.log(`[migrate:comments] fetched ${sourceComments.length} Firebase comment documents`);
  console.log(
    `[migrate:comments] prepared ${mappedComments.length} rows, skipped ${skippedComments.length}`
  );

  if (dryRun) {
    console.log("[migrate:comments] dry-run enabled, no rows written");
    console.log(
      JSON.stringify(
        {
          rows: mappedComments.slice(0, 3),
          skipped: skippedComments.slice(0, 3),
        },
        null,
        2
      )
    );
    return;
  }

  if (!mappedComments.length) {
    console.log("[migrate:comments] nothing to sync");
    return;
  }

  const batchSize = 200;
  let syncedCount = 0;

  for (let index = 0; index < mappedComments.length; index += batchSize) {
    const batch = mappedComments.slice(index, index + batchSize);
    const { error } = await supabase
      .from("profile_comments")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    syncedCount += batch.length;
    console.log(`[migrate:comments] synced ${syncedCount}/${mappedComments.length}`);
  }

  console.log("[migrate:comments] done");
}

main().catch((error) => {
  console.error("[migrate:comments] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
