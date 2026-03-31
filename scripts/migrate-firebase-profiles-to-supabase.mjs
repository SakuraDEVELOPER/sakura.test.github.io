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

function normalizeTextArray(value, fallback = []) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string" && entry.trim()).map((entry) => entry.trim())
    : fallback;
}

function normalizeJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapFirebaseUserToSupabaseProfile(documentName, source) {
  const firebaseUid = String(documentName.split("/").pop() ?? "").trim();

  if (!firebaseUid) {
    throw new Error(`Could not extract firebase uid from document name: ${documentName}`);
  }

  const roles = normalizeTextArray(source.roles, ["user"]);
  const login =
    typeof source.login === "string" && source.login.trim() ? source.login.trim() : null;
  const displayName =
    typeof source.displayName === "string" && source.displayName.trim()
      ? source.displayName.trim()
      : null;

  return {
    firebase_uid: firebaseUid,
    profile_id:
      typeof source.profileId === "number" && Number.isFinite(source.profileId)
        ? source.profileId
        : null,
    email: typeof source.email === "string" && source.email.trim() ? source.email.trim() : null,
    email_verified: source.emailVerified === true,
    verification_required: source.verificationRequired === true,
    verification_email_sent: source.verificationEmailSent === true,
    login,
    display_name: displayName,
    photo_url:
      typeof source.photoURL === "string" && source.photoURL.trim() ? source.photoURL.trim() : null,
    avatar_path:
      typeof source.avatarPath === "string" && source.avatarPath.trim()
        ? source.avatarPath.trim()
        : null,
    avatar_type:
      typeof source.avatarType === "string" && source.avatarType.trim()
        ? source.avatarType.trim()
        : null,
    avatar_size:
      typeof source.avatarSize === "number" && Number.isFinite(source.avatarSize)
        ? Math.trunc(source.avatarSize)
        : null,
    roles,
    is_banned: source.isBanned === true,
    banned_at: parseTimestamp(source.bannedAt),
    provider_ids: normalizeTextArray(source.providerIds, []),
    login_history: normalizeJsonArray(source.loginHistory),
    visit_history: normalizeJsonArray(source.visitHistory),
    created_at: parseTimestamp(source.creationTime) ?? new Date().toISOString(),
    last_sign_in_at: parseTimestamp(source.lastSignInTime),
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

  const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  const sourceUsers = await listFirebaseUsers(projectId, accessToken, Number.isFinite(limit) ? limit : null);
  const mappedProfiles = sourceUsers.map((entry) => mapFirebaseUserToSupabaseProfile(entry.name, entry.data));

  console.log(`[migrate:profiles] fetched ${mappedProfiles.length} Firebase user documents`);

  if (!mappedProfiles.length) {
    console.log("[migrate:profiles] nothing to sync");
    return;
  }

  if (dryRun) {
    console.log("[migrate:profiles] dry-run enabled, no rows written");
    console.log(JSON.stringify(mappedProfiles.slice(0, 3), null, 2));
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const batchSize = 200;
  let syncedCount = 0;

  for (let index = 0; index < mappedProfiles.length; index += batchSize) {
    const batch = mappedProfiles.slice(index, index + batchSize);
    const { error } = await supabase
      .from("profiles")
      .upsert(batch, { onConflict: "profile_id" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    syncedCount += batch.length;
    console.log(`[migrate:profiles] synced ${syncedCount}/${mappedProfiles.length}`);
  }

  console.log("[migrate:profiles] done");
}

main().catch((error) => {
  console.error("[migrate:profiles] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
