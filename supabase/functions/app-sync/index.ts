import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseStorageBucket = Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "comment-media";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing required env for app-sync function. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type JsonRecord = Record<string, unknown>;

type RequestActor = {
  uid: string;
  authUserId: string;
  email: string | null;
  emailVerified: boolean;
};

type ActorProfile = {
  profileId: number | null;
  roles: string[];
  authUserId: string | null;
  email: string | null;
  emailVerified: boolean | null;
  verificationRequired: boolean | null;
  providerIds: string[];
  displayName: string | null;
  avatarPath: string | null;
};

const PROFILE_SELECT =
  "profile_id,roles,auth_user_id,email,email_verified,verification_required,provider_ids,display_name,avatar_path";

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

const normalizeIsoString = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsedValue = Date.parse(value);
  return Number.isFinite(parsedValue) ? new Date(parsedValue).toISOString() : null;
};

const normalizeStringArray = (value: unknown, maxItems = 16) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

const normalizeBucketName = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, 128)
    : supabaseStorageBucket;

const normalizeStorageObjectPath = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? value.trim().replace(/^\/+/, "").slice(0, 1024)
    : null;

const emptyActorProfile = (): ActorProfile => ({
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

const toActorProfile = (data: Record<string, unknown> | null | undefined): ActorProfile => {
  if (!data || typeof data !== "object") {
    return emptyActorProfile();
  }

  return {
    profileId: normalizeInteger(data.profile_id),
    roles: normalizeStringArray(data.roles),
    authUserId: normalizeString(data.auth_user_id, 128),
    email: normalizeString(data.email, 320),
    emailVerified: typeof data.email_verified === "boolean" ? data.email_verified : null,
    verificationRequired:
      typeof data.verification_required === "boolean" ? data.verification_required : null,
    providerIds: normalizeStringArray(data.provider_ids),
    displayName: normalizeString(data.display_name, 96),
    avatarPath: normalizeStorageObjectPath(data.avatar_path),
  };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

const isMissingAuthUserError = (error: unknown) =>
  /user not found|not found/i.test(getErrorMessage(error));

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const hasRole = (roles: string[], expectedRole: string) =>
  roles.some((role) => role === expectedRole);

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

const canManageRoles = (roles: string[]) =>
  roles.some((role) => ["root", "co-owner"].includes(role));

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

const verifySupabaseAccessToken = async (token: string): Promise<RequestActor> => {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.id) {
    throw error ?? new Error("Supabase token is invalid.");
  }

  return {
    uid: data.user.id,
    authUserId: data.user.id,
    email: typeof data.user.email === "string" ? data.user.email : null,
    emailVerified: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
  };
};

const loadProfileByAuthUserId = async (authUserId: string) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
};

const loadProfileByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_SELECT)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
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

const loadActorProfile = async (actor: RequestActor): Promise<ActorProfile> => {
  const authUserId = normalizeString(actor.authUserId, 128);
  const email = normalizeString(actor.email, 320);

  if (!authUserId && !email) {
    return emptyActorProfile();
  }

  if (authUserId) {
    const authMatchedProfile = await loadProfileByAuthUserId(authUserId);

    if (authMatchedProfile) {
      return toActorProfile(authMatchedProfile);
    }
  }

  if (!email) {
    return emptyActorProfile();
  }

  const emailMatchedProfile = await loadProfileByEmail(email);

  if (!emailMatchedProfile) {
    return emptyActorProfile();
  }

  const matchedProfile = toActorProfile(emailMatchedProfile);

  if (
    authUserId &&
    matchedProfile.profileId &&
    matchedProfile.profileId > 0 &&
    !matchedProfile.authUserId
  ) {
    await linkProfileToSupabaseAuthUser(matchedProfile.profileId, authUserId, email);
    return {
      ...matchedProfile,
      authUserId,
      email,
    };
  }

  return matchedProfile;
};

const loadProfileByProfileId = async (profileId: number): Promise<ActorProfile | null> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  return toActorProfile(data as Record<string, unknown>);
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

const deleteSupabaseStoragePaths = async (paths: string[]) => {
  const normalizedPaths = [
    ...new Set(
      paths
        .map((path) => normalizeStorageObjectPath(path))
        .filter((path): path is string => Boolean(path)),
    ),
  ];

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

const collectProfileMediaPaths = async (profile: ActorProfile) => {
  const mediaPaths = new Set<string>();

  if (profile.avatarPath) {
    mediaPaths.add(profile.avatarPath);
  }

  if (!profile.profileId || profile.profileId <= 0) {
    return [...mediaPaths];
  }

  const { data: commentRows, error } = await supabaseAdmin
    .from("profile_comments")
    .select("media_path")
    .or(`profile_id.eq.${profile.profileId},author_profile_id.eq.${profile.profileId}`);

  if (error) {
    throw error;
  }

  for (const row of Array.isArray(commentRows) ? commentRows : []) {
    const mediaPath = normalizeStorageObjectPath(row?.media_path);

    if (mediaPath) {
      mediaPaths.add(mediaPath);
    }
  }

  return [...mediaPaths];
};

const deleteProfileRows = async (profileId: number | null) => {
  if (!profileId || profileId <= 0) {
    return;
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
};

const deleteSupabaseAuthUser = async (authUserId: string | null) => {
  if (!authUserId) {
    return null;
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

  if (error && !isMissingAuthUserError(error)) {
    throw error;
  }

  return authUserId;
};

const resolveDeletableAuthUserId = async (
  profile: ActorProfile,
  fallbackAuthUserId: string | null,
  fallbackEmail: string | null,
) =>
  profile.authUserId ??
  fallbackAuthUserId ??
  (profile.email ? await findSupabaseAuthUserIdByEmail(profile.email) : null) ??
  (fallbackEmail ? await findSupabaseAuthUserIdByEmail(fallbackEmail) : null);

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
  const canModerate = hasCommentModerationRole(actorProfile.roles);

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
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (updateProfileError) {
    throw updateProfileError;
  }

  const updatedProfile =
    updatedProfileRow && typeof updatedProfileRow === "object"
      ? toActorProfile(updatedProfileRow as Record<string, unknown>)
      : targetProfile;

  const resolvedAuthUserId =
    updatedProfile.authUserId ??
    (updatedProfile.email ? await findSupabaseAuthUserIdByEmail(updatedProfile.email) : null);

  if (
    resolvedAuthUserId &&
    updatedProfile.profileId &&
    updatedProfile.profileId > 0 &&
    !updatedProfile.authUserId
  ) {
    await linkProfileToSupabaseAuthUser(
      updatedProfile.profileId,
      resolvedAuthUserId,
      updatedProfile.email,
    );
  }

  if (resolvedAuthUserId) {
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      resolvedAuthUserId,
      {
        email_confirm: requestedIsVerified,
      },
    );

    if (updateAuthError && !isMissingAuthUserError(updateAuthError)) {
      throw updateAuthError;
    }
  }

  return json({
    ok: true,
    action: "admin_set_profile_email_verification",
    profileId,
    updated: true,
    fields: {
      email: updatedProfile.email,
      emailVerified: requestedIsVerified,
      verificationRequired: !requestedIsVerified,
      providerIds: updatedProfile.providerIds,
    },
  });
};

const handleDeleteProfileAccountData = async (actor: RequestActor) => {
  const actorProfile = await loadActorProfile(actor);
  const mediaPaths = await collectProfileMediaPaths(actorProfile);

  await deleteProfileRows(actorProfile.profileId);
  await deleteSupabaseStoragePaths(mediaPaths);

  const deletedAuthUserId = await deleteSupabaseAuthUser(
    await resolveDeletableAuthUserId(actorProfile, actor.authUserId, actor.email),
  );

  return json({
    ok: true,
    action: "delete_profile_account_data",
    profileId: actorProfile.profileId,
    deletedAuthUserId,
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
    actorProfile.profileId === targetProfile.profileId ||
    (actorProfile.authUserId && targetProfile.authUserId === actorProfile.authUserId)
  ) {
    return json({ error: "Use the owner delete flow for your own account." }, 403);
  }

  const mediaPaths = await collectProfileMediaPaths(targetProfile);

  await deleteProfileRows(targetProfile.profileId);
  await deleteSupabaseStoragePaths(mediaPaths);

  const deletedAuthUserId = await deleteSupabaseAuthUser(
    await resolveDeletableAuthUserId(targetProfile, null, targetProfile.email),
  );

  return json({
    ok: true,
    action: "admin_delete_profile_account_data",
    deleted: true,
    profileId: targetProfile.profileId,
    deletedAuthUserId,
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

  return json({
    ok: true,
    action: "upsert_presence",
    profileId,
    authUserId: actor.authUserId,
  });
};

const handleCreateSignedUploadUrl = async (actor: RequestActor, body: JsonRecord) => {
  const bucket = normalizeBucketName(body.bucket);
  const actorProfile = await loadActorProfile(actor);
  const actorUid = actor.authUserId ?? actorProfile.authUserId ?? actor.uid;

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
  const actorUid = actor.authUserId ?? actorProfile.authUserId ?? actor.uid;

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
      actor = await verifySupabaseAccessToken(token);
    } catch {
      return json({ error: "Invalid or expired bearer token." }, 401);
    }

    const body = ((await request.json().catch(() => ({}))) ?? {}) as JsonRecord;
    const action = normalizeString(body.action, 64);

    switch (action) {
      case "delete_profile_account_data":
        return await handleDeleteProfileAccountData(actor);
      case "admin_delete_profile_account_data":
        return await handleAdminDeleteProfileAccountData(actor, body);
      case "admin_set_profile_email_verification":
        return await handleAdminSetProfileEmailVerification(actor, body);
      case "upsert_presence":
        return await handlePresenceUpsert(actor, body);
      case "create_signed_upload_url":
        return await handleCreateSignedUploadUrl(actor, body);
      case "delete_storage_object":
        return await handleDeleteStorageObject(actor, body);
      default:
        return json({ error: "Unsupported action." }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected app-sync failure.";
    console.error("app-sync failed:", error);
    return json({ error: message }, 500);
  }
});
