"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { AUTH_SNAPSHOT_CACHE_STORAGE_KEY } from "@/lib/auth-snapshot-cache";
import { createSupabasePresenceRuntime } from "./supabase-presence-runtime";
import { startSupabaseAuthRuntime } from "./supabase-auth-runtime";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PresenceStatus = "online" | "offline";

type VisitHistoryEntry = {
  timestamp: string;
  path: string;
  source: string;
  status: PresenceStatus;
};

type PresenceSnapshot = {
  status: PresenceStatus;
  isOnline: boolean;
  currentPath: string | null;
  lastSeenAt: string | null;
};

export type AppUserSnapshot = {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
  emailVerified?: boolean;
  verificationRequired?: boolean;
  verificationEmailSent?: boolean;
  login: string | null;
  displayName: string | null;
  profileId: number | null;
  photoURL: string | null;
  avatarPath?: string | null;
  avatarType?: string | null;
  avatarSize?: number | null;
  roles: string[];
  isBanned?: boolean;
  bannedAt?: string | null;
  providerIds: string[];
  creationTime: string | null;
  lastSignInTime: string | null;
  loginHistory: string[];
  visitHistory: VisitHistoryEntry[];
  presence: PresenceSnapshot | null;
};

export type ProfileComment = {
  id: string;
  profileId: number | null;
  authorUid: string | null;
  authorProfileId: number | null;
  authorName: string;
  authorPhotoURL: string | null;
  authorAccentRole: string | null;
  message: string;
  mediaURL?: string | null;
  mediaType?: string | null;
  mediaPath?: string | null;
  mediaSize?: number | null;
  createdAt: string | null;
  updatedAt?: string | null;
};

type PrivateProfileFields = {
  email: string | null;
  emailVerified: boolean | null;
  verificationRequired: boolean | null;
  providerIds: string[];
};

type CommentMediaPayload = {
  mediaURL: string;
  mediaType: string;
  mediaPath: string;
  mediaSize: number;
};

type AvatarUploadPayload = {
  photoURL: string;
  avatarType: string;
  avatarPath: string;
  avatarSize: number;
};

type AppAuthBridge = {
  login: (identifier: string, password: string) => Promise<AppUserSnapshot | null>;
  loginWithGoogle: () => Promise<AppUserSnapshot | null>;
  completeGoogleAccount: (credentials: {
    login: string;
    displayName?: string;
    password: string;
  }) => Promise<AppUserSnapshot | null>;
  register: (credentials: {
    login: string;
    displayName?: string;
    email: string;
    password: string;
  }) => Promise<AppUserSnapshot | null>;
  resendVerificationEmail: () => Promise<AppUserSnapshot | null>;
  refreshVerificationStatus: () => Promise<AppUserSnapshot | null>;
  getProfileById: (profileId: number) => Promise<AppUserSnapshot | null>;
  refreshProfileById: (profileId: number) => Promise<AppUserSnapshot | null>;
  getProfileByAuthorName: (authorName: string) => Promise<AppUserSnapshot | null>;
  getProfilesByLoginPrefix: (loginPrefix: string) => Promise<AppUserSnapshot[]>;
  getProfileComments: (profileId: number) => Promise<ProfileComment[]>;
  isCommentMediaPathReferenced: (mediaPath: string) => Promise<boolean>;
  addProfileComment: (
    profileId: number,
    message: string,
    media?: File | CommentMediaPayload | null,
  ) => Promise<ProfileComment>;
  updateProfileComment: (
    commentId: string,
    message: string,
    media?: File | CommentMediaPayload | null,
    removeMedia?: boolean,
  ) => Promise<ProfileComment | null>;
  deleteProfileComment: (commentId: string) => Promise<string | null>;
  updateDisplayName: (displayName: string) => Promise<AppUserSnapshot | null>;
  updateUsername: (username: string, currentPassword?: string) => Promise<AppUserSnapshot | null>;
  adminUpdateProfileDisplayName: (
    profileId: number,
    displayName: string,
  ) => Promise<AppUserSnapshot | null>;
  adminUpdateProfileLogin: (profileId: number, login: string) => Promise<AppUserSnapshot | null>;
  adminSetProfileBan: (profileId: number, isBanned: boolean) => Promise<AppUserSnapshot | null>;
  adminSetProfileEmailVerification: (
    profileId: number,
    isVerified: boolean,
  ) => Promise<AppUserSnapshot | null>;
  getAdminPrivateProfileFields: (profileId: number) => Promise<PrivateProfileFields | null>;
  adminDeleteAccount: (profileId: number) => Promise<null>;
  updateProfileRoles: (profileId: number, roles: string[]) => Promise<AppUserSnapshot | null>;
  updateAvatar: (file: File | AvatarUploadPayload) => Promise<AppUserSnapshot | null>;
  deleteAvatar: () => Promise<AppUserSnapshot | null>;
  adminUpdateProfileAvatar: (
    profileId: number,
    file: File | AvatarUploadPayload,
  ) => Promise<AppUserSnapshot | null>;
  adminDeleteProfileAvatar: (profileId: number) => Promise<AppUserSnapshot | null>;
  deleteAccount: () => Promise<null>;
  getAuthToken: () => Promise<string | null>;
  syncPresence: (options?: {
    path?: string;
    source?: string;
    forceVisit?: boolean;
  }) => Promise<AppUserSnapshot | null>;
  getSiteOnlineCount: () => Promise<number>;
  getSiteOnlineUsers: () => Promise<
    {
      uid: string | null;
      profileId: number | null;
      displayName: string | null;
      login: string | null;
      photoURL: string | null;
      accentRole?: string | null;
      presence?: { lastSeenAt: string | null } | null;
    }[]
  >;
  logout: () => Promise<void>;
  onAuthStateChanged: (callback: (user: AppUserSnapshot | null) => void) => () => void;
};

type SupabaseAppRuntimeWindow = Window & {
  sakuraAppAuth?: AppAuthBridge;
  sakuraAppAuthError?: string | null;
  sakuraAppAuthReady?: boolean;
  sakuraCurrentUserSnapshot?: AppUserSnapshot | null;
  sakuraAuthStateSettled?: boolean;
  sakuraStartSupabaseApp?: () => Promise<unknown> | unknown;
  sakuraSupabaseAppRuntimePromise?: Promise<AppAuthBridge | null> | null;
  sakuraPresenceRuntime?: ReturnType<typeof createSupabasePresenceRuntime>;
  sakuraSupabaseCurrentSession?: Session | null;
};

type SupabaseRow = Record<string, unknown>;

type SupabaseProfileRow = SupabaseRow & {
  auth_user_id?: unknown;
  firebase_uid?: unknown;
  profile_id?: unknown;
  email?: unknown;
  email_verified?: unknown;
  verification_required?: unknown;
  verification_email_sent?: unknown;
  login?: unknown;
  display_name?: unknown;
  photo_url?: unknown;
  avatar_path?: unknown;
  avatar_type?: unknown;
  avatar_size?: unknown;
  roles?: unknown;
  is_banned?: unknown;
  banned_at?: unknown;
  provider_ids?: unknown;
  login_history?: unknown;
  visit_history?: unknown;
  created_at?: unknown;
  last_sign_in_at?: unknown;
};

type SupabasePresenceRow = SupabaseRow & {
  profile_id?: unknown;
  status?: unknown;
  is_online?: unknown;
  current_path?: unknown;
  last_seen_at?: unknown;
};

type SupabaseCommentRow = SupabaseRow & {
  id?: unknown;
  profile_id?: unknown;
  author_profile_id?: unknown;
  auth_user_id?: unknown;
  firebase_author_uid?: unknown;
  author_name?: unknown;
  author_photo_url?: unknown;
  author_accent_role?: unknown;
  message?: unknown;
  media_url?: unknown;
  media_type?: unknown;
  media_path?: unknown;
  media_size?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
const USER_UPDATE_EVENT = "sakura-user-update";
const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
const SUPABASE_PROFILE_SELECT = [
  "auth_user_id",
  "firebase_uid",
  "profile_id",
  "email",
  "email_verified",
  "verification_required",
  "verification_email_sent",
  "login",
  "display_name",
  "photo_url",
  "avatar_path",
  "avatar_type",
  "avatar_size",
  "roles",
  "is_banned",
  "banned_at",
  "provider_ids",
  "login_history",
  "visit_history",
  "created_at",
  "last_sign_in_at",
].join(",");
const SUPABASE_PROFILE_PRESENCE_SELECT = [
  "profile_id",
  "status",
  "is_online",
  "current_path",
  "last_seen_at",
].join(",");
const SUPABASE_PROFILE_COMMENT_SELECT = [
  "id",
  "profile_id",
  "author_profile_id",
  "auth_user_id",
  "firebase_author_uid",
  "author_name",
  "author_photo_url",
  "author_accent_role",
  "message",
  "media_url",
  "media_type",
  "media_path",
  "media_size",
  "created_at",
  "updated_at",
].join(",");
const PROFILE_RUNTIME_CACHE_TTL_MS = 15_000;
const PROFILE_BY_PREFIX_CACHE_TTL_MS = 8_000;

const getRuntimeWindow = () => window as SupabaseAppRuntimeWindow;
const readCurrentLocationPath = () => `${window.location.pathname}${window.location.search}`;
const runtimeProfileByIdCache = new Map<string, { value: AppUserSnapshot; expiresAt: number }>();
const runtimeProfileByAuthorCache = new Map<string, { value: AppUserSnapshot; expiresAt: number }>();
const runtimeProfilesByPrefixCache = new Map<string, { value: AppUserSnapshot[]; expiresAt: number }>();
const runtimeAuthListeners = new Set<(user: AppUserSnapshot | null) => void>();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const supabaseRestUrl = supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/rest/v1` : "";
const normalizeSupabaseSyncFunctionUrl = (value: string) =>
  value.trim().replace(/\/+$/, "").replace(/\/firebase-sync$/i, "/app-sync");

const supabaseSyncFunctionUrl = (() => {
  const explicitUrl = process.env.NEXT_PUBLIC_SUPABASE_SYNC_FUNCTION_URL?.trim() ?? "";

  if (explicitUrl) {
    return normalizeSupabaseSyncFunctionUrl(explicitUrl);
  }

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

const waitForDelay = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.max(0, delayMs));
  });

const createAppError = (code: string, message: string) => {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
};

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

const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeProviderToken = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "google") {
    return "google.com";
  }

  if (normalizedValue === "email") {
    return "password";
  }

  return normalizedValue;
};

const normalizeProviderIds = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(
        value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => normalizeProviderToken(entry))
          .filter(Boolean),
      )]
    : [];

const normalizeProviderIdsFromUser = (user: User | null) => {
  if (!user) {
    return [];
  }

  const providers = new Set<string>();

  if (Array.isArray(user.identities)) {
    user.identities.forEach((identity) => {
      if (typeof identity?.provider === "string" && identity.provider.trim()) {
        providers.add(normalizeProviderToken(identity.provider));
      }
    });
  }

  const appMetadataProviders = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : [];

  appMetadataProviders.forEach((provider) => {
    if (typeof provider === "string" && provider.trim()) {
      providers.add(normalizeProviderToken(provider));
    }
  });

  if (typeof user.app_metadata?.provider === "string" && user.app_metadata.provider.trim()) {
    providers.add(normalizeProviderToken(user.app_metadata.provider));
  }

  return [...providers];
};

const mergeProviderIds = (...sources: unknown[]) => {
  const providers = new Set<string>();

  sources.forEach((source) => {
    normalizeProviderIds(source).forEach((provider) => {
      providers.add(provider);
    });
  });

  return [...providers];
};

const normalizeLogin = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeProfileAuthorLookup = (value: string | null | undefined) =>
  typeof value === "string"
    ? value.trim().replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase()
    : "";

const normalizeRoles = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(
        value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean),
      )]
    : [];

const normalizeVisitHistory = (value: unknown): VisitHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const status = record.status === "online" ? "online" : "offline";
      const timestamp =
        typeof record.timestamp === "string" && record.timestamp
          ? record.timestamp
          : null;
      const path =
        typeof record.path === "string" && record.path ? record.path : null;
      const source =
        typeof record.source === "string" && record.source ? record.source : "activity";

      if (!timestamp || !path) {
        return null;
      }

      return {
        timestamp,
        path,
        source,
        status,
      } satisfies VisitHistoryEntry;
    })
    .filter((entry): entry is VisitHistoryEntry => Boolean(entry));
};

const normalizePresence = (
  value: unknown,
  fallbackPath: string | null = null,
): PresenceSnapshot | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const status = payload.status === "online" ? "online" : "offline";
  const currentPath =
    typeof payload.currentPath === "string" && payload.currentPath
      ? payload.currentPath
      : typeof payload.current_path === "string" && payload.current_path
        ? payload.current_path
        : fallbackPath;
  const lastSeenAt =
    typeof payload.lastSeenAt === "string" && payload.lastSeenAt
      ? payload.lastSeenAt
      : typeof payload.last_seen_at === "string" && payload.last_seen_at
        ? payload.last_seen_at
        : null;

  return {
    status,
    isOnline:
      payload.isOnline === true ||
      payload.is_online === true ||
      status === "online",
    currentPath,
    lastSeenAt,
  };
};

const normalizePresenceFromRow = (
  row: SupabasePresenceRow | null,
  fallbackPath: string | null = null,
) =>
  row
    ? normalizePresence(
        {
          status: row.status,
          is_online: row.is_online,
          current_path: row.current_path,
          last_seen_at: row.last_seen_at,
        },
        fallbackPath,
      )
    : null;

const pickCommentAccentRole = (roles: unknown[]) => {
  const normalizedRoles = normalizeRoles(roles);
  const priorityOrder = [
    "banned",
    "root",
    "co-owner",
    "super administrator",
    "administrator",
    "moderator",
    "support",
    "sponsor",
    "tester",
    "user",
  ];

  return (
    priorityOrder.find((role) => normalizedRoles.includes(role)) ??
    normalizedRoles[0] ??
    null
  );
};

const canManageRoles = (roles: unknown[]) => {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.includes("root") || normalizedRoles.includes("co-owner");
};

const sanitizeDisplayName = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 96) : "";

const sanitizeLogin = (value: string | null | undefined) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, "").replace(/[^A-Za-zА-Яа-яЁё0-9._-]+/g, "").slice(0, 24)
    : "";

const buildSupabaseRestUrl = (
  table: string,
  query: Record<string, unknown> = {},
) => {
  const url = new URL(`${supabaseRestUrl}/${table}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const buildSupabaseRpcUrl = (functionName: string) => `${supabaseRestUrl}/rpc/${functionName}`;

const readCacheEntry = <TValue>(
  cache: Map<string, { value: TValue; expiresAt: number }>,
  key: string,
) => {
  const entry = cache.get(key);

  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const writeCacheEntry = <TValue>(
  cache: Map<string, { value: TValue; expiresAt: number }>,
  key: string,
  value: TValue,
  ttlMs: number,
) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
};

const cacheResolvedProfileSnapshot = (snapshot: AppUserSnapshot | null) => {
  if (!snapshot || snapshot.isAnonymous) {
    return snapshot;
  }

  if (typeof snapshot.profileId === "number" && snapshot.profileId > 0) {
    writeCacheEntry(
      runtimeProfileByIdCache,
      String(snapshot.profileId),
      snapshot,
      PROFILE_RUNTIME_CACHE_TTL_MS,
    );
  }

  const normalizedLogin = normalizeLogin(snapshot.login);
  const normalizedDisplayName = normalizeProfileAuthorLookup(snapshot.displayName);

  if (normalizedLogin) {
    writeCacheEntry(
      runtimeProfileByAuthorCache,
      normalizedLogin,
      snapshot,
      PROFILE_RUNTIME_CACHE_TTL_MS,
    );
  }

  if (normalizedDisplayName) {
    writeCacheEntry(
      runtimeProfileByAuthorCache,
      normalizedDisplayName,
      snapshot,
      PROFILE_RUNTIME_CACHE_TTL_MS,
    );
  }

  return snapshot;
};

const persistCachedAuthSnapshot = (snapshot: AppUserSnapshot | null) => {
  try {
    if (snapshot?.uid && !snapshot.isAnonymous) {
      window.localStorage.setItem(
        AUTH_SNAPSHOT_CACHE_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
      return;
    }

    window.localStorage.removeItem(AUTH_SNAPSHOT_CACHE_STORAGE_KEY);
  } catch {}
};

const writeCurrentProfileId = (profileId: number | null | undefined) => {
  try {
    if (typeof profileId === "number" && profileId > 0) {
      window.sessionStorage.setItem(CURRENT_PROFILE_ID_STORAGE_KEY, String(profileId));
      return;
    }

    window.sessionStorage.removeItem(CURRENT_PROFILE_ID_STORAGE_KEY);
  } catch {}
};

const publishUserSnapshot = (snapshot: AppUserSnapshot | null) => {
  const runtime = getRuntimeWindow();
  runtime.sakuraCurrentUserSnapshot = snapshot;
  cacheResolvedProfileSnapshot(snapshot);
  persistCachedAuthSnapshot(snapshot);
  writeCurrentProfileId(snapshot?.profileId ?? null);

  runtimeAuthListeners.forEach((callback) => {
    try {
      callback(snapshot);
    } catch {}
  });

  runtime.dispatchEvent(
    new CustomEvent(USER_UPDATE_EVENT, {
      detail: snapshot,
    }),
  );

  return snapshot;
};

const emitAuthError = (message: string) => {
  const runtime = getRuntimeWindow();
  runtime.sakuraAppAuthError = message;
  runtime.dispatchEvent(
    new CustomEvent(AUTH_ERROR_EVENT, {
      detail: message,
    }),
  );
};

const clearAuthError = () => {
  const runtime = getRuntimeWindow();
  runtime.sakuraAppAuthError = null;
};

const markAuthStateSettled = () => {
  const runtime = getRuntimeWindow();
  runtime.sakuraAuthStateSettled = true;
  runtime.dispatchEvent(new CustomEvent(AUTH_STATE_SETTLED_EVENT));
};

const markAuthStatePending = () => {
  const runtime = getRuntimeWindow();
  runtime.sakuraAuthStateSettled = false;
};

const mapSupabaseProfilePayloadToSnapshot = (
  payload: Record<string, unknown> | null,
  options: {
    fallbackUser?: User | null;
    fallbackPresence?: PresenceSnapshot | null;
    verificationEmailSent?: boolean;
  } = {},
): AppUserSnapshot | null => {
  const fallbackUser = options.fallbackUser ?? null;

  if (!payload && !fallbackUser?.id) {
    return null;
  }

  const providerIds = mergeProviderIds(
    payload?.providerIds,
    normalizeProviderIdsFromUser(fallbackUser),
  );
  const emailVerifiedFromUser = Boolean(
    fallbackUser?.email_confirmed_at || fallbackUser?.confirmed_at,
  );
  const emailVerified =
    typeof payload?.emailVerified === "boolean"
      ? payload.emailVerified
      : emailVerifiedFromUser || providerIds.includes("google.com");
  const verificationRequired =
    typeof payload?.verificationRequired === "boolean"
      ? payload.verificationRequired
      : !emailVerified;
  const login = normalizeString(payload?.login);
  const displayName =
    normalizeString(payload?.displayName) ??
    normalizeString(fallbackUser?.user_metadata?.display_name) ??
    normalizeString(fallbackUser?.user_metadata?.full_name) ??
    normalizeString(fallbackUser?.user_metadata?.name) ??
    login ??
    normalizeString(fallbackUser?.email?.split("@")[0] ?? null);

  return {
    uid:
      normalizeString(payload?.authUserId) ??
      normalizeString(payload?.firebaseUid) ??
      fallbackUser?.id ??
      "",
    isAnonymous: false,
    email: normalizeString(payload?.email) ?? fallbackUser?.email ?? null,
    emailVerified,
    verificationRequired,
    verificationEmailSent: options.verificationEmailSent ?? Boolean(payload?.verificationEmailSent),
    login,
    displayName,
    profileId: normalizeInteger(payload?.profileId),
    photoURL:
      normalizeString(payload?.photoURL) ??
      normalizeString(fallbackUser?.user_metadata?.avatar_url) ??
      normalizeString(fallbackUser?.user_metadata?.picture),
    avatarPath: normalizeString(payload?.avatarPath),
    avatarType: normalizeString(payload?.avatarType),
    avatarSize: normalizeInteger(payload?.avatarSize),
    roles: normalizeRoles(payload?.roles).length ? normalizeRoles(payload?.roles) : ["user"],
    isBanned: payload?.isBanned === true,
    bannedAt: normalizeString(payload?.bannedAt),
    providerIds,
    creationTime:
      normalizeString(payload?.creationTime) ??
      (typeof fallbackUser?.created_at === "string" ? fallbackUser.created_at : null),
    lastSignInTime:
      normalizeString(payload?.lastSignInTime) ??
      (typeof fallbackUser?.last_sign_in_at === "string" ? fallbackUser.last_sign_in_at : null),
    loginHistory:
      Array.isArray(payload?.loginHistory)
        ? payload.loginHistory.filter((entry): entry is string => typeof entry === "string")
        : [],
    visitHistory: normalizeVisitHistory(payload?.visitHistory),
    presence:
      normalizePresence(payload?.presence, readCurrentLocationPath()) ??
      options.fallbackPresence ??
      null,
  };
};

const mapSupabaseProfileRowToSnapshot = (
  row: SupabaseProfileRow | null,
  presenceRow: SupabasePresenceRow | null,
) =>
  row
    ? cacheResolvedProfileSnapshot({
        uid:
          normalizeString(row.auth_user_id) ??
          normalizeString(row.firebase_uid) ??
          "",
        isAnonymous: false,
        email: normalizeString(row.email),
        emailVerified:
          typeof row.email_verified === "boolean"
            ? row.email_verified
            : normalizeProviderIds(row.provider_ids).includes("google.com"),
        verificationRequired:
          typeof row.verification_required === "boolean"
            ? row.verification_required
            : !normalizeProviderIds(row.provider_ids).includes("google.com"),
        verificationEmailSent: row.verification_email_sent === true,
        login: normalizeString(row.login),
        displayName: normalizeString(row.display_name),
        profileId: normalizeInteger(row.profile_id),
        photoURL: normalizeString(row.photo_url),
        avatarPath: normalizeString(row.avatar_path),
        avatarType: normalizeString(row.avatar_type),
        avatarSize: normalizeInteger(row.avatar_size),
        roles: normalizeRoles(row.roles).length ? normalizeRoles(row.roles) : ["user"],
        isBanned: row.is_banned === true,
        bannedAt: normalizeString(row.banned_at),
        providerIds: normalizeProviderIds(row.provider_ids),
        creationTime: normalizeString(row.created_at),
        lastSignInTime: normalizeString(row.last_sign_in_at),
        loginHistory: Array.isArray(row.login_history)
          ? row.login_history.filter((entry): entry is string => typeof entry === "string")
          : [],
        visitHistory: normalizeVisitHistory(row.visit_history),
        presence: normalizePresenceFromRow(presenceRow, null),
      })
    : null;

const mapSupabaseCommentRowToComment = (row: SupabaseCommentRow | null): ProfileComment | null => {
  if (!row || typeof row.id !== "string" || !row.id) {
    return null;
  }

  return {
    id: row.id,
    profileId: normalizeInteger(row.profile_id),
    authorUid:
      normalizeString(row.auth_user_id) ??
      normalizeString(row.firebase_author_uid),
    authorProfileId: normalizeInteger(row.author_profile_id),
    authorName:
      normalizeString(row.author_name) ??
      (typeof row.author_profile_id === "number" ? `Profile #${row.author_profile_id}` : "Member"),
    authorPhotoURL: normalizeString(row.author_photo_url),
    authorAccentRole: normalizeString(row.author_accent_role),
    message: typeof row.message === "string" ? row.message : "",
    mediaURL: normalizeString(row.media_url),
    mediaType: normalizeString(row.media_type),
    mediaPath: normalizeString(row.media_path),
    mediaSize: normalizeInteger(row.media_size),
    createdAt: normalizeString(row.created_at),
    updatedAt: normalizeString(row.updated_at),
  };
};

const sortProfileComments = (comments: ProfileComment[]) =>
  [...comments].sort((left, right) => {
    const leftValue = left.createdAt ? Date.parse(left.createdAt) : Number.NaN;
    const rightValue = right.createdAt ? Date.parse(right.createdAt) : Number.NaN;

    if (Number.isFinite(leftValue) && Number.isFinite(rightValue) && leftValue !== rightValue) {
      return rightValue - leftValue;
    }

    return right.id.localeCompare(left.id);
  });

const normalizeRpcError = (payload: Record<string, unknown> | null, fallbackMessage: string) => {
  const message =
    typeof payload?.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : typeof payload?.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : fallbackMessage;

  if (message === "Authentication required." || message === "Actor profile not found.") {
    return createAppError("auth/no-current-user", "Sign in again to continue.");
  }

  if (message === "Login already in use.") {
    return createAppError("auth/login-already-in-use", "This login is already taken.");
  }

  if (
    message === "Enter a login." ||
    message ===
      "Login must be 3-24 characters long and only contain letters, numbers, dots, underscores, or hyphens."
  ) {
    return createAppError(
      "auth/invalid-login",
      "Username must be 3-24 characters and only contain letters, numbers, dots, underscores, or hyphens.",
    );
  }

  if (message === "Display name is required.") {
    return createAppError("display-name/empty", "Enter a profile name.");
  }

  if (message === "Comment id is invalid.") {
    return createAppError("comments/invalid-id", "Comment id is invalid.");
  }

  if (
    message === "Write a comment or attach media before sending." ||
    message === "Write a comment or attach media before saving."
  ) {
    return createAppError("comments/empty-message", message);
  }

  if (message === "Only the author, root, or co-owner can edit this comment.") {
    return createAppError("comments/update-forbidden", message);
  }

  if (
    message ===
    "Only the author, profile owner, or comment moderator can delete this comment."
  ) {
    return createAppError("comments/delete-forbidden", message);
  }

  if (message === "Only root can assign the root role.") {
    return createAppError("roles/root-assignment-forbidden", message);
  }

  if (
    message === "Co-owner cannot manage root accounts." ||
    message === "Co-owner cannot manage a root account."
  ) {
    return createAppError("admin/root-target-forbidden", message);
  }

  if (message === "You cannot ban your own account.") {
    return createAppError("ban/self-forbidden", message);
  }

  if (message === "Only the owner or a manager can read private profile fields.") {
    return createAppError("admin/private-fields-forbidden", message);
  }

  return createAppError("supabase/rpc-failed", message);
};

const normalizeSupabaseAuthError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "Supabase auth request failed.";
  const normalizedMessage = message.toLowerCase();
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : null;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (code === "email_not_confirmed" || normalizedMessage.includes("email not confirmed")) {
    return createAppError(
      "auth/email-not-verified",
      "Подтвердите почту, прежде чем открывать профиль и использовать аккаунт.",
    );
  }

  if (
    code === "invalid_credentials" ||
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return createAppError("auth/invalid-credential", "Invalid email, login, or password.");
  }

  if (code === "email_address_invalid" || normalizedMessage.includes("invalid email")) {
    return createAppError("auth/invalid-email", "Enter a valid email address.");
  }

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already registered")
  ) {
    return createAppError("auth/email-already-in-use", "This email is already registered.");
  }

  if (normalizedMessage.includes("password should be at least")) {
    return createAppError("auth/weak-password", "Password should be at least 6 characters.");
  }

  if (status === 429 || normalizedMessage.includes("rate limit")) {
    return createAppError("auth/too-many-requests", "Too many auth attempts.");
  }

  if (error instanceof Error) {
    return error;
  }

  return createAppError("auth/internal-error", message);
};

const fetchSupabaseRows = async <TRow extends SupabaseRow>(
  table: string,
  query: Record<string, unknown> = {},
  options: { forceFresh?: boolean } = {},
) => {
  if (!isSupabaseConfigured || !supabaseRestUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const response = await fetch(buildSupabaseRestUrl(table, query), {
      cache: options.forceFresh ? "no-store" : "default",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Accept-Profile": "public",
        Accept: "application/json",
        ...(options.forceFresh
          ? {
              "Cache-Control": "no-cache, no-store, max-age=0",
              Pragma: "no-cache",
            }
          : {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return Array.isArray(payload) ? (payload as TRow[]) : null;
  } catch {
    return null;
  }
};

const ensureSupabaseClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw createAppError(
      "supabase/not-configured",
      "Supabase is not configured for this build.",
    );
  }

  return supabase as SupabaseClient;
};

const ensureSupabaseSession = async () => {
  await startSupabaseAuthRuntime();
  const client = ensureSupabaseClient();
  const runtime = getRuntimeWindow();

  if (runtime.sakuraSupabaseCurrentSession?.access_token) {
    return runtime.sakuraSupabaseCurrentSession;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw normalizeSupabaseAuthError(error);
  }

  return data.session ?? null;
};

const getSupabaseAccessToken = async () => {
  const session = await ensureSupabaseSession();
  return typeof session?.access_token === "string" && session.access_token
    ? session.access_token
    : null;
};

const callSupabaseAuthenticatedRpc = async <TResponse>(
  functionName: string,
  payload: Record<string, unknown>,
  fallbackMessage: string,
) => {
  const accessToken = await getSupabaseAccessToken();

  if (!accessToken || !supabaseAnonKey || !supabaseRestUrl) {
    throw createAppError("auth/no-current-user", "Sign in again to continue.");
  }

  const response = await fetch(buildSupabaseRpcUrl(functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Accept-Profile": "public",
      "Content-Profile": "public",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responsePayload = (await response.json().catch(() => null)) as TResponse | null;

  if (!response.ok) {
    throw normalizeRpcError(
      responsePayload && typeof responsePayload === "object"
        ? (responsePayload as Record<string, unknown>)
        : null,
      fallbackMessage,
    );
  }

  return responsePayload;
};

const callSupabaseSyncFunction = async <TResponse>(
  body: Record<string, unknown>,
) => {
  if (!supabaseSyncFunctionUrl) {
    throw createAppError(
      "supabase/function-unavailable",
      "Supabase sync function URL is not configured for this build.",
    );
  }

  const accessToken = await getSupabaseAccessToken();

  if (!accessToken) {
    throw createAppError("auth/no-current-user", "Sign in again to continue.");
  }

  const response = await fetch(supabaseSyncFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as TResponse | null;

  if (!response.ok) {
    throw normalizeRpcError(
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null,
      `Supabase function ${String(body.action ?? "request")} failed.`,
    );
  }

  return payload;
};

const resolveSigninEmailForLogin = async (login: string) => {
  if (!login || !supabaseRestUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const response = await fetch(buildSupabaseRpcUrl("resolve_signin_email_for_login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Accept-Profile": "public",
        "Content-Profile": "public",
        Accept: "application/json",
      },
      body: JSON.stringify({
        target_login: login,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    return typeof payload === "string" && payload.trim() ? payload.trim() : null;
  } catch {
    return null;
  }
};

const toPresenceUser = (user: User | null, snapshot: AppUserSnapshot | null) => {
  const uid = user?.id ?? snapshot?.uid ?? null;

  if (!uid) {
    return null;
  }

  return {
    uid,
    isAnonymous: false,
  };
};

const buildFallbackSnapshotFromUser = (
  user: User,
  options: {
    verificationEmailSent?: boolean;
    fallbackPresence?: PresenceSnapshot | null;
  } = {},
): AppUserSnapshot => {
  const providerIds = normalizeProviderIdsFromUser(user);
  const displayName =
    normalizeString(user.user_metadata?.display_name) ??
    normalizeString(user.user_metadata?.full_name) ??
    normalizeString(user.user_metadata?.name) ??
    normalizeString(user.email?.split("@")[0] ?? null);

  return {
    uid: user.id,
    isAnonymous: false,
    email: user.email ?? null,
    emailVerified:
      Boolean(user.email_confirmed_at || user.confirmed_at) ||
      providerIds.includes("google.com"),
    verificationRequired: !(
      Boolean(user.email_confirmed_at || user.confirmed_at) ||
      providerIds.includes("google.com")
    ),
    verificationEmailSent: options.verificationEmailSent ?? false,
    login:
      sanitizeLogin(
        typeof user.user_metadata?.login === "string"
          ? user.user_metadata.login
          : typeof user.user_metadata?.requested_login === "string"
            ? user.user_metadata.requested_login
            : null,
      ) || null,
    displayName,
    profileId: null,
    photoURL:
      normalizeString(user.user_metadata?.avatar_url) ??
      normalizeString(user.user_metadata?.picture),
    avatarPath: null,
    avatarType: null,
    avatarSize: null,
    roles: ["user"],
    isBanned: false,
    bannedAt: null,
    providerIds,
    creationTime: typeof user.created_at === "string" ? user.created_at : null,
    lastSignInTime: typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    loginHistory: [],
    visitHistory: [],
    presence: options.fallbackPresence ?? null,
  };
};

const loadCurrentAuthProfileFromRpc = async () => {
  const currentSession = await ensureSupabaseSession();
  const currentUser = currentSession?.user ?? null;

  if (!currentUser) {
    return null;
  }

  try {
    const response = await callSupabaseAuthenticatedRpc<Record<string, unknown>>(
      "get_current_auth_profile_rpc",
      {},
      "Profile record could not be loaded.",
    );

    return mapSupabaseProfilePayloadToSnapshot(response, {
      fallbackUser: currentUser,
      fallbackPresence: getRuntimeWindow().sakuraCurrentUserSnapshot?.presence ?? null,
    });
  } catch {
    return null;
  }
};

const loadCurrentAuthProfileFromRpcWithRetry = async (
  attempts = 5,
  delayMs = 180,
) => {
  for (let index = 0; index < attempts; index += 1) {
    const snapshot = await loadCurrentAuthProfileFromRpc();

    if (snapshot) {
      return snapshot;
    }

    if (index < attempts - 1) {
      await waitForDelay(delayMs);
    }
  }

  return null;
};

const enrichSnapshotWithPrivateFields = async (
  snapshot: AppUserSnapshot | null,
) => {
  if (!snapshot?.profileId) {
    return snapshot;
  }

  const currentSnapshot = getRuntimeWindow().sakuraCurrentUserSnapshot ?? null;
  const canReadPrivateFields =
    currentSnapshot?.profileId === snapshot.profileId ||
    canManageRoles(currentSnapshot?.roles ?? []);

  if (!canReadPrivateFields) {
    return snapshot;
  }

  try {
    const response = await callSupabaseAuthenticatedRpc<Record<string, unknown> | null>(
      "get_private_profile_fields_rpc",
      { target_profile_id: snapshot.profileId },
      "Private profile fields could not be loaded.",
    );

    if (!response) {
      return snapshot;
    }

    return {
      ...snapshot,
      email: snapshot.email ?? normalizeString(response.email),
      emailVerified:
        typeof snapshot.emailVerified === "boolean"
          ? snapshot.emailVerified
          : typeof response.emailVerified === "boolean"
            ? response.emailVerified
            : snapshot.emailVerified,
      verificationRequired:
        typeof snapshot.verificationRequired === "boolean"
          ? snapshot.verificationRequired
          : typeof response.verificationRequired === "boolean"
            ? response.verificationRequired
            : snapshot.verificationRequired,
      providerIds:
        snapshot.providerIds.length > 0
          ? snapshot.providerIds
          : normalizeProviderIds(response.providerIds),
    };
  } catch {
    return snapshot;
  }
};

const refreshCurrentUserSnapshot = async (
  options: {
    verificationEmailSent?: boolean;
    forceFresh?: boolean;
    fallbackPresence?: PresenceSnapshot | null;
  } = {},
) => {
  const client = ensureSupabaseClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();

  if (sessionError) {
    throw normalizeSupabaseAuthError(sessionError);
  }

  const session = sessionData.session ?? null;
  const sessionUser = session?.user ?? null;

  if (!sessionUser) {
    publishUserSnapshot(null);
    return null;
  }

  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) {
    throw normalizeSupabaseAuthError(userError);
  }

  const currentUser = userData.user ?? sessionUser;
  let snapshot = await loadCurrentAuthProfileFromRpcWithRetry(
    options.forceFresh ? 6 : 4,
    options.forceFresh ? 160 : 120,
  );

  if (!snapshot) {
    snapshot = buildFallbackSnapshotFromUser(currentUser, {
      verificationEmailSent: options.verificationEmailSent,
      fallbackPresence:
        options.fallbackPresence ??
        getRuntimeWindow().sakuraCurrentUserSnapshot?.presence ??
        null,
    });
  } else {
    snapshot = mapSupabaseProfilePayloadToSnapshot(snapshot, {
      fallbackUser: currentUser,
      verificationEmailSent: options.verificationEmailSent ?? snapshot.verificationEmailSent,
      fallbackPresence:
        options.fallbackPresence ??
        getRuntimeWindow().sakuraCurrentUserSnapshot?.presence ??
        null,
    });
  }

  snapshot = await enrichSnapshotWithPrivateFields(snapshot);

  if (snapshot?.isBanned) {
    const message = "This account has been banned by an administrator.";
    const runtime = getRuntimeWindow();

    if (runtime.sakuraPresenceRuntime) {
      runtime.sakuraPresenceRuntime.stopPresenceTracking();
    }

    try {
      await client.auth.signOut();
    } catch {}

    publishUserSnapshot(null);
    emitAuthError(message);
    throw createAppError("auth/account-banned", message);
  }

  return publishUserSnapshot(snapshot);
};

const getPublicProfileById = async (
  profileId: number,
  options: { forceFresh?: boolean } = {},
) => {
  const cachedValue =
    !options.forceFresh ? readCacheEntry(runtimeProfileByIdCache, String(profileId)) : null;

  if (cachedValue) {
    return cachedValue;
  }

  const [profileRows, presenceRows] = await Promise.all([
    fetchSupabaseRows<SupabaseProfileRow>(
      "public_profiles",
      {
        select: SUPABASE_PROFILE_SELECT,
        profile_id: `eq.${profileId}`,
        limit: 1,
      },
      options,
    ),
    fetchSupabaseRows<SupabasePresenceRow>(
      "public_profile_presence",
      {
        select: SUPABASE_PROFILE_PRESENCE_SELECT,
        profile_id: `eq.${profileId}`,
        limit: 1,
      },
      options,
    ),
  ]);

  const snapshot = mapSupabaseProfileRowToSnapshot(
    Array.isArray(profileRows) ? profileRows[0] ?? null : null,
    Array.isArray(presenceRows) ? presenceRows[0] ?? null : null,
  );

  return snapshot ? await enrichSnapshotWithPrivateFields(snapshot) : null;
};

const getPublicProfileByAuthorName = async (authorName: string) => {
  const normalizedAuthorName = normalizeProfileAuthorLookup(authorName);

  if (!normalizedAuthorName) {
    return null;
  }

  const cachedValue = readCacheEntry(runtimeProfileByAuthorCache, normalizedAuthorName);

  if (cachedValue) {
    return cachedValue;
  }

  const profileIdMatch = normalizedAuthorName.match(/^profile\s*#\s*(\d+)$/i);

  if (profileIdMatch) {
    return await getPublicProfileById(Number(profileIdMatch[1]));
  }

  const byLoginRows = await fetchSupabaseRows<SupabaseProfileRow>("public_profiles", {
    select: SUPABASE_PROFILE_SELECT,
    login: `ilike.${normalizedAuthorName}`,
    limit: 1,
  });

  if (Array.isArray(byLoginRows) && byLoginRows[0]) {
    return mapSupabaseProfileRowToSnapshot(byLoginRows[0], null);
  }

  const byDisplayNameRows = await fetchSupabaseRows<SupabaseProfileRow>("public_profiles", {
    select: SUPABASE_PROFILE_SELECT,
    display_name: `ilike.${normalizedAuthorName}`,
    limit: 1,
  });

  return Array.isArray(byDisplayNameRows) && byDisplayNameRows[0]
    ? mapSupabaseProfileRowToSnapshot(byDisplayNameRows[0], null)
    : null;
};

const getProfilesByLoginPrefix = async (loginPrefix: string) => {
  const normalizedPrefix = normalizeLogin(loginPrefix);

  if (!normalizedPrefix || normalizedPrefix.length < 2) {
    return [];
  }

  const cachedValue = readCacheEntry(runtimeProfilesByPrefixCache, normalizedPrefix);

  if (cachedValue) {
    return cachedValue;
  }

  const rows = await fetchSupabaseRows<SupabaseProfileRow>("public_profiles", {
    select: SUPABASE_PROFILE_SELECT,
    login: `ilike.${normalizedPrefix}*`,
    order: "profile_id.asc",
    limit: 8,
  });

  const profiles = Array.isArray(rows)
    ? rows
        .map((row) => mapSupabaseProfileRowToSnapshot(row, null))
        .filter((profile): profile is AppUserSnapshot => Boolean(profile))
        .filter(
          (profile, index, entries) =>
            Boolean(profile.login) &&
            normalizeLogin(profile.login).startsWith(normalizedPrefix) &&
            index === entries.findIndex((entry) => entry.uid === profile.uid),
        )
    : [];

  return writeCacheEntry(
    runtimeProfilesByPrefixCache,
    normalizedPrefix,
    profiles,
    PROFILE_BY_PREFIX_CACHE_TTL_MS,
  );
};

const getProfileComments = async (profileId: number) => {
  const rows = await fetchSupabaseRows<SupabaseCommentRow>("public_profile_comments", {
    select: SUPABASE_PROFILE_COMMENT_SELECT,
    profile_id: `eq.${profileId}`,
    order: "created_at.desc",
    limit: 200,
  });

  if (!Array.isArray(rows)) {
    return [];
  }

  return sortProfileComments(
    rows
      .map((row) => mapSupabaseCommentRowToComment(row))
      .filter((comment): comment is ProfileComment => Boolean(comment)),
  );
};

const isCommentMediaPathReferenced = async (mediaPath: string) => {
  const normalizedMediaPath = mediaPath.trim();

  if (!normalizedMediaPath) {
    return false;
  }

  const rows = await fetchSupabaseRows<SupabaseCommentRow>("public_profile_comments", {
    select: "id",
    media_path: `eq.${normalizedMediaPath}`,
    limit: 1,
  });

  return Array.isArray(rows) && rows.length > 0;
};

const coerceCommentMediaPayload = (media?: File | CommentMediaPayload | null) => {
  if (!media) {
    return null;
  }

  if (typeof File !== "undefined" && media instanceof File) {
    throw createAppError(
      "comments/media-invalid",
      "Upload the comment media to Supabase before saving the comment.",
    );
  }

  if (typeof media !== "object") {
    return null;
  }

  return {
    mediaURL: normalizeString((media as CommentMediaPayload).mediaURL),
    mediaType: normalizeString((media as CommentMediaPayload).mediaType),
    mediaPath: normalizeString((media as CommentMediaPayload).mediaPath),
    mediaSize: normalizeInteger((media as CommentMediaPayload).mediaSize),
  };
};

const coerceAvatarUploadPayload = (value: File | AvatarUploadPayload) => {
  if (typeof File !== "undefined" && value instanceof File) {
    throw createAppError(
      "storage/invalid-file",
      "Upload the avatar media to Supabase before saving the profile.",
    );
  }

  return {
    photoURL: normalizeString((value as AvatarUploadPayload).photoURL),
    avatarType: normalizeString((value as AvatarUploadPayload).avatarType),
    avatarPath: normalizeString((value as AvatarUploadPayload).avatarPath),
    avatarSize: normalizeInteger((value as AvatarUploadPayload).avatarSize),
  };
};

const requireCurrentSnapshot = () => {
  const snapshot = getRuntimeWindow().sakuraCurrentUserSnapshot ?? null;

  if (!snapshot?.uid || snapshot.isAnonymous) {
    throw createAppError("auth/no-current-user", "Sign in again to continue.");
  }

  return snapshot;
};

const ensureCurrentPassword = async (currentPassword?: string) => {
  const snapshot = requireCurrentSnapshot();

  if (!snapshot.providerIds.includes("password")) {
    return;
  }

  if (!currentPassword) {
    throw createAppError(
      "auth/current-password-required",
      "Enter your current password to change the login.",
    );
  }

  if (!snapshot.email) {
    throw createAppError(
      "auth/current-password-required",
      "This account cannot verify the current password right now.",
    );
  }

  const client = ensureSupabaseClient();
  const { error } = await client.auth.signInWithPassword({
    email: snapshot.email,
    password: currentPassword,
  });

  if (error) {
    throw createAppError("auth/current-password-invalid", "Current password is incorrect.");
  }
};

const createPresenceRuntime = () =>
  createSupabasePresenceRuntime({
    auth: {
      currentUser: null,
    },
    db: null,
    usersCollection: null,
    userRefFor: () => null,
    getDoc: async () => ({
      exists: () => false,
      data: () => ({}),
    }),
    setDoc: async () => null,
    getDocs: async () => ({
      forEach: () => undefined,
    }),
    query: () => null,
    collection: () => null,
    where: () => null,
    createAppError,
    isPermissionDeniedError: () => false,
    buildFallbackUserDetails: (userLike) => ({
      uid: userLike?.uid ?? null,
      isAnonymous: false,
      email: null,
      emailVerified: null,
      login: null,
      displayName: null,
      profileId: null,
      photoURL: null,
      roles: ["user"],
      isBanned: false,
      bannedAt: null,
      verificationRequired: false,
      providerIds: [],
      creationTime: null,
      lastSignInTime: null,
      loginHistory: [],
      visitHistory: [],
      presence: null,
    }),
    normalizeVisitHistory,
    buildVisitHistory: (previousVisits, nextVisit) => {
      const visitHistory = [nextVisit];
      previousVisits.forEach((visit) => {
        if (visitHistory.length >= 12) {
          return;
        }

        if (
          visit.timestamp === nextVisit.timestamp &&
          visit.path === nextVisit.path &&
          visit.source === nextVisit.source &&
          visit.status === nextVisit.status
        ) {
          return;
        }

        visitHistory.push(visit);
      });
      return visitHistory;
    },
    toUserSnapshot: (userLike, details) => ({
      uid: userLike.uid,
      isAnonymous: false,
      email: typeof details.email === "string" ? details.email : null,
      emailVerified: typeof details.emailVerified === "boolean" ? details.emailVerified : false,
      verificationRequired:
        typeof details.verificationRequired === "boolean" ? details.verificationRequired : false,
      verificationEmailSent:
        typeof details.verificationEmailSent === "boolean" ? details.verificationEmailSent : false,
      login: typeof details.login === "string" ? details.login : null,
      displayName: typeof details.displayName === "string" ? details.displayName : null,
      profileId: typeof details.profileId === "number" ? details.profileId : null,
      photoURL: typeof details.photoURL === "string" ? details.photoURL : null,
      avatarPath: typeof details.avatarPath === "string" ? details.avatarPath : null,
      avatarType: typeof details.avatarType === "string" ? details.avatarType : null,
      avatarSize: typeof details.avatarSize === "number" ? details.avatarSize : null,
      roles: Array.isArray(details.roles) ? normalizeRoles(details.roles) : ["user"],
      isBanned: details.isBanned === true,
      bannedAt: typeof details.bannedAt === "string" ? details.bannedAt : null,
      providerIds: Array.isArray(details.providerIds) ? normalizeProviderIds(details.providerIds) : [],
      creationTime: typeof details.creationTime === "string" ? details.creationTime : null,
      lastSignInTime:
        typeof details.lastSignInTime === "string" ? details.lastSignInTime : null,
      loginHistory:
        Array.isArray(details.loginHistory)
          ? details.loginHistory.filter((entry): entry is string => typeof entry === "string")
          : [],
      visitHistory: normalizeVisitHistory(details.visitHistory),
      presence: normalizePresence(details.presence, readCurrentLocationPath()),
    }),
    toStoredUserSnapshot: (uid, details) => ({
      uid,
      isAnonymous: false,
      email: typeof details.email === "string" ? details.email : null,
      emailVerified: typeof details.emailVerified === "boolean" ? details.emailVerified : false,
      verificationRequired:
        typeof details.verificationRequired === "boolean" ? details.verificationRequired : false,
      verificationEmailSent:
        typeof details.verificationEmailSent === "boolean" ? details.verificationEmailSent : false,
      login: typeof details.login === "string" ? details.login : null,
      displayName: typeof details.displayName === "string" ? details.displayName : null,
      profileId: typeof details.profileId === "number" ? details.profileId : null,
      photoURL: typeof details.photoURL === "string" ? details.photoURL : null,
      avatarPath: typeof details.avatarPath === "string" ? details.avatarPath : null,
      avatarType: typeof details.avatarType === "string" ? details.avatarType : null,
      avatarSize: typeof details.avatarSize === "number" ? details.avatarSize : null,
      roles: Array.isArray(details.roles) ? normalizeRoles(details.roles) : ["user"],
      isBanned: details.isBanned === true,
      bannedAt: typeof details.bannedAt === "string" ? details.bannedAt : null,
      providerIds: Array.isArray(details.providerIds) ? normalizeProviderIds(details.providerIds) : [],
      creationTime: typeof details.creationTime === "string" ? details.creationTime : null,
      lastSignInTime:
        typeof details.lastSignInTime === "string" ? details.lastSignInTime : null,
      loginHistory:
        Array.isArray(details.loginHistory)
          ? details.loginHistory.filter((entry): entry is string => typeof entry === "string")
          : [],
      visitHistory: normalizeVisitHistory(details.visitHistory),
      presence: normalizePresence(details.presence, readCurrentLocationPath()),
    }),
    normalizePresence: (value, fallbackPath) =>
      normalizePresence(value, fallbackPath) ?? {
        status: "offline",
        isOnline: false,
        currentPath: fallbackPath ?? null,
        lastSeenAt: null,
      },
    isPresenceFreshOnline: (presence) => {
      const normalizedPresence = normalizePresence(presence);
      const lastSeenAt = normalizedPresence?.lastSeenAt
        ? Date.parse(normalizedPresence.lastSeenAt)
        : Number.NaN;

      return Boolean(
        normalizedPresence?.isOnline &&
          Number.isFinite(lastSeenAt) &&
          Date.now() - lastSeenAt <= 90_000,
      );
    },
    pickCommentAccentRole,
    publishUserSnapshot: (snapshot) => {
      if (!snapshot) {
        return publishUserSnapshot(null);
      }

      const normalizedSnapshot: AppUserSnapshot = {
        uid: typeof snapshot.uid === "string" ? snapshot.uid : "",
        isAnonymous: false,
        email: typeof snapshot.email === "string" ? snapshot.email : null,
        emailVerified:
          typeof snapshot.emailVerified === "boolean" ? snapshot.emailVerified : false,
        verificationRequired:
          typeof snapshot.verificationRequired === "boolean"
            ? snapshot.verificationRequired
            : false,
        verificationEmailSent:
          typeof snapshot.verificationEmailSent === "boolean"
            ? snapshot.verificationEmailSent
            : false,
        login: typeof snapshot.login === "string" ? snapshot.login : null,
        displayName:
          typeof snapshot.displayName === "string" ? snapshot.displayName : null,
        profileId: typeof snapshot.profileId === "number" ? snapshot.profileId : null,
        photoURL: typeof snapshot.photoURL === "string" ? snapshot.photoURL : null,
        avatarPath: typeof snapshot.avatarPath === "string" ? snapshot.avatarPath : null,
        avatarType: typeof snapshot.avatarType === "string" ? snapshot.avatarType : null,
        avatarSize: typeof snapshot.avatarSize === "number" ? snapshot.avatarSize : null,
        roles: Array.isArray(snapshot.roles) ? normalizeRoles(snapshot.roles) : ["user"],
        isBanned: snapshot.isBanned === true,
        bannedAt: typeof snapshot.bannedAt === "string" ? snapshot.bannedAt : null,
        providerIds: Array.isArray(snapshot.providerIds)
          ? normalizeProviderIds(snapshot.providerIds)
          : [],
        creationTime:
          typeof snapshot.creationTime === "string" ? snapshot.creationTime : null,
        lastSignInTime:
          typeof snapshot.lastSignInTime === "string" ? snapshot.lastSignInTime : null,
        loginHistory: Array.isArray(snapshot.loginHistory)
          ? snapshot.loginHistory.filter((entry): entry is string => typeof entry === "string")
          : [],
        visitHistory: normalizeVisitHistory(snapshot.visitHistory),
        presence: normalizePresence(snapshot.presence, readCurrentLocationPath()),
      };

      return publishUserSnapshot(normalizedSnapshot);
    },
    constants: {
      onlineUsersRuntimeCacheTtlMs: 10_000,
      presenceHeartbeatIntervalMs: 30_000,
      presenceVisitRecordCooldownMs: 30_000,
      presenceTabRegistryStorageKey: "sakura-presence-tab-registry",
      presenceTabRegistryMaxAgeMs: 135_000,
    },
  });

export const startSupabaseAppRuntime = async () => {
  const runtime = getRuntimeWindow();

  if (runtime.sakuraAppAuthReady && runtime.sakuraAppAuth) {
    return runtime.sakuraAppAuth;
  }

  if (runtime.sakuraSupabaseAppRuntimePromise) {
    return runtime.sakuraSupabaseAppRuntimePromise;
  }

  runtime.sakuraSupabaseAppRuntimePromise = (async () => {
    markAuthStatePending();

    if (!isSupabaseConfigured || !supabase) {
      runtime.sakuraAppAuthReady = true;
      runtime.sakuraAppAuthError = null;
      runtime.sakuraAuthStateSettled = true;
      runtime.dispatchEvent(new CustomEvent(AUTH_READY_EVENT));
      runtime.dispatchEvent(new CustomEvent(AUTH_STATE_SETTLED_EVENT));
      return null;
    }

    await startSupabaseAuthRuntime();
    const client = ensureSupabaseClient();
    const presenceRuntime = runtime.sakuraPresenceRuntime ?? createPresenceRuntime();
    runtime.sakuraPresenceRuntime = presenceRuntime;

    const refreshAndTrackCurrentUser = async (
      options: {
        verificationEmailSent?: boolean;
        fallbackPresence?: PresenceSnapshot | null;
      } = {},
    ) => {
      const snapshot = await refreshCurrentUserSnapshot(options);
      const currentSession = await client.auth.getSession();
      const presenceUser = toPresenceUser(currentSession.data.session?.user ?? null, snapshot);

      presenceRuntime.stopPresenceTracking();

      if (presenceUser && snapshot) {
        presenceRuntime.startPresenceTracking(presenceUser);
      }

      clearAuthError();
      return snapshot;
    };

    const bridge: AppAuthBridge = {
      login: async (identifier, password) => {
        const normalizedIdentifier = identifier.trim();

        if (!normalizedIdentifier) {
          throw createAppError("auth/invalid-credential", "Enter your email or login.");
        }

        let resolvedEmail = normalizedIdentifier;

        if (!normalizedIdentifier.includes("@")) {
          resolvedEmail = (await resolveSigninEmailForLogin(normalizedIdentifier)) ?? "";

          if (!resolvedEmail) {
            throw createAppError("auth/login-not-found", "Account with this login was not found.");
          }
        }

        const { error } = await client.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }

        return await refreshAndTrackCurrentUser();
      },
      loginWithGoogle: async () => {
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.href,
          },
        });

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }

        return null;
      },
      completeGoogleAccount: async ({ login, displayName, password }) => {
        const currentSnapshot = requireCurrentSnapshot();
        const sanitizedLogin = sanitizeLogin(login);
        const sanitizedDisplayName = sanitizeDisplayName(displayName);

        if (!sanitizedLogin) {
          throw createAppError("auth/invalid-login", "Enter a valid login.");
        }

        if (!password || password.length < 6) {
          throw createAppError("auth/weak-password", "Password should be at least 6 characters.");
        }

        const { error: updateUserError } = await client.auth.updateUser({
          password,
          data: {
            login: sanitizedLogin,
            requested_login: sanitizedLogin,
            display_name: sanitizedDisplayName || currentSnapshot.displayName || sanitizedLogin,
          },
        });

        if (updateUserError) {
          throw normalizeSupabaseAuthError(updateUserError);
        }

        await callSupabaseAuthenticatedRpc(
          "update_current_profile_identity_rpc",
          {
            target_login: sanitizedLogin,
            target_display_name:
              sanitizedDisplayName || currentSnapshot.displayName || sanitizedLogin,
          },
          "Profile identity could not be saved.",
        );

        return await refreshAndTrackCurrentUser();
      },
      register: async ({ login, displayName, email, password }) => {
        const sanitizedLogin = sanitizeLogin(login);
        const sanitizedDisplayName = sanitizeDisplayName(displayName);
        const signUpResponse = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.href,
            data: {
              login: sanitizedLogin || undefined,
              requested_login: sanitizedLogin || undefined,
              display_name: sanitizedDisplayName || sanitizedLogin || undefined,
            },
          },
        });

        if (signUpResponse.error) {
          throw normalizeSupabaseAuthError(signUpResponse.error);
        }

        if (!signUpResponse.data.session) {
          publishUserSnapshot(null);
          return null;
        }

        return await refreshAndTrackCurrentUser();
      },
      resendVerificationEmail: async () => {
        const snapshot = requireCurrentSnapshot();

        if (!snapshot.email) {
          throw createAppError("auth/no-current-user", "Sign in again to verify your email.");
        }

        if (snapshot.providerIds.includes("google.com") || snapshot.emailVerified === true) {
          return publishUserSnapshot({
            ...snapshot,
            emailVerified: true,
            verificationRequired: false,
            verificationEmailSent: false,
          });
        }

        const { error } = await client.auth.resend({
          type: "signup",
          email: snapshot.email,
          options: {
            emailRedirectTo: window.location.href,
          },
        });

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }

        return publishUserSnapshot({
          ...snapshot,
          verificationEmailSent: true,
          verificationRequired: true,
          emailVerified: false,
        });
      },
      refreshVerificationStatus: async () => {
        const snapshot = requireCurrentSnapshot();

        if (snapshot.providerIds.includes("google.com")) {
          return publishUserSnapshot({
            ...snapshot,
            emailVerified: true,
            verificationRequired: false,
            verificationEmailSent: false,
          });
        }

        return await refreshAndTrackCurrentUser({
          verificationEmailSent: false,
        });
      },
      getProfileById: async (profileId) => {
        const currentSnapshot = runtime.sakuraCurrentUserSnapshot ?? null;

        if (
          currentSnapshot &&
          !currentSnapshot.isAnonymous &&
          currentSnapshot.profileId === profileId
        ) {
          return currentSnapshot;
        }

        return await getPublicProfileById(profileId);
      },
      refreshProfileById: async (profileId) => {
        const currentSnapshot = runtime.sakuraCurrentUserSnapshot ?? null;

        if (
          currentSnapshot &&
          !currentSnapshot.isAnonymous &&
          currentSnapshot.profileId === profileId
        ) {
          return await refreshAndTrackCurrentUser();
        }

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      getProfileByAuthorName: async (authorName) => await getPublicProfileByAuthorName(authorName),
      getProfilesByLoginPrefix: async (loginPrefix) => await getProfilesByLoginPrefix(loginPrefix),
      getProfileComments: async (profileId) => await getProfileComments(profileId),
      isCommentMediaPathReferenced: async (mediaPath) =>
        await isCommentMediaPathReferenced(mediaPath),
      addProfileComment: async (profileId, message, media) => {
        const nextMedia = coerceCommentMediaPayload(media);
        const response = await callSupabaseAuthenticatedRpc<Record<string, unknown>>(
          "add_profile_comment_rpc",
          {
            target_profile_id: profileId,
            target_message: message.trim(),
            target_media_url: nextMedia?.mediaURL ?? null,
            target_media_type: nextMedia?.mediaType ?? null,
            target_media_path: nextMedia?.mediaPath ?? null,
            target_media_size: nextMedia?.mediaSize ?? null,
          },
          "Comment could not be saved.",
        );
        const savedComment = mapSupabaseCommentRowToComment(response as SupabaseCommentRow);

        if (!savedComment) {
          throw createAppError("comments/write-denied", "Comment could not be saved.");
        }

        return savedComment;
      },
      updateProfileComment: async (commentId, message, media, removeMedia) => {
        const nextMedia = removeMedia ? null : coerceCommentMediaPayload(media);
        const response = await callSupabaseAuthenticatedRpc<Record<string, unknown> | null>(
          "update_profile_comment_rpc",
          {
            target_comment_id: commentId,
            target_message: message.trim(),
            target_media_url: nextMedia?.mediaURL ?? null,
            target_media_type: nextMedia?.mediaType ?? null,
            target_media_path: nextMedia?.mediaPath ?? null,
            target_media_size: nextMedia?.mediaSize ?? null,
          },
          "Comment could not be updated.",
        );

        if (!response) {
          return null;
        }

        return mapSupabaseCommentRowToComment(response as SupabaseCommentRow);
      },
      deleteProfileComment: async (commentId) => {
        const response = await callSupabaseAuthenticatedRpc<Record<string, unknown> | null>(
          "delete_profile_comment_rpc",
          {
            target_comment_id: commentId,
          },
          "Comment could not be deleted.",
        );

        return response && typeof response.id === "string" ? response.id : null;
      },
      updateDisplayName: async (displayName) => {
        const sanitizedDisplayName = sanitizeDisplayName(displayName);

        if (!sanitizedDisplayName) {
          throw createAppError("display-name/empty", "Enter a profile name.");
        }

        await callSupabaseAuthenticatedRpc(
          "update_current_profile_identity_rpc",
          {
            target_display_name: sanitizedDisplayName,
          },
          "Profile name could not be saved.",
        );

        await client.auth
          .updateUser({
            data: {
              display_name: sanitizedDisplayName,
            },
          })
          .catch(() => null);

        return await refreshAndTrackCurrentUser();
      },
      updateUsername: async (username, currentPassword) => {
        const sanitizedLogin = sanitizeLogin(username);

        if (!sanitizedLogin) {
          throw createAppError("auth/invalid-login", "Enter a valid login.");
        }

        await ensureCurrentPassword(currentPassword);
        await callSupabaseAuthenticatedRpc(
          "update_current_profile_identity_rpc",
          {
            target_login: sanitizedLogin,
          },
          "Login could not be saved.",
        );

        await client.auth
          .updateUser({
            data: {
              login: sanitizedLogin,
              requested_login: sanitizedLogin,
            },
          })
          .catch(() => null);

        return await refreshAndTrackCurrentUser();
      },
      adminUpdateProfileDisplayName: async (profileId, displayName) => {
        const sanitizedDisplayName = sanitizeDisplayName(displayName);

        if (!sanitizedDisplayName) {
          throw createAppError("display-name/empty", "Enter a profile name.");
        }

        await callSupabaseAuthenticatedRpc(
          "admin_update_profile_identity_rpc",
          {
            target_profile_id: profileId,
            target_display_name: sanitizedDisplayName,
          },
          "Profile name could not be saved.",
        );

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      adminUpdateProfileLogin: async (profileId, login) => {
        const sanitizedLogin = sanitizeLogin(login);

        if (!sanitizedLogin) {
          throw createAppError("auth/invalid-login", "Enter a valid login.");
        }

        await callSupabaseAuthenticatedRpc(
          "admin_update_profile_identity_rpc",
          {
            target_profile_id: profileId,
            target_login: sanitizedLogin,
          },
          "Login could not be saved.",
        );

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      adminSetProfileBan: async (profileId, isBanned) => {
        await callSupabaseAuthenticatedRpc(
          "admin_set_profile_ban_rpc",
          {
            target_profile_id: profileId,
            target_is_banned: isBanned,
          },
          "Ban status could not be updated.",
        );

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      adminSetProfileEmailVerification: async (profileId, isVerified) => {
        const response = await callSupabaseSyncFunction<Record<string, unknown>>({
          action: "admin_set_profile_email_verification",
          profileId,
          isVerified,
        });
        const refreshedProfile = await getPublicProfileById(profileId, { forceFresh: true });

        if (!refreshedProfile) {
          return null;
        }

        const fields =
          response && typeof response.fields === "object" && response.fields !== null
            ? (response.fields as Record<string, unknown>)
            : null;

        return {
          ...refreshedProfile,
          email: refreshedProfile.email ?? normalizeString(fields?.email),
          emailVerified:
            typeof fields?.emailVerified === "boolean"
              ? fields.emailVerified
              : refreshedProfile.emailVerified,
          verificationRequired:
            typeof fields?.verificationRequired === "boolean"
              ? fields.verificationRequired
              : refreshedProfile.verificationRequired,
          providerIds:
            normalizeProviderIds(fields?.providerIds).length > 0
              ? normalizeProviderIds(fields?.providerIds)
              : refreshedProfile.providerIds,
        };
      },
      getAdminPrivateProfileFields: async (profileId) => {
        const response = await callSupabaseAuthenticatedRpc<Record<string, unknown> | null>(
          "get_private_profile_fields_rpc",
          {
            target_profile_id: profileId,
          },
          "Private profile fields could not be loaded.",
        );

        if (!response) {
          return null;
        }

        return {
          email: normalizeString(response.email),
          emailVerified:
            typeof response.emailVerified === "boolean" ? response.emailVerified : null,
          verificationRequired:
            typeof response.verificationRequired === "boolean"
              ? response.verificationRequired
              : null,
          providerIds: normalizeProviderIds(response.providerIds),
        };
      },
      adminDeleteAccount: async (profileId) => {
        await callSupabaseSyncFunction({
          action: "admin_delete_profile_account_data",
          profileId,
        });
        return null;
      },
      updateProfileRoles: async (profileId, roles) => {
        await callSupabaseAuthenticatedRpc(
          "admin_update_profile_roles_rpc",
          {
            target_profile_id: profileId,
            target_roles: normalizeRoles(roles),
          },
          "Roles could not be updated.",
        );

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      updateAvatar: async (value) => {
        const avatar = coerceAvatarUploadPayload(value);
        await callSupabaseAuthenticatedRpc(
          "update_current_profile_avatar_rpc",
          {
            target_photo_url: avatar.photoURL ?? null,
            target_avatar_path: avatar.avatarPath ?? null,
            target_avatar_type: avatar.avatarType ?? null,
            target_avatar_size: avatar.avatarSize ?? null,
          },
          "Avatar could not be saved.",
        );

        return await refreshAndTrackCurrentUser();
      },
      deleteAvatar: async () => {
        await callSupabaseAuthenticatedRpc(
          "update_current_profile_avatar_rpc",
          {
            target_photo_url: null,
            target_avatar_path: null,
            target_avatar_type: null,
            target_avatar_size: null,
          },
          "Avatar could not be deleted.",
        );

        return await refreshAndTrackCurrentUser();
      },
      adminUpdateProfileAvatar: async (profileId, value) => {
        const avatar = coerceAvatarUploadPayload(value);
        await callSupabaseAuthenticatedRpc(
          "admin_update_profile_avatar_rpc",
          {
            target_profile_id: profileId,
            target_photo_url: avatar.photoURL ?? null,
            target_avatar_path: avatar.avatarPath ?? null,
            target_avatar_type: avatar.avatarType ?? null,
            target_avatar_size: avatar.avatarSize ?? null,
          },
          "Avatar could not be saved.",
        );

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      adminDeleteProfileAvatar: async (profileId) => {
        await callSupabaseAuthenticatedRpc(
          "admin_update_profile_avatar_rpc",
          {
            target_profile_id: profileId,
            target_photo_url: null,
            target_avatar_path: null,
            target_avatar_type: null,
            target_avatar_size: null,
          },
          "Avatar could not be deleted.",
        );

        return await getPublicProfileById(profileId, { forceFresh: true });
      },
      deleteAccount: async () => {
        presenceRuntime.stopPresenceTracking();
        await callSupabaseSyncFunction({
          action: "delete_profile_account_data",
        });
        try {
          await client.auth.signOut();
        } catch {}
        publishUserSnapshot(null);
        return null;
      },
      getAuthToken: async () => await getSupabaseAccessToken(),
      syncPresence: async (options = {}) => {
        const currentSession = await client.auth.getSession();
        const snapshot = runtime.sakuraCurrentUserSnapshot ?? null;
        await presenceRuntime.syncPresence(
          toPresenceUser(currentSession.data.session?.user ?? null, snapshot),
          options,
        );
        return runtime.sakuraCurrentUserSnapshot ?? null;
      },
      getSiteOnlineCount: async () => await presenceRuntime.getSiteOnlineCount(),
      getSiteOnlineUsers: async () => await presenceRuntime.getSiteOnlineUsers(),
      logout: async () => {
        presenceRuntime.stopPresenceTracking();
        try {
          await client.auth.signOut();
        } finally {
          publishUserSnapshot(null);
        }
      },
      onAuthStateChanged: (callback) => {
        runtimeAuthListeners.add(callback);
        callback(runtime.sakuraCurrentUserSnapshot ?? null);
        return () => {
          runtimeAuthListeners.delete(callback);
        };
      },
    };

    runtime.sakuraAppAuth = bridge;
    runtime.sakuraAppAuthReady = true;
    clearAuthError();

    const initializeRuntime = async () => {
      try {
        await refreshAndTrackCurrentUser();
      } catch (error) {
        if (error instanceof Error && error.message) {
          emitAuthError(error.message);
        }
      } finally {
        markAuthStateSettled();
        runtime.dispatchEvent(new CustomEvent(AUTH_READY_EVENT));
      }
    };

    void initializeRuntime();

    client.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          clearAuthError();

          if (!session?.user) {
            presenceRuntime.stopPresenceTracking();
            publishUserSnapshot(null);
            markAuthStateSettled();
            return;
          }

          await refreshAndTrackCurrentUser();
        } catch (error) {
          emitAuthError(error instanceof Error ? error.message : "Auth state refresh failed.");
        } finally {
          markAuthStateSettled();
        }
      })();
    });

    return bridge;
  })()
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Supabase app runtime failed to start.";
      const runtime = getRuntimeWindow();
      runtime.sakuraAppAuthReady = true;
      emitAuthError(message);
      markAuthStateSettled();
      return null;
    })
    .finally(() => {
      getRuntimeWindow().sakuraSupabaseAppRuntimePromise = null;
    });

  return runtime.sakuraSupabaseAppRuntimePromise;
};
