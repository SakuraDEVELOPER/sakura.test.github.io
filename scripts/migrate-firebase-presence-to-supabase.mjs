import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createSign } from "node:crypto";
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

function normalizeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function normalizePresence(value) {
  const status = value?.status === "online" ? "online" : "offline";
  const isOnline = Boolean(value?.isOnline);
  const currentPath = normalizeText(value?.currentPath);
  const lastSeenAt = parseTimestamp(value?.lastSeenAt);

  return {
    status,
    is_online: isOnline,
    current_path: currentPath,
    last_seen_at: lastSeenAt,
  };
}

async function listFirebaseUsers(projectId, accessToken, limit) {
  const users = [];
  let pageToken = null;

  while (true) {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`
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
      throw new Error(`Failed to list Firebase users: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const documents = Array.isArray(payload?.documents) ? payload.documents : [];

    for (const document of documents) {
      users.push({
        name: document.name,
        data: parseFirestoreDocument(document),
      });

      if (typeof limit === "number" && users.length >= limit) {
        return users;
      }
    }

    if (!payload?.nextPageToken) {
      return users;
    }

    pageToken = payload.nextPageToken;
  }
}

async function loadProfileContext(supabase) {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_id, firebase_uid, auth_user_id, created_at");

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

function mapFirebaseUserToPresenceRow(documentName, source, profileContext) {
  const firebaseUid = String(documentName.split("/").pop() ?? "").trim();
  const directProfileId = normalizeNumber(source.profileId);
  const matchedProfile =
    (firebaseUid ? profileContext.profileByFirebaseUid.get(firebaseUid) : null) ??
    (directProfileId !== null ? profileContext.profileByProfileId.get(directProfileId) : null) ??
    null;
  const profileId = matchedProfile?.profile_id ?? directProfileId;

  if (typeof profileId !== "number" || !profileContext.validProfileIds.has(profileId)) {
    return {
      row: null,
      skipReason: `missing target profile ${String(source.profileId ?? "")}`.trim(),
    };
  }

  const normalizedPresence = normalizePresence(source.presence ?? null);
  const createdAt =
    parseTimestamp(source.creationTime) ??
    matchedProfile?.created_at ??
    normalizedPresence.last_seen_at ??
    new Date().toISOString();
  const updatedAt =
    parseTimestamp(source.updatedAt) ??
    normalizedPresence.last_seen_at ??
    createdAt;

  return {
    row: {
      profile_id: profileId,
      auth_user_id: matchedProfile?.auth_user_id ?? null,
      firebase_uid: firebaseUid || (matchedProfile?.firebase_uid ?? null),
      status: normalizedPresence.status,
      is_online: normalizedPresence.is_online,
      current_path: normalizedPresence.current_path,
      last_seen_at: normalizedPresence.last_seen_at,
      created_at: createdAt,
      updated_at: updatedAt,
    },
    skipReason: null,
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
    throw new Error("Supabase profiles table is empty. Migrate profiles before presence.");
  }

  const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  const sourceUsers = await listFirebaseUsers(projectId, accessToken, Number.isFinite(limit) ? limit : null);
  const mappedRows = [];
  const skippedRows = [];

  for (const entry of sourceUsers) {
    const result = mapFirebaseUserToPresenceRow(entry.name, entry.data, profileContext);

    if (result.row) {
      mappedRows.push(result.row);
      continue;
    }

    skippedRows.push({
      name: entry.name,
      reason: result.skipReason ?? "unknown",
    });
  }

  console.log(`[migrate:presence] fetched ${sourceUsers.length} Firebase user documents`);
  console.log(
    `[migrate:presence] prepared ${mappedRows.length} rows, skipped ${skippedRows.length}`
  );

  if (dryRun) {
    console.log("[migrate:presence] dry-run enabled, no rows written");
    console.log(
      JSON.stringify(
        {
          rows: mappedRows.slice(0, 3),
          skipped: skippedRows.slice(0, 3),
        },
        null,
        2
      )
    );
    return;
  }

  if (!mappedRows.length) {
    console.log("[migrate:presence] nothing to sync");
    return;
  }

  const batchSize = 200;
  let syncedCount = 0;

  for (let index = 0; index < mappedRows.length; index += batchSize) {
    const batch = mappedRows.slice(index, index + batchSize);
    const { error } = await supabase
      .from("profile_presence")
      .upsert(batch, { onConflict: "profile_id" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    syncedCount += batch.length;
    console.log(`[migrate:presence] synced ${syncedCount}/${mappedRows.length}`);
  }

  console.log("[migrate:presence] done");
}

main().catch((error) => {
  console.error("[migrate:presence] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
