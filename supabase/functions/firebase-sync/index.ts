import { createClient } from "npm:@supabase/supabase-js@2";
import { cert, getApps, initializeApp } from "npm:firebase-admin/app";
import { getAuth as getFirebaseAdminAuthBase } from "npm:firebase-admin/auth";
import { getFirestore as getFirebaseAdminFirestoreBase } from "npm:firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const firebaseServiceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";
const firebaseServiceAccountEmail = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_EMAIL") ?? "";
const firebaseServiceAccountPrivateKey = (
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY") ?? ""
).replace(/\\n/g, "\n");
const supabaseStorageBucket = Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "comment-media";

if (!firebaseProjectId || !supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing required env for firebase-sync function. Set FIREBASE_PROJECT_ID, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

type JsonRecord = Record<string, unknown>;

type ActorProfile = {
  firebaseUid?: string | null;
  profileId: number | null;
  roles: string[];
  authUserId: string | null;
  email: string | null;
  emailVerified?: boolean | null;
  verificationRequired?: boolean | null;
  providerIds?: string[];
  displayName: string | null;
  avatarPath: string | null;
};

type RequestActor = {
  uid: string;
  source: "firebase" | "supabase";
  firebaseUid: string | null;
  authUserId: string | null;
  email: string | null;
  emailVerified: boolean;
};

const PROFILE_COMPATIBILITY_SELECT =
  "firebase_uid,profile_id,roles,auth_user_id,email,email_verified,verification_required,provider_ids,display_name,avatar_path";

const nowIso = () => new Date().toISOString();

const json = (body: JsonRecord, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const normalizeInteger = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : null;
  }

  return null;
};

const normalizeString = (value: unknown, maxLength = 500) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;

const normalizePassword = (value: unknown) =>
  typeof value === "string" && value.length >= 6 && value.length <= 1024
    ? value
    : null;

const parseFirebaseServiceAccount = () => {
  if (firebaseServiceAccountJson) {
    try {
      const parsed = JSON.parse(firebaseServiceAccountJson) as Record<string, unknown>;

      return {
        projectId:
          normalizeString(parsed.project_id, 200) ??
          normalizeString(parsed.projectId, 200),
        clientEmail:
          normalizeString(parsed.client_email, 320) ??
          normalizeString(parsed.clientEmail, 320),
        privateKey:
          normalizeString(parsed.private_key, 8192) ??
          normalizeString(parsed.privateKey, 8192),
      };
    } catch (_error) {
      if (firebaseServiceAccountEmail && firebaseServiceAccountPrivateKey) {
        return {
          projectId: null,
          clientEmail: normalizeString(firebaseServiceAccountEmail, 320),
          privateKey: normalizeString(firebaseServiceAccountPrivateKey, 8192),
        };
      }

      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON. Re-save the secret as the full raw service account object, or set FIREBASE_SERVICE_ACCOUNT_EMAIL and FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY instead.",
      );
    }
  }

  return {
    projectId: null,
    clientEmail: normalizeString(firebaseServiceAccountEmail, 320),
    privateKey: normalizeString(firebaseServiceAccountPrivateKey, 8192),
  };
};

const getFirebaseAdminApp = () => {
  const serviceAccount = parseFirebaseServiceAccount();

  if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      "Firebase admin service account is required for Firebase compatibility sync. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_EMAIL and FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId ?? undefined,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
    });
  }

  return getApps()[0];
};
const getFirebaseAdminAuth = () => getFirebaseAdminAuthBase(getFirebaseAdminApp());
const getFirebaseAdminFirestore = () => getFirebaseAdminFirestoreBase(getFirebaseAdminApp());

const normalizeIsoString = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsedValue = Date.parse(value);
  return Number.isFinite(parsedValue) ? new Date(parsedValue).toISOString() : null;
};

const normalizeRoles = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((role): role is string => typeof role === "string")
        .map((role) => role.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 16)
    : [];

const normalizeBucketName = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, 128)
    : "comment-media";

const normalizeStorageObjectPath = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? value.trim().replace(/^\/+/, "").slice(0, 1024)
    : null;

const hasCommentModerationRole = (roles: string[]) =>
  roles.some((role) =>
    [
      "root",
      "co-owner",
      "super administrator",
      "administrator",
      "moderator",
      "support",
    ].includes(role)
  );

const canManageStorageObjects = (roles: string[]) => hasCommentModerationRole(roles);
const canManageRoles = (roles: string[]) =>
  roles.some((role) => ["root", "co-owner"].includes(role));
const hasRole = (roles: string[], expectedRole: string) =>
  roles.some((role) => role === expectedRole);
const ensureActorCanManageTargetProfile = (actorRoles: string[], targetRoles: string[]) => {
  if (hasRole(actorRoles, "root")) {
    return;
  }

  if (!hasRole(actorRoles, "co-owner")) {
    throw new Error("Only root and co-owner accounts can use this admin action.");
  }

  if (hasRole(targetRoles, "root")) {
    throw new Error("Co-owner cannot manage a root account.");
  }
};

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
};

const verifyFirebaseIdToken = async (token: string): Promise<RequestActor> => {
  const { payload } = await jwtVerify(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
  });

  const uid = typeof payload.sub === "string" && payload.sub ? payload.sub : null;

  if (!uid) {
    throw new Error("Firebase token is missing subject.");
  }

  return {
    uid,
    source: "firebase" as const,
    firebaseUid: uid,
    authUserId: null,
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true,
  };
};

const verifySupabaseAccessToken = async (token: string): Promise<RequestActor> => {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.id) {
    throw error ?? new Error("Supabase token is invalid.");
  }

  return {
    uid: data.user.id,
    source: "supabase",
    firebaseUid: null,
    authUserId: data.user.id,
    email: typeof data.user.email === "string" ? data.user.email : null,
    emailVerified: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
  };
};

const verifyRequestActor = async (token: string): Promise<RequestActor> => {
  try {
    return await verifyFirebaseIdToken(token);
  } catch (_firebaseError) {
    return await verifySupabaseAccessToken(token);
  }
};

const emptyActorProfile = (): ActorProfile => ({
  firebaseUid: null,
  profileId: null,
  roles: [],
  authUserId: null,
  email: null,
  emailVerified: null,
  verificationRequired: null,
  providerIds: [],
  displayName: null,
  avatarPath: null,
});

const loadActorProfile = async (actor: RequestActor): Promise<ActorProfile> => {
  const actorFirebaseUid = normalizeString(actor.firebaseUid, 128);
  const actorAuthUserId = normalizeString(actor.authUserId, 128);

  if (!actorFirebaseUid && !actorAuthUserId) {
    return emptyActorProfile();
  }

  let data: Record<string, unknown> | null = null;

  if (actorAuthUserId) {
    const { data: authMatchedProfile, error: authMatchError } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COMPATIBILITY_SELECT)
      .eq("auth_user_id", actorAuthUserId)
      .maybeSingle();

    if (authMatchError) {
      throw authMatchError;
    }

    if (authMatchedProfile) {
      data = authMatchedProfile as Record<string, unknown>;
    }
  }

  if (!data && actorFirebaseUid) {
    const { data: firebaseMatchedProfile, error: firebaseMatchError } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COMPATIBILITY_SELECT)
      .eq("firebase_uid", actorFirebaseUid)
      .maybeSingle();

    if (firebaseMatchError) {
      throw firebaseMatchError;
    }

    if (firebaseMatchedProfile) {
      data = firebaseMatchedProfile as Record<string, unknown>;
    }
  }

  if (!data || typeof data !== "object") {
    return emptyActorProfile();
  }

  return {
    firebaseUid: normalizeString(data?.firebase_uid, 128),
    profileId: normalizeInteger(data?.profile_id),
    roles: normalizeRoles(data?.roles),
    authUserId: normalizeString(data?.auth_user_id, 128),
    email: normalizeString(data?.email, 320),
    emailVerified: typeof data?.email_verified === "boolean" ? data.email_verified : null,
    verificationRequired:
      typeof data?.verification_required === "boolean" ? data.verification_required : null,
    providerIds: normalizeRoles(data?.provider_ids),
    displayName: normalizeString(data?.display_name, 96),
    avatarPath: normalizeStorageObjectPath(data?.avatar_path),
  };
};
const loadProfileByProfileId = async (profileId: number): Promise<ActorProfile | null> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_COMPATIBILITY_SELECT)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    firebaseUid: normalizeString(data.firebase_uid, 128),
    profileId: normalizeInteger(data.profile_id),
    roles: normalizeRoles(data.roles),
    authUserId: normalizeString(data.auth_user_id, 128),
    email: normalizeString(data.email, 320),
    emailVerified: typeof data.email_verified === "boolean" ? data.email_verified : null,
    verificationRequired:
      typeof data.verification_required === "boolean" ? data.verification_required : null,
    providerIds: normalizeRoles(data.provider_ids),
    displayName: normalizeString(data.display_name, 96),
    avatarPath: normalizeStorageObjectPath(data.avatar_path),
  };
};

const syncFirebaseVerificationCompatibility = async (
  profile: ActorProfile,
  isVerified: boolean,
) => {
  if (!profile.firebaseUid) {
    return;
  }

  try {
    await getFirebaseAdminAuth().updateUser(profile.firebaseUid, {
      emailVerified: isVerified,
    });
  } catch (error) {
    if (!isMissingAuthUserError(error)) {
      console.error("Firebase auth compatibility sync failed:", error);
      return;
    }
  }

  try {
    await getFirebaseAdminFirestore().collection("users").doc(profile.firebaseUid).set(
      {
        email: profile.email,
        emailVerified: isVerified,
        verificationRequired: !isVerified,
        verificationEmailSent: false,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Firebase Firestore compatibility sync failed:", error);
  }
};

const handleAdminSetProfileEmailVerification = async (
  actor: RequestActor,
  body: JsonRecord,
) => {
  const profileId = normalizeInteger(body.profileId);
  const requestedIsVerified = body.isVerified === true;

  if (!profileId || profileId <= 0) {
    return json({ error: "Profile id must be a positive number." }, 400);
  }

  const actorProfile = await loadActorProfile(actor);

  if (!canManageRoles(actorProfile.roles)) {
    return json({ error: "Only root and co-owner accounts can use this admin action." }, 403);
  }

  const targetProfile = await loadProfileByProfileId(profileId);

  if (!targetProfile) {
    return json({
      ok: true,
      action: "admin_set_profile_email_verification",
      profileId,
      updated: false,
      fields: null,
    });
  }

  ensureActorCanManageTargetProfile(actorProfile.roles, targetProfile.roles);

  if (
    actorProfile.profileId === targetProfile.profileId &&
    !requestedIsVerified &&
    hasRole(actorProfile.roles, "root")
  ) {
    return json({ error: "You cannot revoke email verification on your own root account." }, 403);
  }

  const { data: updatedProfileRow, error: updateProfileError } = await supabaseAdmin
    .from("profiles")
    .update({
      email_verified: requestedIsVerified,
      verification_required: !requestedIsVerified,
      verification_email_sent: false,
      updated_at: nowIso(),
    })
    .eq("profile_id", profileId)
    .select(PROFILE_COMPATIBILITY_SELECT)
    .maybeSingle();

  if (updateProfileError) {
    throw updateProfileError;
  }

  const updatedProfile =
    updatedProfileRow && typeof updatedProfileRow === "object"
      ? {
          firebaseUid: normalizeString(updatedProfileRow.firebase_uid, 128),
          profileId: normalizeInteger(updatedProfileRow.profile_id),
          roles: normalizeRoles(updatedProfileRow.roles),
          authUserId: normalizeString(updatedProfileRow.auth_user_id, 128),
          email: normalizeString(updatedProfileRow.email, 320),
          emailVerified:
            typeof updatedProfileRow.email_verified === "boolean"
              ? updatedProfileRow.email_verified
              : null,
          verificationRequired:
            typeof updatedProfileRow.verification_required === "boolean"
              ? updatedProfileRow.verification_required
              : null,
          providerIds: normalizeRoles(updatedProfileRow.provider_ids),
          displayName: normalizeString(updatedProfileRow.display_name, 96),
          avatarPath: normalizeStorageObjectPath(updatedProfileRow.avatar_path),
        }
      : targetProfile;

  if (updatedProfile.authUserId) {
    const authAttributes: Record<string, unknown> = {
      email_confirm: requestedIsVerified,
    };

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      updatedProfile.authUserId,
      authAttributes,
    );

    if (updateAuthError && !isMissingAuthUserError(updateAuthError)) {
      throw updateAuthError;
    }
  }

  await syncFirebaseVerificationCompatibility(updatedProfile, requestedIsVerified);

  return json({
    ok: true,
    action: "admin_set_profile_email_verification",
    profileId,
    updated: true,
    fields: {
      email: updatedProfile.email,
      emailVerified: requestedIsVerified,
      verificationRequired: !requestedIsVerified,
      providerIds: Array.isArray(updatedProfile.providerIds) ? updatedProfile.providerIds : [],
    },
  });
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

const isAlreadyRegisteredError = (error: unknown) =>
  /already been registered|already registered|user already registered|email.*exists/i.test(
    getErrorMessage(error),
  );

const isMissingAuthUserError = (error: unknown) =>
  /user not found|not found/i.test(getErrorMessage(error));

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const deleteSupabaseStoragePaths = async (paths: string[]) => {
  const normalizedPaths = [...new Set(
    paths
      .map((path) => normalizeStorageObjectPath(path))
      .filter((path): path is string => Boolean(path))
  )];

  if (!normalizedPaths.length) {
    return;
  }

  for (const batch of chunkArray(normalizedPaths, 100)) {
    const { error } = await supabaseAdmin.storage
      .from(supabaseStorageBucket)
      .remove(batch);

    if (error) {
      throw error;
    }
  }
};

const findSupabaseAuthUserIdByEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const perPage = 200;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = Array.isArray(data.users) ? data.users : [];
    const matchedUser = users.find(
      (user) =>
        typeof user.email === "string" &&
        user.email.trim().toLowerCase() === normalizedEmail,
    );

    if (matchedUser?.id) {
      return matchedUser.id;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
};
const deleteFirebaseFirestoreAccountData = async (
  firebaseUid: string,
  profileId: number | null,
) => {
  const firestore = getFirebaseAdminFirestore();
  const usersCollection = firestore.collection("users");
  const profileCommentsCollection = firestore.collection("profileComments");
  const countersRef = firestore.collection("meta").doc("counters");
  const userRef = usersCollection.doc(firebaseUid);
  const userSnapshot = await userRef.get();
  const effectiveProfileId =
    profileId ?? normalizeInteger(userSnapshot.data()?.profileId ?? null);
  const refsByPath = new Map<string, FirebaseFirestore.DocumentReference>();

  if (effectiveProfileId && effectiveProfileId > 0) {
    const profileCommentSnapshot = await profileCommentsCollection
      .where("profileId", "==", effectiveProfileId)
      .get();

    profileCommentSnapshot.forEach((commentDoc) => {
      refsByPath.set(commentDoc.ref.path, commentDoc.ref);
    });
  }

  const authorCommentSnapshot = await profileCommentsCollection
    .where("authorUid", "==", firebaseUid)
    .get();

  authorCommentSnapshot.forEach((commentDoc) => {
    refsByPath.set(commentDoc.ref.path, commentDoc.ref);
  });

  if (userSnapshot.exists) {
    refsByPath.set(userRef.path, userRef);
  }

  for (const batchRefs of chunkArray([...refsByPath.values()], 400)) {
    const batch = firestore.batch();

    batchRefs.forEach((ref) => {
      batch.delete(ref);
    });

    await batch.commit();
  }

  const remainingUsersSnapshot = await usersCollection.get();
  let maxProfileId = 0;

  remainingUsersSnapshot.forEach((remainingUserDoc) => {
    const candidateProfileId = normalizeInteger(remainingUserDoc.data()?.profileId ?? null);

    if (candidateProfileId && candidateProfileId > maxProfileId) {
      maxProfileId = candidateProfileId;
    }
  });

  await countersRef.set(
    {
      profileCount: maxProfileId,
      updatedAt: nowIso(),
    },
    { merge: true },
  );

  return {
    deletedCommentCount: refsByPath.size - (userSnapshot.exists ? 1 : 0),
    profileCount: maxProfileId,
    profileId: effectiveProfileId,
  };
};

const authorizeStorageObjectPath = async (
  actorUid: string,
  actorProfile: ActorProfile,
  objectPath: string,
) => {
  const normalizedPath = normalizeStorageObjectPath(objectPath);

  if (!normalizedPath) {
    return {
      ok: false,
      error: "Storage object path is required.",
    };
  }

  const pathSegments = normalizedPath.split("/").filter(Boolean);

  if (pathSegments.length < 3) {
    return {
      ok: false,
      error: "Storage object path must include folder, uid, and file name.",
    };
  }

  const folder = pathSegments[0];
  const targetUid = pathSegments[1];
  const isOwner = targetUid === actorUid;
  const canModerate = canManageStorageObjects(actorProfile.roles);

  if (!["avatars", "comments"].includes(folder)) {
    return {
      ok: false,
      error: "Storage object path must be inside avatars/ or comments/.",
    };
  }

  if (!isOwner && !canModerate) {
    return {
      ok: false,
      error: "Storage action is not allowed for this actor.",
    };
  }

  return {
    ok: true,
    path: normalizedPath,
  };
};

const handleProfileUpsert = async (firebaseUid: string, body: JsonRecord) => {
  const profile = body.profile;

  if (!profile || typeof profile !== "object") {
    return json({ error: "Missing profile payload." }, 400);
  }

  const profileId = normalizeInteger((profile as JsonRecord).profileId);
  const payloadFirebaseUid = normalizeString((profile as JsonRecord).firebaseUid, 128);

  if (!profileId || profileId <= 0) {
    return json({ error: "Profile id is required." }, 400);
  }

  if (payloadFirebaseUid !== firebaseUid) {
    return json({ error: "Profile owner mismatch." }, 403);
  }

  const row = {
    firebase_uid: firebaseUid,
    profile_id: profileId,
    login: normalizeString((profile as JsonRecord).login, 64),
    display_name: normalizeString((profile as JsonRecord).displayName, 96),
    photo_url: normalizeString((profile as JsonRecord).photoURL, 2048),
    avatar_path: normalizeString((profile as JsonRecord).avatarPath, 512),
    avatar_type: normalizeString((profile as JsonRecord).avatarType, 64),
    avatar_size: normalizeInteger((profile as JsonRecord).avatarSize),
    roles: normalizeRoles((profile as JsonRecord).roles),
    is_banned: (profile as JsonRecord).isBanned === true,
    banned_at: normalizeIsoString((profile as JsonRecord).bannedAt),
    email_verified: (profile as JsonRecord).emailVerified === true,
    verification_required: (profile as JsonRecord).verificationRequired === true,
    created_at: normalizeIsoString((profile as JsonRecord).createdAt),
    last_sign_in_at: normalizeIsoString((profile as JsonRecord).lastSignInTime),
    updated_at: nowIso(),
  };

  const { error } = await supabaseAdmin.from("profiles").upsert(row, {
    onConflict: "profile_id",
  });

  if (error) {
    throw error;
  }

  return json({ ok: true, action: "upsert_profile", profileId });
};

const linkProfileToSupabaseAuthUser = async (
  profileId: number,
  authUserId: string,
  email: string | null,
) => {
  const updates: Record<string, unknown> = {
    auth_user_id: authUserId,
    updated_at: nowIso(),
  };

  if (email) {
    updates.email = email;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("profile_id", profileId);

  if (error) {
    throw error;
  }
};

const handleEnsureSupabasePasswordUser = async (
  actor: RequestActor,
  body: JsonRecord,
) => {
  const authPayload = body.auth;

  if (!authPayload || typeof authPayload !== "object") {
    return json({ error: "Missing auth payload." }, 400);
  }

  const actorProfile = await loadActorProfile(actor);
  const requestedEmail = normalizeString((authPayload as JsonRecord).email, 320);
  const email = requestedEmail ?? actor.email ?? actorProfile.email;
  const password = normalizePassword((authPayload as JsonRecord).password);
  const displayName =
    normalizeString((authPayload as JsonRecord).displayName, 96) ?? actorProfile.displayName;

  if (!email) {
    return json({ error: "Email is required." }, 400);
  }

  if (!password) {
    return json({ error: "Password must be at least 6 characters long." }, 400);
  }

  if (actor.email && actor.email !== email) {
    return json({ error: "Supabase auth email must match the Firebase session email." }, 403);
  }

  const userMetadata: Record<string, unknown> = {};

  if (actor.firebaseUid) {
    userMetadata.firebase_uid = actor.firebaseUid;
  }

  if (actor.authUserId) {
    userMetadata.auth_user_id = actor.authUserId;
  }

  if (displayName) {
    userMetadata.display_name = displayName;
  }

  if (actorProfile.profileId && actorProfile.profileId > 0) {
    userMetadata.profile_id = actorProfile.profileId;
  }

  const authAttributes: Record<string, unknown> = {
    email,
    password,
    user_metadata: userMetadata,
  };

  if (actor.emailVerified) {
    authAttributes.email_confirm = true;
  }

  let authUserId = actorProfile.authUserId;
  let created = false;
  let updated = false;

  if (authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, authAttributes);

    if (error) {
      if (!isMissingAuthUserError(error)) {
        throw error;
      }

      authUserId = null;
    } else {
      authUserId = normalizeString(data.user?.id, 128) ?? authUserId;
      updated = true;
    }
  }

  if (!authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser(authAttributes);

    if (error) {
      if (!isAlreadyRegisteredError(error)) {
        throw error;
      }

      return json({
        ok: true,
        action: "ensure_supabase_password_user",
        created: false,
        updated,
        linked: false,
        authUserId: null,
        existing: true,
      });
    }

    authUserId = normalizeString(data.user?.id, 128);
    created = Boolean(authUserId);
  }

  if (authUserId && actorProfile.profileId && actorProfile.profileId > 0) {
    await linkProfileToSupabaseAuthUser(actorProfile.profileId, authUserId, email);
  }

  return json({
    ok: true,
    action: "ensure_supabase_password_user",
    created,
    updated,
    linked: Boolean(authUserId && actorProfile.profileId && actorProfile.profileId > 0),
    authUserId,
    existing: !created && !updated,
  });
};

const handleDeleteProfileAccountData = async (
  actor: RequestActor,
) => {
  const actorProfile = await loadActorProfile(actor);
  const actorFirebaseUid = actorProfile.firebaseUid ?? actor.firebaseUid;
  const firebaseCleanup = actorFirebaseUid
    ? await deleteFirebaseFirestoreAccountData(actorFirebaseUid, actorProfile.profileId)
    : { profileId: actorProfile.profileId, profileCount: null };
  const profileId = firebaseCleanup.profileId ?? actorProfile.profileId;
  const mediaPaths = new Set<string>();

  if (actorProfile.avatarPath) {
    mediaPaths.add(actorProfile.avatarPath);
  }

  if (profileId && profileId > 0) {
    const { data: commentRows, error: commentRowsError } = await supabaseAdmin
      .from("profile_comments")
      .select("id,media_path")
      .or(`profile_id.eq.${profileId},author_profile_id.eq.${profileId}`);

    if (commentRowsError) {
      throw commentRowsError;
    }

    for (const row of Array.isArray(commentRows) ? commentRows : []) {
      const mediaPath = normalizeStorageObjectPath(row?.media_path);

      if (mediaPath) {
        mediaPaths.add(mediaPath);
      }
    }

    const { error: deleteCommentsError } = await supabaseAdmin
      .from("profile_comments")
      .delete()
      .or(`profile_id.eq.${profileId},author_profile_id.eq.${profileId}`);

    if (deleteCommentsError) {
      throw deleteCommentsError;
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("profile_id", profileId);

    if (deleteProfileError) {
      throw deleteProfileError;
    }
  }

  await deleteSupabaseStoragePaths([...mediaPaths]);

  const supabaseAuthUserId =
    actorProfile.authUserId ??
    actor.authUserId ??
    (actorProfile.email ? await findSupabaseAuthUserIdByEmail(actorProfile.email) : null) ??
    (actor.email ? await findSupabaseAuthUserIdByEmail(actor.email) : null);

  if (supabaseAuthUserId) {
    const { error: deleteSupabaseAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      supabaseAuthUserId,
    );

    if (deleteSupabaseAuthError && !isMissingAuthUserError(deleteSupabaseAuthError)) {
      throw deleteSupabaseAuthError;
    }
  }

  if (actorFirebaseUid) {
    try {
      await getFirebaseAdminAuth().deleteUser(actorFirebaseUid);
    } catch (error) {
      if (!isMissingAuthUserError(error)) {
        throw error;
      }
    }
  }

  return json({
    ok: true,
    action: "delete_profile_account_data",
    profileId,
    profileCount: firebaseCleanup.profileCount,
    deletedSupabaseAuthUserId: supabaseAuthUserId,
    deletedFirebaseUid: actorFirebaseUid,
  });
};
const handleAdminDeleteProfileAccountData = async (
  actor: RequestActor,
  body: JsonRecord,
) => {
  const actorProfile = await loadActorProfile(actor);

  if (!canManageRoles(actorProfile.roles)) {
    return json({ error: "Only root and co-owner accounts can delete accounts from the admin panel." }, 403);
  }

  const targetProfileId = normalizeInteger(body.profileId);

  if (!targetProfileId || targetProfileId <= 0) {
    return json({ error: "Target profile id is required." }, 400);
  }

  const targetProfile = await loadProfileByProfileId(targetProfileId);

  if (!targetProfile) {
    return json({
      ok: true,
      action: "admin_delete_profile_account_data",
      deleted: false,
      profileId: targetProfileId,
    });
  }

  ensureActorCanManageTargetProfile(actorProfile.roles, targetProfile.roles);

  if (
    (typeof actorProfile.profileId === "number" && actorProfile.profileId === targetProfile.profileId) ||
    (targetProfile.firebaseUid &&
      actor.firebaseUid &&
      targetProfile.firebaseUid === actor.firebaseUid)
  ) {
    return json({ error: "Use the owner delete flow for your own account." }, 403);
  }

  const firebaseCleanup =
    targetProfile.firebaseUid
      ? await deleteFirebaseFirestoreAccountData(
          targetProfile.firebaseUid,
          targetProfile.profileId,
        )
      : { profileId: targetProfile.profileId, profileCount: null };

  const mediaPaths = new Set<string>();

  if (targetProfile.avatarPath) {
    mediaPaths.add(targetProfile.avatarPath);
  }

  if (targetProfile.profileId && targetProfile.profileId > 0) {
    const { data: commentRows, error: commentRowsError } = await supabaseAdmin
      .from("profile_comments")
      .select("id,media_path")
      .or(`profile_id.eq.${targetProfile.profileId},author_profile_id.eq.${targetProfile.profileId}`);

    if (commentRowsError) {
      throw commentRowsError;
    }

    for (const row of Array.isArray(commentRows) ? commentRows : []) {
      const mediaPath = normalizeStorageObjectPath(row?.media_path);

      if (mediaPath) {
        mediaPaths.add(mediaPath);
      }
    }

    const { error: deleteCommentsError } = await supabaseAdmin
      .from("profile_comments")
      .delete()
      .or(`profile_id.eq.${targetProfile.profileId},author_profile_id.eq.${targetProfile.profileId}`);

    if (deleteCommentsError) {
      throw deleteCommentsError;
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("profile_id", targetProfile.profileId);

    if (deleteProfileError) {
      throw deleteProfileError;
    }
  }

  await deleteSupabaseStoragePaths([...mediaPaths]);

  const supabaseAuthUserId =
    targetProfile.authUserId ??
    (targetProfile.email ? await findSupabaseAuthUserIdByEmail(targetProfile.email) : null);

  if (supabaseAuthUserId) {
    const { error: deleteSupabaseAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      supabaseAuthUserId,
    );

    if (deleteSupabaseAuthError && !isMissingAuthUserError(deleteSupabaseAuthError)) {
      throw deleteSupabaseAuthError;
    }
  }

  if (targetProfile.firebaseUid) {
    try {
      await getFirebaseAdminAuth().deleteUser(targetProfile.firebaseUid);
    } catch (error) {
      if (!isMissingAuthUserError(error)) {
        throw error;
      }
    }
  }

  return json({
    ok: true,
    action: "admin_delete_profile_account_data",
    deleted: true,
    profileId: firebaseCleanup.profileId ?? targetProfile.profileId,
    profileCount: firebaseCleanup.profileCount ?? null,
    deletedSupabaseAuthUserId: supabaseAuthUserId,
    deletedFirebaseUid: targetProfile.firebaseUid ?? null,
  });
};
const handleGetPrivateProfileFields = async (
  actor: RequestActor,
  body: JsonRecord,
) => {
  const actorProfile = await loadActorProfile(actor);
  const targetProfileId = normalizeInteger(body.profileId);

  if (!targetProfileId || targetProfileId <= 0) {
    return json({ error: "Target profile id is required." }, 400);
  }

  const targetProfile = await loadProfileByProfileId(targetProfileId);

  if (!targetProfile) {
    return json({
      ok: true,
      action: "get_private_profile_fields",
      profileId: targetProfileId,
      fields: null,
    });
  }

  if (actorProfile.profileId !== targetProfileId) {
    if (!canManageRoles(actorProfile.roles)) {
      return json({ error: "Only the owner or a manager can read private profile fields." }, 403);
    }

    ensureActorCanManageTargetProfile(actorProfile.roles, targetProfile.roles);
  }

  return json({
    ok: true,
    action: "get_private_profile_fields",
    profileId: targetProfile.profileId,
    fields: {
      email: targetProfile.email,
      emailVerified: targetProfile.emailVerified ?? null,
      verificationRequired: targetProfile.verificationRequired ?? null,
      providerIds: Array.isArray(targetProfile.providerIds) ? targetProfile.providerIds : [],
    },
  });
};

const handlePresenceUpsert = async (actor: RequestActor, body: JsonRecord) => {
  const presence = body.presence;

  if (!presence || typeof presence !== "object") {
    return json({ error: "Missing presence payload." }, 400);
  }

  let profileId = normalizeInteger((presence as JsonRecord).profileId);

  if (!profileId || profileId <= 0) {
    const actorProfile = await loadActorProfile(actor);
    profileId = actorProfile.profileId;
  }

  if (!profileId || profileId <= 0) {
    return json({ error: "Presence profile id is required." }, 400);
  }

  const row = {
    profile_id: profileId,
    firebase_uid: actor.firebaseUid,
    auth_user_id: actor.authUserId,
    status: (presence as JsonRecord).status === "online" ? "online" : "offline",
    is_online: (presence as JsonRecord).isOnline === true,
    current_path: normalizeString((presence as JsonRecord).currentPath, 512),
    last_seen_at: normalizeIsoString((presence as JsonRecord).lastSeenAt) ?? nowIso(),
    updated_at: nowIso(),
  };

  const { error } = await supabaseAdmin.from("profile_presence").upsert(row, {
    onConflict: "profile_id",
  });

  if (error) {
    throw error;
  }

  return json({ ok: true, action: "upsert_presence", profileId });
};

const handleCommentUpsert = async (actor: RequestActor, body: JsonRecord) => {
  const comment = body.comment;

  if (!comment || typeof comment !== "object") {
    return json({ error: "Missing comment payload." }, 400);
  }

  const commentId = normalizeString((comment as JsonRecord).id, 128);
  const profileId = normalizeInteger((comment as JsonRecord).profileId);
  const authorProfileId = normalizeInteger((comment as JsonRecord).authorProfileId);
  const authorUid = normalizeString((comment as JsonRecord).authorUid, 128);

  if (!commentId || !profileId || profileId <= 0 || !authorUid) {
    return json({ error: "Comment id, profile id, and author uid are required." }, 400);
  }

  const actorProfile = await loadActorProfile(actor);
  const actorUid = actor.firebaseUid ?? actor.authUserId ?? actor.uid;
  const { data: existingComment, error: existingCommentError } = await supabaseAdmin
    .from("profile_comments")
    .select("id,firebase_author_uid,auth_user_id,profile_id")
    .eq("id", commentId)
    .maybeSingle();

  if (existingCommentError) {
    throw existingCommentError;
  }

  const isOwnComment = authorUid === actorUid;
  const isExistingOwnComment =
    existingComment?.firebase_author_uid === actor.firebaseUid ||
    existingComment?.auth_user_id === actor.authUserId;
  const ownsTargetProfile =
    typeof actorProfile.profileId === "number" &&
    actorProfile.profileId > 0 &&
    actorProfile.profileId === normalizeInteger(existingComment?.profile_id ?? profileId);
  const canModerate = hasCommentModerationRole(actorProfile.roles);

  if (existingComment) {
    if (!isExistingOwnComment && !ownsTargetProfile && !canModerate) {
      return json({ error: "Comment update is not allowed for this actor." }, 403);
    }
  } else if (!isOwnComment) {
    return json({ error: "New comment author mismatch." }, 403);
  }

  const row = {
    id: commentId,
    profile_id: profileId,
    author_profile_id: authorProfileId,
    auth_user_id: actor.authUserId,
    firebase_author_uid: actor.firebaseUid,
    author_name: normalizeString((comment as JsonRecord).authorName, 96),
    author_photo_url: normalizeString((comment as JsonRecord).authorPhotoURL, 2048),
    author_accent_role: normalizeString((comment as JsonRecord).authorAccentRole, 64),
    message: typeof (comment as JsonRecord).message === "string"
      ? String((comment as JsonRecord).message).slice(0, 280)
      : "",
    media_url: normalizeString((comment as JsonRecord).mediaURL, 4096),
    media_type: normalizeString((comment as JsonRecord).mediaType, 64),
    media_path: normalizeString((comment as JsonRecord).mediaPath, 512),
    media_size: normalizeInteger((comment as JsonRecord).mediaSize),
    created_at: normalizeIsoString((comment as JsonRecord).createdAt) ?? nowIso(),
    updated_at: normalizeIsoString((comment as JsonRecord).updatedAt) ?? nowIso(),
  };

  const { error } = await supabaseAdmin.from("profile_comments").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }

  return json({ ok: true, action: "upsert_comment", commentId });
};

const handleCommentDelete = async (actor: RequestActor, body: JsonRecord) => {
  const commentId = normalizeString(body.commentId, 128);

  if (!commentId) {
    return json({ error: "Comment id is required." }, 400);
  }

  const actorProfile = await loadActorProfile(actor);
  const { data: existingComment, error: existingCommentError } = await supabaseAdmin
    .from("profile_comments")
    .select("id,firebase_author_uid,auth_user_id,profile_id")
    .eq("id", commentId)
    .maybeSingle();

  if (existingCommentError) {
    throw existingCommentError;
  }

  if (!existingComment) {
    return json({ ok: true, action: "delete_comment", commentId, deleted: false });
  }

  const isAuthor =
    existingComment.firebase_author_uid === actor.firebaseUid ||
    existingComment.auth_user_id === actor.authUserId;
  const ownsTargetProfile =
    typeof actorProfile.profileId === "number" &&
    actorProfile.profileId > 0 &&
    actorProfile.profileId === normalizeInteger(existingComment.profile_id);
  const canModerate = hasCommentModerationRole(actorProfile.roles);

  if (!isAuthor && !ownsTargetProfile && !canModerate) {
    return json({ error: "Comment delete is not allowed for this actor." }, 403);
  }

  const { error } = await supabaseAdmin.from("profile_comments").delete().eq("id", commentId);

  if (error) {
    throw error;
  }

  return json({ ok: true, action: "delete_comment", commentId, deleted: true });
};

const handleCreateSignedUploadUrl = async (actor: RequestActor, body: JsonRecord) => {
  const bucket = normalizeBucketName(body.bucket);
  const actorProfile = await loadActorProfile(actor);
  const actorUid =
    actor.firebaseUid ?? actor.authUserId ?? actorProfile.firebaseUid ?? actorProfile.authUserId;

  if (!actorUid) {
    return json({ error: "Storage action is not allowed for this actor." }, 403);
  }

  const authorization = await authorizeStorageObjectPath(
    actorUid,
    actorProfile,
    String(body.objectPath ?? ""),
  );

  if (!authorization.ok || !authorization.path) {
    return json({ error: authorization.error ?? "Storage upload is not allowed." }, 403);
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(authorization.path);

  if (error) {
    throw error;
  }

  return json({
    ok: true,
    action: "create_signed_upload_url",
    bucket,
    path: data?.path ?? authorization.path,
    token: typeof data?.token === "string" ? data.token : null,
  });
};

const handleDeleteStorageObject = async (actor: RequestActor, body: JsonRecord) => {
  const bucket = normalizeBucketName(body.bucket);
  const actorProfile = await loadActorProfile(actor);
  const actorUid =
    actor.firebaseUid ?? actor.authUserId ?? actorProfile.firebaseUid ?? actorProfile.authUserId;

  if (!actorUid) {
    return json({ error: "Storage action is not allowed for this actor." }, 403);
  }

  const authorization = await authorizeStorageObjectPath(
    actorUid,
    actorProfile,
    String(body.objectPath ?? ""),
  );

  if (!authorization.ok || !authorization.path) {
    return json({ error: authorization.error ?? "Storage delete is not allowed." }, 403);
  }

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([authorization.path]);

  if (error) {
    throw error;
  }

  return json({
    ok: true,
    action: "delete_storage_object",
    bucket,
    path: authorization.path,
  });
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const token = getBearerToken(request);

    if (!token) {
      return json({ error: "Missing bearer token." }, 401);
    }

    let actor: RequestActor;

    try {
      actor = await verifyRequestActor(token);
    } catch (_error) {
      return json({ error: "Invalid or expired bearer token." }, 401);
    }

    const body = (await request.json()) as JsonRecord;
    const action = normalizeString(body.action, 64);

    switch (action) {
      case "upsert_profile":
        if (!actor.firebaseUid) {
          return json({ error: "upsert_profile requires a Firebase actor." }, 403);
        }
        return await handleProfileUpsert(actor.firebaseUid, body);
      case "ensure_supabase_password_user":
        return await handleEnsureSupabasePasswordUser(actor, body);
      case "delete_profile_account_data":
        return await handleDeleteProfileAccountData(actor);
      case "admin_delete_profile_account_data":
        return await handleAdminDeleteProfileAccountData(actor, body);
      case "admin_set_profile_email_verification":
        return await handleAdminSetProfileEmailVerification(actor, body);
      case "get_private_profile_fields":
        return await handleGetPrivateProfileFields(actor, body);
      case "upsert_presence":
        return await handlePresenceUpsert(actor, body);
      case "upsert_comment":
        return await handleCommentUpsert(actor, body);
      case "delete_comment":
        return await handleCommentDelete(actor, body);
      case "create_signed_upload_url":
        return await handleCreateSignedUploadUrl(actor, body);
      case "delete_storage_object":
        return await handleDeleteStorageObject(actor, body);
      default:
        return json({ error: "Unsupported action." }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected firebase-sync failure.";
    console.error("firebase-sync failed:", error);
    return json({ error: message }, 500);
  }
});
