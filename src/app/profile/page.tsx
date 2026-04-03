"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { AvatarMedia, AVATAR_FILE_ACCEPT } from "../avatar-media";
import { HeaderSocialLinks } from "../header-social-links";
import { SiteOnlineBadge } from "../site-online-badge";
import {
  deleteSupabaseCommentMedia,
  deleteSupabaseStorageObject,
  uploadSupabaseAvatarMedia,
  uploadSupabaseCommentMedia,
  type SupabaseCommentMediaUploadResult,
} from "@/lib/supabase-storage";
import { getSupabasePublicObjectUrl, isSupabaseConfigured } from "@/lib/supabase";
import { readCachedAuthSnapshot } from "@/lib/auth-snapshot-cache";
import { readCachedProfileSnapshot, writeCachedProfileSnapshot } from "@/lib/profile-cache";
import { readCachedProfileComments, writeCachedProfileComments } from "@/lib/profile-comments-cache";
import { readCachedSiteOnlineCount, writeCachedSiteOnlineCount } from "@/lib/site-online-cache";

type UserProfile = {
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
  presence: { isOnline: boolean; currentPath: string | null; lastSeenAt: string | null } | null;
};

type ProfileComment = {
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
  pending?: boolean;
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

type MentionComposerMode = "new" | "edit";

type MentionDraft = {
  start: number;
  end: number;
  query: string;
};

type Bridge = {
  __runtimeVersion?: string;
  getProfileById: (profileId: number) => Promise<UserProfile | null>;
  getProfileByAuthorName: (authorName: string) => Promise<UserProfile | null>;
  getProfilesByLoginPrefix: (loginPrefix: string) => Promise<UserProfile[]>;
  getProfileComments: (profileId: number) => Promise<ProfileComment[]>;
  isCommentMediaPathReferenced: (mediaPath: string) => Promise<boolean>;
  addProfileComment: (
    profileId: number,
    message: string,
    media?: File | CommentMediaPayload | null
  ) => Promise<ProfileComment>;
  updateProfileComment: (
    commentId: string,
    message: string,
    media?: File | CommentMediaPayload | null,
    removeMedia?: boolean
  ) => Promise<ProfileComment | null>;
  deleteProfileComment: (commentId: string) => Promise<string | null>;
  resendVerificationEmail: () => Promise<UserProfile | null>;
  refreshVerificationStatus: () => Promise<UserProfile | null>;
  updateDisplayName: (displayName: string) => Promise<UserProfile | null>;
  updateUsername: (username: string, currentPassword?: string) => Promise<UserProfile | null>;
  adminUpdateProfileDisplayName: (profileId: number, displayName: string) => Promise<UserProfile | null>;
  adminUpdateProfileLogin: (profileId: number, login: string) => Promise<UserProfile | null>;
  adminSetProfileBan: (profileId: number, isBanned: boolean) => Promise<UserProfile | null>;
  adminSetProfileEmailVerification: (profileId: number, isVerified: boolean) => Promise<UserProfile | null>;
  updateProfileRoles: (profileId: number, roles: string[]) => Promise<UserProfile | null>;
  updateAvatar: (file: File | AvatarUploadPayload) => Promise<UserProfile | null>;
  deleteAvatar: () => Promise<UserProfile | null>;
  adminUpdateProfileAvatar: (
    profileId: number,
    file: File | AvatarUploadPayload
  ) => Promise<UserProfile | null>;
  adminDeleteProfileAvatar: (profileId: number) => Promise<UserProfile | null>;
  syncPresence: (options?: { path?: string; source?: string; forceVisit?: boolean }) => Promise<UserProfile | null>;
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
  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => () => void;
};

type RuntimeWindow = Window & {
  firebaseConfig?: { projectId?: string };
  sakuraCurrentUserSnapshot?: UserProfile | null;
  sakuraAuthStateSettled?: boolean;
  sakuraBootFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraFirebaseAuth?: Bridge;
  sakuraFirebaseAuthError?: string;
  sakuraFirebaseRuntimeVersion?: string;
};

const FIREBASE_AUTH_RUNTIME_VERSION = "2026-04-03-runtime-v2";
const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
const USER_UPDATE_EVENT = "sakura-user-update";
const PRESENCE_DIRTY_EVENT = "sakura-presence-dirty";
const PROFILE_PATH_STORAGE_KEY = "sakura-profile-path";
const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
const PROFILE_BUILD_MARKER = "role-colors-v61";
const PROFILE_THEME_TITLE_BY_PROFILE_ID = new Map<number, string>([
  [1, "Pixies — Where Is My Mind"],
  [2, "Face — Forever Young"],
  [3, "Cyberpunk"],
  [4, "Pixies — Where Is My Mind"],
  [5, "Pixies — Where Is My Mind"],
]);
const COMMENT_MENTION_PATTERN = /@([A-Za-z\u0400-\u04FF0-9._-]{3,24})/g;
const COMMENT_MENTION_DRAFT_PATTERN = /(^|[\s([{"'`])@([A-Za-z\u0400-\u04FF0-9._-]{2,24})$/;
const COMMENT_MENTION_TOKEN_CHARACTER_PATTERN = /[A-Za-z\u0400-\u04FF0-9._-]/;
const repoBasePath = "/sakura.github.io";
const PROFILE_THEME_SONG_BY_PROFILE_ID = new Map<number, string>([
  [1, `${repoBasePath}/music/where-is-my-mind.mp3`],
  [2, `${repoBasePath}/music/Face-forever-young.mp3`],
  [3, `${repoBasePath}/music/cyberpunk.mp3`],
  [4, `${repoBasePath}/music/where-is-my-mind.mp3`],
  [5, `${repoBasePath}/music/where-is-my-mind.mp3`],
]);
const COMMENT_MEDIA_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm";
const PRESENCE_ACTIVE_WINDOW_MS = 90 * 1000;
const SITE_ONLINE_COUNT_REFRESH_INTERVAL_MS = 20 * 1000;
const SITE_ONLINE_COUNT_REFRESH_DEBOUNCE_MS = 280;
const PROFILE_NAV_SCAN_LIMIT = 300;
const PROFILE_THEME_TIMELINE_UPDATE_STEP_SECONDS = 0.24;
const STALE_RUNTIME_RECOVERY_STORAGE_KEY = "sakura-stale-runtime-recovery-at";
const STALE_RUNTIME_RECOVERY_COUNT_STORAGE_KEY = "sakura-stale-runtime-recovery-count";
const STALE_RUNTIME_RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;
const STALE_RUNTIME_RECOVERY_MAX_PER_SESSION = 1;
const STALE_RUNTIME_ERROR_PATTERNS = [
  /cacheResolvedProfileSnapshot is not defined/i,
  /AUTH_RUNTIME_INSTALLED_EVENT is not defined/i,
  /writeRuntimeCacheEntry is not defined/i,
];
const restoreProfilePathScript = `
  (function () {
    try {
      var fallbackPath = window.sessionStorage.getItem(${JSON.stringify(PROFILE_PATH_STORAGE_KEY)});
      var currentProfileId = window.sessionStorage.getItem(${JSON.stringify(CURRENT_PROFILE_ID_STORAGE_KEY)});
      var currentPath = window.location.pathname;
      var profilePath = ${JSON.stringify(repoBasePath + "/profile")};
      var profilePattern = new RegExp("^" + ${JSON.stringify(repoBasePath)} + "/profile/\\\\d+$");

      if (currentPath === profilePath) {
        if (fallbackPath && profilePattern.test(fallbackPath)) {
          window.history.replaceState(null, "", fallbackPath);
          return;
        }

        if (currentProfileId && /^\\d+$/.test(currentProfileId)) {
          window.history.replaceState(null, "", profilePath + "/" + currentProfileId);
        }
      }
    } catch (error) {}
  })();
`;

const getWindowState = () => window as RuntimeWindow;
const hasCurrentFirebaseAuthRuntime = (runtime: RuntimeWindow) =>
  Boolean(runtime.sakuraFirebaseAuth) &&
  runtime.sakuraFirebaseRuntimeVersion === FIREBASE_AUTH_RUNTIME_VERSION &&
  runtime.sakuraFirebaseAuth?.__runtimeVersion === FIREBASE_AUTH_RUNTIME_VERSION;
const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "";
const isRecoverableStaleRuntimeError = (error: unknown) =>
  STALE_RUNTIME_ERROR_PATTERNS.some((pattern) => pattern.test(getErrorMessage(error)));
const recoverFromStaleRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const recoveryCount = Number(
      window.sessionStorage.getItem(STALE_RUNTIME_RECOVERY_COUNT_STORAGE_KEY) || "0"
    );
    if (
      Number.isFinite(recoveryCount) &&
      recoveryCount >= STALE_RUNTIME_RECOVERY_MAX_PER_SESSION
    ) {
      return false;
    }

    const lastRecoveryAt = Number(
      window.sessionStorage.getItem(STALE_RUNTIME_RECOVERY_STORAGE_KEY) || "0"
    );

    if (
      Number.isFinite(lastRecoveryAt) &&
      Date.now() - lastRecoveryAt < STALE_RUNTIME_RECOVERY_COOLDOWN_MS
    ) {
      return false;
    }

    window.sessionStorage.setItem(
      STALE_RUNTIME_RECOVERY_STORAGE_KEY,
      String(Date.now())
    );
    window.sessionStorage.setItem(
      STALE_RUNTIME_RECOVERY_COUNT_STORAGE_KEY,
      String(Number.isFinite(recoveryCount) ? recoveryCount + 1 : 1)
    );
  } catch {}

  const runtime = getWindowState();
  delete runtime.sakuraFirebaseAuth;
  delete runtime.sakuraFirebaseAuthError;
  delete runtime.sakuraFirebaseRuntimeVersion;
  delete runtime.sakuraBootFirebaseAuth;
  delete runtime.sakuraStartFirebaseAuth;
  runtime.sakuraAuthStateSettled = false;

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("__runtime_recover", String(Date.now()));
  window.location.replace(nextUrl.toString());
  return true;
};

const getAuthBridgeErrorMessage = (event: Event | undefined, fallback: string) => {
  if (typeof window !== "undefined" && getWindowState().sakuraFirebaseAuthError) {
    return getWindowState().sakuraFirebaseAuthError as string;
  }

  if (event instanceof CustomEvent) {
    if (typeof event.detail === "string" && event.detail) {
      return event.detail;
    }

    if (
      event.detail &&
      typeof event.detail === "object" &&
      "message" in event.detail &&
      typeof event.detail.message === "string" &&
      event.detail.message
    ) {
      return event.detail.message;
    }
  }

  return fallback;
};
const profilePath = (id: number) => `${repoBasePath}/profile/${id}`;
const getErrorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
const isPresenceOnlineNow = (presence: UserProfile["presence"] | null | undefined) => {
  const lastSeenAt = presence?.lastSeenAt ? Date.parse(presence.lastSeenAt) : Number.NaN;

  return Boolean(
    presence?.isOnline &&
      Number.isFinite(lastSeenAt) &&
      Date.now() - lastSeenAt <= PRESENCE_ACTIVE_WINDOW_MS
  );
};
const getProfileActionErrorMessage = (error: unknown, fallback: string) => {
  const code = getErrorCode(error);

  if (code === "auth/too-many-requests") {
    return "Too many requests. Wait a little before resending the verification email.";
  }

  if (code === "comments/login-required") {
    return "Sign in to leave a comment on this profile.";
  }

  if (code === "comments/delete-forbidden") {
    return "You can only delete your own comments, comments on your profile, or moderate comments with staff roles. Co-owner cannot remove root comments outside their profile.";
  }

  if (code === "comments/update-forbidden") {
    return "You can only edit your own comments unless you are root.";
  }

  if (code === "comments/media-unsupported") {
    return "Only PNG, JPG, WEBP, GIF, MP4, and WEBM files are supported in comments.";
  }

  if (code === "comments/media-too-large") {
    return "The selected media is too large. Use a smaller image or GIF.";
  }

  if (code === "comments/media-invalid") {
    return "The selected media could not be prepared for the comment.";
  }

  if (code === "comments/write-denied") {
    return "Comment media could not be saved. If attachments are enabled, allow mediaURL and mediaType in profileComments rules.";
  }

  if (code === "ban/self-forbidden") {
    return "You cannot ban your own account.";
  }

  if (code === "verification/self-forbidden") {
    return "You cannot revoke email verification on your own root account.";
  }

  if (code === "auth/account-banned") {
    return "This account has been banned by an administrator.";
  }

  if (code === "auth/email-not-verified") {
    return "Verify your email before using the profile and comments.";
  }

  if (code === "avatar/action-timeout") {
    return "Avatar action took too long. Try a smaller file.";
  }

  if (code === "auth/current-password-required") {
    return "Enter your current password to change the login.";
  }

  if (code === "auth/current-password-invalid") {
    return "Current password is incorrect.";
  }

  return error instanceof Error ? error.message : fallback;
};
const getCommentWriteDeniedMessage = (hasMedia: boolean) =>
  hasMedia
    ? "Comment media could not be saved. If attachments are enabled, allow mediaURL, mediaType, mediaPath, and mediaSize in profileComments rules."
    : "Comment could not be saved. Check Firestore rules for profileComments.";
const getSupabaseCommentMediaUnavailableMessage = () =>
  "Supabase media upload is not configured for this build yet. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET to the deployed site build.";
const getSupabaseAvatarUnavailableMessage = () =>
  "Supabase avatar upload is not configured for this build yet. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET to the deployed site build.";
const USER_AVATAR_UPGRADE_MESSAGE =
  "You need a profile upgrade to use GIFs and videos as your avatar. The user role supports static images only.";
const toCommentMediaPayload = (
  uploadResult: SupabaseCommentMediaUploadResult
): CommentMediaPayload => ({
  mediaURL: uploadResult.publicUrl,
  mediaType: uploadResult.contentType,
  mediaPath: uploadResult.path,
  mediaSize: uploadResult.size,
});
const toAvatarUploadPayload = (
  uploadResult: SupabaseCommentMediaUploadResult
): AvatarUploadPayload => ({
  photoURL: uploadResult.publicUrl,
  avatarType: uploadResult.contentType,
  avatarPath: uploadResult.path,
  avatarSize: uploadResult.size,
});
const shouldCleanupUploadedMedia = (uploadResult: SupabaseCommentMediaUploadResult | null) =>
  uploadResult ? Boolean(uploadResult.path) && !uploadResult.reused : false;
const isCommentVideoMediaType = (value: string | null | undefined) =>
  value === "video/mp4" || value === "video/webm";
const PREMIUM_AVATAR_MEDIA_TYPES = new Set(["image/gif", "video/mp4", "video/webm"]);
const formatAudioClock = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
const buildMusicSliderStyle = (value: number, max: number) => {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const ratio = Math.min(100, Math.max(0, (safeValue / safeMax) * 100));

  return {
    background: `linear-gradient(90deg, rgba(255,183,197,0.98) 0%, rgba(255,183,197,0.98) ${ratio}%, rgba(42,23,28,0.95) ${ratio}%, rgba(42,23,28,0.95) 100%)`,
  } satisfies CSSProperties;
};
const musicSliderClassName =
  "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#2a171c] " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#ffd6df] [&::-webkit-slider-thumb]:bg-[#fff1f5] [&::-webkit-slider-thumb]:shadow-[0_0_16px_rgba(255,183,197,0.35)] " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-0 " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#ffd6df] [&::-moz-range-thumb]:bg-[#fff1f5] [&::-moz-range-thumb]:shadow-[0_0_16px_rgba(255,183,197,0.35)] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function MusicGlyph({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
        <rect x="3" y="2.5" width="3.2" height="11" rx="1.1" />
        <rect x="9.8" y="2.5" width="3.2" height="11" rx="1.1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5 fill-current">
      <path d="M4 2.6c0-.55.6-.89 1.07-.61l8.03 4.84c.45.27.45.95 0 1.22L5.07 12.9A.71.71 0 0 1 4 12.3V2.6Z" />
    </svg>
  );
}

function CommentMediaFrame({
  src,
  mediaType,
  alt,
  className,
  controls = false,
}: {
  src: string;
  mediaType?: string | null;
  alt: string;
  className: string;
  controls?: boolean;
}) {
  if (isCommentVideoMediaType(mediaType)) {
    return (
      <video
        src={src}
        aria-label={alt}
        controls={controls}
        autoPlay={!controls}
        loop={!controls}
        muted
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }

  return <img src={src} alt={alt} loading="lazy" className={className} />;
}
const normalizeUsernameDraft = (value: string | null | undefined) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, "");
const isEmailVerificationLockedForProfile = (user: UserProfile | null | undefined) =>
  Boolean(
    user &&
      !user.isAnonymous &&
      user.email &&
      user.emailVerified === false &&
      user.verificationRequired !== false
  );
const AVATAR_ACTION_TIMEOUT_MS = 12000;
const withAvatarActionTimeout = <T,>(promise: Promise<T>) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        const error = new Error("Avatar action took too long. Try a smaller file.");
        (error as Error & { code?: string }).code = "avatar/action-timeout";
        reject(error);
      }, AVATAR_ACTION_TIMEOUT_MS);
    }),
  ]);
const parseProfileId = (path: string | null) => {
  if (!path || !path.startsWith(`${repoBasePath}/profile/`)) return null;
  const raw = path.slice(`${repoBasePath}/profile/`.length);
  return /^\d+$/.test(raw) ? Number(raw) : null;
};
const getStoredCurrentProfileId = () => {
  if (typeof window === "undefined") return null;
  try {
    const storedProfileId = window.sessionStorage.getItem(CURRENT_PROFILE_ID_STORAGE_KEY);
    return storedProfileId && /^\d+$/.test(storedProfileId) ? Number(storedProfileId) : null;
  } catch (error) {
    return null;
  }
};
const initialsFromText = (value: string) =>
  value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "CM";
const resolveProfileAvatarUrl = (profile: UserProfile | null | undefined) => {
  if (!profile) {
    return null;
  }

  const profilePhotoUrl = typeof profile.photoURL === "string" ? profile.photoURL.trim() : "";
  if (profilePhotoUrl) {
    return profilePhotoUrl;
  }

  const profileAvatarPath = typeof profile.avatarPath === "string" ? profile.avatarPath.trim() : "";
  if (profileAvatarPath) {
    return getSupabasePublicObjectUrl(profileAvatarPath);
  }

  if (typeof profile.profileId === "number" && profile.profileId > 0) {
    const cachedProfileSnapshot = readCachedProfileSnapshot<UserProfile>(profile.profileId);

    if (cachedProfileSnapshot) {
      const cachedPhotoUrl =
        typeof cachedProfileSnapshot.photoURL === "string"
          ? cachedProfileSnapshot.photoURL.trim()
          : "";
      if (cachedPhotoUrl) {
        return cachedPhotoUrl;
      }

      const cachedAvatarPath =
        typeof cachedProfileSnapshot.avatarPath === "string"
          ? cachedProfileSnapshot.avatarPath.trim()
          : "";
      if (cachedAvatarPath) {
        return getSupabasePublicObjectUrl(cachedAvatarPath);
      }
    }
  }

  return null;
};
const redirectToLocalProfile = (requestedProfileId: number, currentProfileId: number | null) => {
  if (typeof window === "undefined") return false;

  const localProfileId =
    typeof currentProfileId === "number" && currentProfileId > 0 ? currentProfileId : getStoredCurrentProfileId();

  if (localProfileId === null || localProfileId === requestedProfileId) {
    return false;
  }

  try {
    window.sessionStorage.removeItem(PROFILE_PATH_STORAGE_KEY);
  } catch (error) {}
  window.location.replace(profilePath(localProfileId));
  return true;
};
const formatTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not available";
const isUserLikeRole = (role: string) => /^u(?:[\s_-]*s)?[\s_-]*e[\s_-]*r$/i.test(role.trim());
const toCompactRoleToken = (role: string) =>
  role
    .trim()
    .toLowerCase()
    .replace(/[\u0430]/g, "a")
    .replace(/[\u0435\u0451]/g, "e")
    .replace(/[\u043E]/g, "o")
    .replace(/[\u0440]/g, "p")
    .replace(/[\u0441]/g, "s")
    .replace(/[\u0443]/g, "y")
    .replace(/[\u0445]/g, "x")
    .replace(/[\u0456]/g, "i")
    .replace(/[^a-z0-9]+/g, "");
const normalizeRoleName = (role: string) => {
  const normalizedRole = role.trim().toLowerCase().replace(/\s+/g, " ");
  const compactRole = toCompactRoleToken(role);

  if (isUserLikeRole(role)) {
    return "user";
  }

  if (/^co[\s_-]*owner$/i.test(role.trim())) {
    return "co-owner";
  }

  if (compactRole === "admin" || compactRole === "administrator") {
    return "administrator";
  }

  if (compactRole === "superadministrator" || compactRole === "superadmin") {
    return "super administrator";
  }

  if (compactRole === "coowner") {
    return "co-owner";
  }

  if (
    compactRole === "root" ||
    compactRole === "r00t" ||
    compactRole === "owner"
  ) {
    return "root";
  }

  if (compactRole === "moderator") {
    return "moderator";
  }

  if (compactRole === "support" || compactRole === "supp0rt") {
    return "support";
  }

  if (
    compactRole === "sponsor" ||
    compactRole === "ponsor" ||
    compactRole === "sponor" ||
    compactRole === "ponor" ||
    compactRole === "sp0ns0r" ||
    compactRole === "p0n0r"
  ) {
    return "sponsor";
  }

  if (compactRole === "tester") {
    return "tester";
  }

  if (compactRole === "subscriber") {
    return "subscriber";
  }

  if (compactRole === "banned" || compactRole === "ban") {
    return "banned";
  }

  if (compactRole === "user") {
    return "user";
  }

  return normalizedRole;
};
const cleanRoleLabel = (role: string) =>
  isUserLikeRole(role) ? "user" : role.trim().replace(/\s+/g, " ");
const formatRole = (role: string) => {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "administrator") {
    return "administrator";
  }

  if (normalizedRole === "super administrator") {
    return "super administrator";
  }

  if (normalizedRole === "subscriber") {
    return "subscriber";
  }

  if (normalizedRole === "tester") {
    return "tester";
  }

  return cleanRoleLabel(role) || "user";
};
const roleDisplayLabel = (role: string) => {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "root") {
    return "Root";
  }

  if (normalizedRole === "co-owner") {
    return "Co-Owner";
  }

  if (normalizedRole === "super administrator") {
    return "Super Administrator";
  }

  if (normalizedRole === "administrator") {
    return "Administrator";
  }

  if (normalizedRole === "moderator") {
    return "Moderator";
  }

  if (normalizedRole === "support") {
    return "Support";
  }

  if (normalizedRole === "sponsor") {
    return "Sponsor";
  }

  if (normalizedRole === "tester") {
    return "Tester";
  }

  if (normalizedRole === "subscriber") {
    return "Subscriber";
  }

  if (normalizedRole === "banned") {
    return "Banned";
  }

  if (normalizedRole === "user") {
    return "User";
  }

  return formatRole(role)
    .split(/([\s-]+)/)
    .map((part) =>
      /[\s-]+/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
};
const roleBadgeLabel = (role: string) => roleDisplayLabel(role);
const renderRoleBadgeText = (role: string) => roleBadgeLabel(role);
const roleBadgeTextStyle: CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  fontFeatureSettings: "\"liga\" 0, \"clig\" 0",
  fontVariantLigatures: "none",
  letterSpacing: "0.01em",
  lineHeight: 1.1,
  textTransform: "none",
  whiteSpace: "nowrap",
};
const roleBadgeStyle = (role: string): CSSProperties => {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "banned") {
    return {
      borderColor: "#ff3b30",
      backgroundColor: "#220909",
      color: "#ffd5d2",
      boxShadow: "0 0 18px rgba(255,59,48,0.28)",
    };
  }

  if (
    normalizedRole === "root" ||
    normalizedRole === "super administrator" ||
    normalizedRole === "co-owner"
  ) {
    return {
      borderColor: "#ff3b30",
      backgroundColor: "#220909",
      color: "#ffd5d2",
      boxShadow: "0 0 18px rgba(255,59,48,0.28)",
    };
  }

  if (normalizedRole === "administrator") {
    return {
      borderColor: "#3b82f6",
      backgroundColor: "#081222",
      color: "#d6e7ff",
      boxShadow: "0 0 18px rgba(59,130,246,0.28)",
    };
  }

  if (normalizedRole === "support") {
    return {
      borderColor: "#22d3ee",
      backgroundColor: "#07181d",
      color: "#cffafe",
      boxShadow: "0 0 18px rgba(34,211,238,0.24)",
    };
  }

  if (normalizedRole === "moderator") {
    return {
      borderColor: "#4f7cff",
      backgroundColor: "#0a1328",
      color: "#d8e3ff",
      boxShadow: "0 0 18px rgba(79,124,255,0.24)",
    };
  }

  if (normalizedRole === "sponsor") {
    return {
      borderColor: "#8b5cf6",
      backgroundColor: "#161022",
      color: "#e3d8ff",
      boxShadow: "0 0 18px rgba(139,92,246,0.24)",
    };
  }

  if (normalizedRole === "tester") {
    return {
      borderColor: "#ffffff",
      backgroundColor: "#151515",
      color: "#ffffff",
      boxShadow: "0 0 18px rgba(255,255,255,0.2)",
    };
  }

  if (normalizedRole === "subscriber") {
    return {
      borderColor: "#facc15",
      backgroundColor: "#1e1806",
      color: "#fff0ae",
      boxShadow: "0 0 18px rgba(250,204,21,0.24)",
    };
  }

  return {
    borderColor: "#22c55e",
    backgroundColor: "#08170d",
    color: "#c6f6d5",
    boxShadow: "0 0 18px rgba(34,197,94,0.22)",
  };
};
const roleHeadlineStyle = (role: string | null | undefined): CSSProperties => {
  if (!role) {
    return {
      color: "#ffffff",
      textShadow: "0 0 18px rgba(255,255,255,0.08)",
    };
  }

  const badgeStyle = roleBadgeStyle(role);

  return {
    color: typeof badgeStyle.color === "string" ? badgeStyle.color : "#ffffff",
    textShadow: typeof badgeStyle.boxShadow === "string" ? badgeStyle.boxShadow : "0 0 18px rgba(255,255,255,0.08)",
  };
};
const withAlpha = (value: string, alpha: number) => {
  const normalized = value.trim();

  if (!normalized.startsWith("#")) {
    return value;
  }

  let hex = normalized.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((part) => part + part)
      .join("");
  }

  if (hex.length !== 6) {
    return value;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return value;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
const profileMetaCardStyle = (role: string | null | undefined): CSSProperties => {
  const borderColor = "#ff8fb1";
  const accentTextColor = "#ffd3de";

  return {
    borderColor: withAlpha(borderColor, 0.4),
    backgroundColor: "#090909",
    backgroundImage: [
      `radial-gradient(circle at top left, ${withAlpha(borderColor, 0.14)} 0%, transparent 58%)`,
      `linear-gradient(180deg, ${withAlpha(accentTextColor, 0.04)} 0%, rgba(9,9,9,0) 100%)`,
    ].join(", "),
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 26px ${withAlpha(borderColor, 0.1)}`,
  };
};
const profileMetaLabelStyle = (role: string | null | undefined): CSSProperties => {
  const borderColor = "#ff8fb1";

  return {
    color: withAlpha(borderColor, 0.78),
    textShadow: `0 0 14px ${withAlpha(borderColor, 0.12)}`,
  };
};
const profileMetaValueStyle = (role: string | null | undefined): CSSProperties => {
  const accentTextColor = "#f3edf7";

  return {
    color: accentTextColor,
    fontFamily: "inherit",
    fontWeight: 500,
    letterSpacing: "0",
    textShadow: "none",
  };
};
const profileMetaValuePillStyle = (role: string | null | undefined): CSSProperties => {
  const borderColor = "#ff8fb1";

  return {
    borderColor: withAlpha(borderColor, 0.36),
    backgroundColor: "#171012",
    backgroundImage: `linear-gradient(180deg, ${withAlpha(borderColor, 0.1)} 0%, rgba(23,16,18,0.96) 100%)`,
    boxShadow: `0 0 22px ${withAlpha(borderColor, 0.12)}, inset 0 1px 0 rgba(255,255,255,0.04)`,
  };
};
const roleCommentAuthorColor = (role: string | null | undefined) => {
  const normalizedRole = normalizeRoleName(role ?? "");

  if (normalizedRole === "banned") {
    return "#ff5a54";
  }

  if (normalizedRole === "root") {
    return "#ff5a54";
  }

  if (normalizedRole === "co-owner") {
    return "#ff7a6f";
  }

  if (normalizedRole === "super administrator") {
    return "#4f7cff";
  }

  if (normalizedRole === "administrator") {
    return "#60a5fa";
  }

  if (normalizedRole === "support") {
    return "#67e8f9";
  }

  if (normalizedRole === "moderator") {
    return "#7c9cff";
  }

  if (normalizedRole === "sponsor") {
    return "#a78bfa";
  }

  if (normalizedRole === "tester") {
    return "#f3f4f6";
  }

  if (normalizedRole === "subscriber") {
    return "#facc15";
  }

  return "#ffffff";
};
const roleCommentAuthorStyle = (role: string | null | undefined): CSSProperties => ({
  color: roleCommentAuthorColor(role),
});
const ROLE_MANAGER_NAMES = new Set(["root", "co-owner"]);
const COMMENT_MODERATOR_ROLE_NAMES = new Set([
  "root",
  "co-owner",
  "super administrator",
  "administrator",
  "support",
  "moderator",
]);
const REMOVED_ROLE_NAMES = new Set([
  "subscriber",
]);
const EDITABLE_ROLE_OPTIONS = [
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
const ROLE_DISPLAY_ORDER = new Map(
  EDITABLE_ROLE_OPTIONS.map((role, index) => [normalizeRoleName(role), index])
);
const COMMENT_AUTHOR_ROLE_ORDER = new Map([
  ["banned", 0],
  ["root", 0],
  ["co-owner", 1],
  ["super administrator", 2],
  ["administrator", 3],
  ["moderator", 4],
  ["support", 5],
  ["sponsor", 6],
  ["tester", 7],
  ["subscriber", 8],
  ["user", 9],
]);
const sortRolesForDisplay = (roles: string[]) =>
  [...roles].sort((left, right) => {
    const leftOrder = ROLE_DISPLAY_ORDER.get(normalizeRoleName(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = ROLE_DISPLAY_ORDER.get(normalizeRoleName(right)) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return formatRole(left).localeCompare(formatRole(right), "en");
  });
const normalizeRoleSelection = (roles: string[]) => {
  const nextRoles = roles
    .map((role) => normalizeRoleName(role))
    .filter(Boolean)
    .filter((role) => !REMOVED_ROLE_NAMES.has(role));

  const uniqueRoles = nextRoles.filter(
    (role, index, entries) => index === entries.findIndex((candidate) => candidate === role)
  );

  return uniqueRoles.length ? sortRolesForDisplay(uniqueRoles) : ["user"];
};
const pickCommentAuthorAccentRole = (roles: string[] | null | undefined) => {
  const nextRoles = Array.isArray(roles)
    ? roles
        .map((role) => normalizeRoleName(role))
        .filter(Boolean)
        .filter((role) => !REMOVED_ROLE_NAMES.has(role))
    : [];
  const uniqueRoles = nextRoles.filter(
    (role, index, entries) => index === entries.findIndex((candidate) => candidate === role)
  );
  const sortedRoles = [...uniqueRoles].sort((left, right) => {
    const leftOrder =
      COMMENT_AUTHOR_ROLE_ORDER.get(normalizeRoleName(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder =
      COMMENT_AUTHOR_ROLE_ORDER.get(normalizeRoleName(right)) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return formatRole(left).localeCompare(formatRole(right), "en");
  });

  return sortedRoles[0] ?? null;
};
const canManageRoles = (roles: string[]) =>
  normalizeRoleSelection(roles).some((role) => ROLE_MANAGER_NAMES.has(normalizeRoleName(role)));
const hasRoleInSelection = (roles: string[] | null | undefined, expectedRole: string) =>
  normalizeRoleSelection(roles ?? []).some(
    (role) => normalizeRoleName(role) === normalizeRoleName(expectedRole)
  );
const canModerateComments = (roles: string[]) =>
  normalizeRoleSelection(roles).some((role) =>
    COMMENT_MODERATOR_ROLE_NAMES.has(normalizeRoleName(role))
  );
const canDeleteCommentAsModerator = (
  actor: Pick<UserProfile, "roles" | "profileId"> | null | undefined,
  comment: ProfileComment,
  commentAuthorRole: string | null | undefined
) => {
  if (!actor || !canModerateComments(actor.roles)) {
    return false;
  }

  if (hasRoleInSelection(actor.roles, "root")) {
    return true;
  }

  const ownsTargetProfile =
    typeof actor.profileId === "number" &&
    typeof comment.profileId === "number" &&
    actor.profileId === comment.profileId;

  if (
    hasRoleInSelection(actor.roles, "co-owner") &&
    normalizeRoleName(commentAuthorRole ?? "") === "root" &&
    !ownsTargetProfile
  ) {
    return false;
  }

  return true;
};
const deriveVisibleProfileRoles = (
  profile: Pick<UserProfile, "roles" | "isBanned"> | null | undefined
) => {
  if (profile?.isBanned === true) {
    return ["banned"];
  }

  return normalizeRoleSelection(profile?.roles ?? []);
};
const canUseEnhancedAvatarMediaForRoles = (roles: string[] | null | undefined) =>
  normalizeRoleSelection(roles ?? []).some((role) => normalizeRoleName(role) !== "user");
const profileNameOf = (user: Pick<UserProfile, "login" | "displayName" | "profileId">) =>
  user.displayName?.trim() ||
  user.login?.trim() ||
  (typeof user.profileId === "number" ? `Profile #${user.profileId}` : "Sakura User");
const nameOf = (user: UserProfile) =>
  profileNameOf(user);
const createPendingCommentId = () =>
  `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const initialsOf = (user: UserProfile) =>
  (nameOf(user) || user.email || (typeof user.profileId === "number" ? `Profile ${user.profileId}` : "SA"))
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
const avatarErrorMessage = (error: unknown) => {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "Avatar upload could not reach Supabase Storage. Check the bucket policy for comments/avatars and try again.";
  }

  return error instanceof Error ? error.message : "Avatar action failed.";
};
const getInitialRequestedProfileId = () => {
  if (typeof window === "undefined") return null;
  const fallback = window.sessionStorage.getItem(PROFILE_PATH_STORAGE_KEY);
  if (fallback) window.sessionStorage.removeItem(PROFILE_PATH_STORAGE_KEY);
  return parseProfileId(window.location.pathname) ?? parseProfileId(fallback);
};
const getClientCurrentUser = () =>
  typeof window === "undefined"
    ? null
    : getWindowState().sakuraCurrentUserSnapshot ??
      readCachedAuthSnapshot<UserProfile>() ??
      null;
const getClientProfile = (currentUser: UserProfile | null, requestedProfileId: number | null) =>
  currentUser && !currentUser.isAnonymous && (requestedProfileId === null || (currentUser.profileId ?? null) === requestedProfileId)
    ? currentUser
    : readCachedProfileSnapshot<UserProfile>(requestedProfileId);
const EMPTY_BOOTSTRAP = {
  authReady: false,
  authStateSettled: false,
  authError: null as string | null,
  currentUser: null as UserProfile | null,
  requestedProfileId: null as number | null,
  profile: null as UserProfile | null,
  comments: [] as ProfileComment[],
};
const getClientBootstrap = () => {
  const currentUser = getClientCurrentUser();
  const requestedProfileId = getInitialRequestedProfileId();
  const initialProfile = getClientProfile(currentUser, requestedProfileId);
  const currentUserProfileId =
    currentUser && !currentUser.isAnonymous && typeof currentUser.profileId === "number"
      ? currentUser.profileId
      : null;

  if (
    typeof window !== "undefined" &&
    requestedProfileId !== null &&
    window.location.pathname !== profilePath(requestedProfileId)
  ) {
    window.history.replaceState(null, "", profilePath(requestedProfileId));
  }

  if (
    typeof window !== "undefined" &&
    requestedProfileId === null &&
    currentUserProfileId !== null &&
    window.location.pathname === `${repoBasePath}/profile`
  ) {
    window.history.replaceState(null, "", profilePath(currentUserProfileId));
  }

  return {
    authReady:
      typeof window !== "undefined" && hasCurrentFirebaseAuthRuntime(getWindowState()),
    authStateSettled:
      typeof window !== "undefined" &&
      hasCurrentFirebaseAuthRuntime(getWindowState()) &&
      Boolean(getWindowState().sakuraAuthStateSettled),
    authError:
      typeof window === "undefined" ||
      (Boolean(getWindowState().sakuraFirebaseRuntimeVersion) &&
        getWindowState().sakuraFirebaseRuntimeVersion !== FIREBASE_AUTH_RUNTIME_VERSION)
        ? null
        : getWindowState().sakuraFirebaseAuthError ?? null,
    currentUser,
    requestedProfileId,
    profile: initialProfile,
    comments: readCachedProfileComments<ProfileComment>(
      initialProfile?.profileId ?? requestedProfileId
    ),
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const adminAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [bootstrap] = useState(() => EMPTY_BOOTSTRAP);
  const [authReady, setAuthReady] = useState(bootstrap.authReady);
  const [authStateSettled, setAuthStateSettled] = useState(bootstrap.authStateSettled);
  const [authError, setAuthError] = useState<string | null>(bootstrap.authError);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(bootstrap.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(bootstrap.profile);
  const [requestedProfileId, setRequestedProfileId] = useState<number | null>(bootstrap.requestedProfileId);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showPendingState, setShowPendingState] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isAvatarDeleting, setIsAvatarDeleting] = useState(false);
  const [isVerificationSending, setIsVerificationSending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isDisplayNameSaving, setIsDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameSuccess, setDisplayNameSuccess] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernamePasswordInput, setUsernamePasswordInput] = useState("");
  const [isUsernameSaving, setIsUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [isProfileControlsOpen, setIsProfileControlsOpen] = useState(false);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [isRolesSaving, setIsRolesSaving] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isBanSaving, setIsBanSaving] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const [banSuccess, setBanSuccess] = useState<string | null>(null);
  const [isAdminVerificationSaving, setIsAdminVerificationSaving] = useState(false);
  const [adminVerificationError, setAdminVerificationError] = useState<string | null>(null);
  const [adminVerificationSuccess, setAdminVerificationSuccess] = useState<string | null>(null);
  const [comments, setComments] = useState<ProfileComment[]>(bootstrap.comments);
  const [commentAuthorProfiles, setCommentAuthorProfiles] = useState<Record<number, UserProfile>>({});
  const [commentAuthorProfilesByCommentId, setCommentAuthorProfilesByCommentId] = useState<Record<string, UserProfile>>({});
  const [commentMentionProfilesByKey, setCommentMentionProfilesByKey] = useState<Record<string, UserProfile>>({});
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentMediaFile, setCommentMediaFile] = useState<File | null>(null);
  const [commentMediaPreviewUrl, setCommentMediaPreviewUrl] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [activeMentionComposer, setActiveMentionComposer] = useState<MentionComposerMode | null>(null);
  const [mentionComposerActivityTick, setMentionComposerActivityTick] = useState(0);
  const [commentMentionCaret, setCommentMentionCaret] = useState(0);
  const [editingCommentMentionCaret, setEditingCommentMentionCaret] = useState(0);
  const [mentionSuggestions, setMentionSuggestions] = useState<UserProfile[]>([]);
  const [isMentionSuggestionsLoading, setIsMentionSuggestionsLoading] = useState(false);
  const [commentDraftMentionProfilesByKey, setCommentDraftMentionProfilesByKey] = useState<Record<string, UserProfile>>({});
  const [editingDraftMentionProfilesByKey, setEditingDraftMentionProfilesByKey] = useState<Record<string, UserProfile>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentMessage, setEditingCommentMessage] = useState("");
  const [editingCommentMediaFile, setEditingCommentMediaFile] = useState<File | null>(null);
  const [editingCommentMediaPreviewUrl, setEditingCommentMediaPreviewUrl] = useState<string | null>(null);
  const [isEditingCommentMediaRemoved, setIsEditingCommentMediaRemoved] = useState(false);
  const [isCommentUpdating, setIsCommentUpdating] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [confirmingCommentDeleteId, setConfirmingCommentDeleteId] = useState<string | null>(null);
  const [openCommentActionsMenuId, setOpenCommentActionsMenuId] = useState<string | null>(null);
  const [siteOnlineCount, setSiteOnlineCount] = useState<number | null>(null);
  const [profileThemeIsPlaying, setProfileThemeIsPlaying] = useState(false);
  const [profileThemeCurrentTime, setProfileThemeCurrentTime] = useState(0);
  const [profileThemeDuration, setProfileThemeDuration] = useState(0);
  const [profileThemeVolume, setProfileThemeVolume] = useState(0.34);
  const [isProfileThemePanelOpen, setIsProfileThemePanelOpen] = useState(false);
  const [previousProfileId, setPreviousProfileId] = useState<number | null>(null);
  const [nextProfileId, setNextProfileId] = useState<number | null>(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [profileSearchResults, setProfileSearchResults] = useState<UserProfile[]>([]);
  const [isProfileSearchLoading, setIsProfileSearchLoading] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState<string | null>(null);
  const [profileSearchFeedback, setProfileSearchFeedback] = useState<string | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const profileThemeAudioRef = useRef<HTMLAudioElement | null>(null);
  const profileThemeAutoplayAttemptedRef = useRef<string | null>(null);
  const mentionSuggestionsCacheRef = useRef<Record<string, UserProfile[]>>({});
  const editingCommentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentMediaInputRef = useRef<HTMLInputElement | null>(null);
  const editingCommentMediaInputRef = useRef<HTMLInputElement | null>(null);
  const ownerUsernameInputRef = useRef<HTMLInputElement | null>(null);
  const adminUsernameInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserIdentitySignature = currentUser
    ? `${currentUser.uid}:${currentUser.isAnonymous ? "1" : "0"}:${currentUser.profileId ?? ""}`
    : "guest";
  const currentUserProfileSnapshotSignature = currentUser
    ? [
        currentUser.login ?? "",
        currentUser.displayName ?? "",
        currentUser.photoURL ?? "",
        currentUser.avatarPath ?? "",
        currentUser.roles?.join(",") ?? "",
        currentUser.emailVerified === false ? "0" : "1",
        currentUser.verificationRequired === false ? "0" : "1",
        currentUser.isBanned === true ? "1" : "0",
      ].join("|")
    : "none";

  const syncTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    setHasHydrated(true);

    const nextBootstrap = getClientBootstrap();
    setAuthReady(nextBootstrap.authReady);
    setAuthStateSettled(nextBootstrap.authStateSettled);
    setAuthError(nextBootstrap.authError);
    setCurrentUser(nextBootstrap.currentUser);
    setRequestedProfileId(nextBootstrap.requestedProfileId);
    setProfile(nextBootstrap.profile);
    setComments(nextBootstrap.comments);
    setSiteOnlineCount(readCachedSiteOnlineCount());
  }, []);

  useEffect(() => {
    if (!profile || profile.isAnonymous) {
      return;
    }

    writeCachedProfileSnapshot(profile);
  }, [profile]);

  useEffect(() => {
    if (!profile?.profileId) {
      return;
    }

    writeCachedProfileComments(
      profile.profileId,
      comments.filter((comment) => comment.pending !== true)
    );
  }, [profile?.profileId, comments]);

  useEffect(() => {
    syncTextareaHeight(commentTextareaRef.current);
  }, [commentInput]);

  useEffect(() => {
    if (!commentMediaFile) {
      setCommentMediaPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(commentMediaFile);
    setCommentMediaPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [commentMediaFile]);

  useEffect(() => {
    syncTextareaHeight(editingCommentTextareaRef.current);
  }, [editingCommentId, editingCommentMessage]);

  useEffect(() => {
    if (!editingCommentMediaFile) {
      setEditingCommentMediaPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(editingCommentMediaFile);
    setEditingCommentMediaPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [editingCommentMediaFile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const runtime = getWindowState();
    void runtime.sakuraBootFirebaseAuth?.();
    let unsubscribe: () => void = () => {};
    const sync = () => {
      if (hasCurrentFirebaseAuthRuntime(runtime) && runtime.sakuraFirebaseAuth) {
        try {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has("__runtime_recover")) {
            currentUrl.searchParams.delete("__runtime_recover");
            window.history.replaceState(null, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
          }
        } catch {}
        setAuthReady(true);
        setAuthStateSettled(Boolean(runtime.sakuraAuthStateSettled));
        setAuthError(null);
        setCurrentUser(runtime.sakuraCurrentUserSnapshot ?? null);
        unsubscribe();
        unsubscribe = runtime.sakuraFirebaseAuth.onAuthStateChanged((user) => setCurrentUser(user));
        return;
      }
      if (
        runtime.sakuraFirebaseRuntimeVersion &&
        runtime.sakuraFirebaseRuntimeVersion !== FIREBASE_AUTH_RUNTIME_VERSION
      ) {
        setAuthReady(false);
        setAuthStateSettled(false);
        return;
      }
      if (runtime.sakuraFirebaseAuthError) setAuthError(runtime.sakuraFirebaseAuthError);
    };
    const onAuthStateSettled = () => {
      setAuthStateSettled(Boolean(getWindowState().sakuraAuthStateSettled));
    };
    const onUserUpdate = () => setCurrentUser(getWindowState().sakuraCurrentUserSnapshot ?? null);
    const onError = (event: Event) =>
      {
        const message = getAuthBridgeErrorMessage(
          event,
          "Firebase Auth is still loading. Reload the page if this does not clear soon."
        );

        if (isRecoverableStaleRuntimeError(message) && recoverFromStaleRuntime()) {
          return;
        }

        setAuthError(message);
      };
    const timeoutId = window.setTimeout(() => {
      const currentRuntime = getWindowState();
      if (
        !hasCurrentFirebaseAuthRuntime(currentRuntime) &&
        currentRuntime.sakuraFirebaseRuntimeVersion === FIREBASE_AUTH_RUNTIME_VERSION &&
        !currentRuntime.sakuraFirebaseAuthError
      )
        setAuthError("Firebase Auth is still loading. Reload the page if this does not clear soon.");
    }, 12000);
    sync();
    window.addEventListener(AUTH_READY_EVENT, sync);
    window.addEventListener(AUTH_ERROR_EVENT, onError);
    window.addEventListener(AUTH_STATE_SETTLED_EVENT, onAuthStateSettled);
    window.addEventListener(USER_UPDATE_EVENT, onUserUpdate);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_READY_EVENT, sync);
      window.removeEventListener(AUTH_ERROR_EVENT, onError);
      window.removeEventListener(AUTH_STATE_SETTLED_EVENT, onAuthStateSettled);
      window.removeEventListener(USER_UPDATE_EVENT, onUserUpdate);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !authReady || !authStateSettled || authError) return;
    const runtime = getWindowState();
    const requestedId = requestedProfileId;
    const visibleCurrentUser = currentUser && !currentUser.isAnonymous ? currentUser : null;
    if (isEmailVerificationLockedForProfile(visibleCurrentUser)) {
      setProfile(null);
      setProfileError(null);
      setIsProfileLoading(false);
      return;
    }
    if (requestedId === null || visibleCurrentUser?.profileId === requestedId) {
      setProfile(visibleCurrentUser);
      setProfileError(null);
      setIsProfileLoading(false);
      if (
        visibleCurrentUser?.profileId &&
        runtime.sakuraFirebaseAuth &&
        !resolveProfileAvatarUrl(visibleCurrentUser)
      ) {
        void runtime.sakuraFirebaseAuth
          .getProfileById(visibleCurrentUser.profileId)
          .then((snapshot) => {
            if (!snapshot) {
              return;
            }

            setProfile(snapshot);
            if (
              visibleCurrentUser &&
              snapshot.uid === visibleCurrentUser.uid
            ) {
              setCurrentUser(snapshot);
            }
            writeCachedProfileSnapshot(snapshot);
          })
          .catch(() => {});
      }
      if (visibleCurrentUser?.profileId && requestedId === null && window.location.pathname !== profilePath(visibleCurrentUser.profileId)) {
        window.history.replaceState(null, "", profilePath(visibleCurrentUser.profileId));
      }
      return;
    }
    if (!runtime.sakuraFirebaseAuth) return;
    setIsProfileLoading(true);
    setProfileError(null);
    runtime.sakuraFirebaseAuth
      .getProfileById(requestedId)
      .then((user) => {
        setProfile(user);
        if (!user) {
          if (redirectToLocalProfile(requestedId, visibleCurrentUser?.profileId ?? null)) return;
          setProfileError(`Profile #${requestedId} was not found.`);
          return;
        }
        if (window.location.pathname !== profilePath(requestedId)) window.history.replaceState(null, "", profilePath(requestedId));
      })
      .catch((error) => {
        if (isRecoverableStaleRuntimeError(error) && recoverFromStaleRuntime()) {
          return;
        }

        setProfile(null);
        setProfileError(error instanceof Error ? error.message : "Could not load this profile.");
      })
      .finally(() => setIsProfileLoading(false));
  }, [
    authReady,
    authStateSettled,
    authError,
    requestedProfileId,
    currentUserIdentitySignature,
    currentUserProfileSnapshotSignature,
  ]);

  useEffect(() => {
    if (
      !currentUser?.uid ||
      currentUser.isAnonymous ||
      isEmailVerificationLockedForProfile(currentUser) ||
      !getWindowState().sakuraFirebaseAuth
    ) return;
    getWindowState().sakuraFirebaseAuth?.syncPresence({ path: window.location.pathname, source: "profile-view", forceVisit: true }).catch(() => {});
  }, [currentUser?.uid, currentUser?.isAnonymous]);

  useEffect(() => {
    if (typeof window === "undefined" || !authReady) {
      return;
    }

    let isCancelled = false;
    let isRefreshing = false;
    let refreshDebounceTimeoutId: number | null = null;
    const refreshSiteOnlineCount = async () => {
      if (isRefreshing) {
        return;
      }

      const bridge = getWindowState().sakuraFirebaseAuth;

      if (!bridge) {
        return;
      }

      try {
        isRefreshing = true;
        const nextCount = await bridge.getSiteOnlineCount();

        if (!isCancelled) {
          setSiteOnlineCount((currentCount) =>
            currentCount === nextCount ? currentCount : nextCount
          );
          writeCachedSiteOnlineCount(nextCount);
        }
      } catch (error) {
      } finally {
        isRefreshing = false;
      }
    };

    const scheduleRefresh = () => {
      if (refreshDebounceTimeoutId !== null) {
        window.clearTimeout(refreshDebounceTimeoutId);
      }

      refreshDebounceTimeoutId = window.setTimeout(() => {
        refreshDebounceTimeoutId = null;
        void refreshSiteOnlineCount();
      }, SITE_ONLINE_COUNT_REFRESH_DEBOUNCE_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        scheduleRefresh();
      }
    };

    void refreshSiteOnlineCount();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void refreshSiteOnlineCount();
    }, SITE_ONLINE_COUNT_REFRESH_INTERVAL_MS);

    window.addEventListener(USER_UPDATE_EVENT, scheduleRefresh);
    window.addEventListener(PRESENCE_DIRTY_EVENT, scheduleRefresh);
    window.addEventListener("pageshow", scheduleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      if (refreshDebounceTimeoutId !== null) {
        window.clearTimeout(refreshDebounceTimeoutId);
      }
      window.removeEventListener(USER_UPDATE_EVENT, scheduleRefresh);
      window.removeEventListener(PRESENCE_DIRTY_EVENT, scheduleRefresh);
      window.removeEventListener("pageshow", scheduleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authReady]);

  useEffect(() => {
    const activeProfileId = profile?.profileId;

    if (!authReady || !authStateSettled || authError || typeof activeProfileId !== "number") {
      setPreviousProfileId(null);
      setNextProfileId(null);
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge) {
      setPreviousProfileId(null);
      setNextProfileId(null);
      return;
    }

    let isCancelled = false;
    const resolveNeighborProfileId = async (startId: number, step: -1 | 1) => {
      let candidateProfileId = startId + step;

      for (
        let scanIndex = 0;
        scanIndex < PROFILE_NAV_SCAN_LIMIT && candidateProfileId > 0;
        scanIndex += 1, candidateProfileId += step
      ) {
        try {
          const candidateProfile = await bridge.getProfileById(candidateProfileId);

          if (candidateProfile && typeof candidateProfile.profileId === "number") {
            return candidateProfile.profileId;
          }
        } catch (error) {}
      }

      return null;
    };

    void (async () => {
      const [resolvedPreviousProfileId, resolvedNextProfileId] = await Promise.all([
        resolveNeighborProfileId(activeProfileId, -1),
        resolveNeighborProfileId(activeProfileId, 1),
      ]);

      if (!isCancelled) {
        setPreviousProfileId(resolvedPreviousProfileId);
        setNextProfileId(resolvedNextProfileId);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [authReady, authStateSettled, authError, profile?.profileId]);

  const visibleCurrentUser = currentUser && !currentUser.isAnonymous ? currentUser : null;
  const isCurrentAccountVerificationLocked = isEmailVerificationLockedForProfile(visibleCurrentUser);
  const isOwner = Boolean(visibleCurrentUser && profile && visibleCurrentUser.uid === profile.uid);
  const activeProfile = profile;
  const activePresence =
    isOwner && visibleCurrentUser?.uid === activeProfile?.uid
      ? visibleCurrentUser?.presence ?? activeProfile?.presence ?? null
      : activeProfile?.presence ?? null;
  const profileThemeProfileId =
    typeof activeProfile?.profileId === "number" ? activeProfile.profileId : null;
  const profileThemeSongSrc =
    typeof profileThemeProfileId === "number"
      ? PROFILE_THEME_SONG_BY_PROFILE_ID.get(profileThemeProfileId) ?? null
      : null;
  const profileThemeTitle =
    typeof profileThemeProfileId === "number"
      ? profileThemeProfileId === 2
        ? "Face forever young"
        : profileThemeProfileId === 3
          ? "Cyberpunk"
          : "Pixies - Where Is My Mind"
      : null;
  const profileThemeSongKey =
    profileThemeProfileId && profileThemeSongSrc
      ? `${profileThemeProfileId}:${profileThemeSongSrc}`
      : null;
  const shouldPlayProfileThemeSong = Boolean(profileThemeSongSrc);

  useEffect(() => {
    const audio = profileThemeAudioRef.current;

    if (!audio) {
      return;
    }

    audio.loop = true;

    if (!shouldPlayProfileThemeSong) {
      audio.pause();
      audio.currentTime = 0;
      setProfileThemeIsPlaying(false);
      setProfileThemeCurrentTime(0);
      setProfileThemeDuration(0);
      setIsProfileThemePanelOpen(false);
      profileThemeAutoplayAttemptedRef.current = null;
      return;
    }
    audio.volume = profileThemeVolume;

    if (profileThemeAutoplayAttemptedRef.current !== profileThemeSongKey) {
      profileThemeAutoplayAttemptedRef.current = profileThemeSongKey;
      void audio.play().catch(() => {
      });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      setProfileThemeIsPlaying(false);
      setProfileThemeCurrentTime(0);
      setProfileThemeDuration(0);
    };
  }, [profileThemeSongKey, profileThemeSongSrc, shouldPlayProfileThemeSong]);

  useEffect(() => {
    const audio = profileThemeAudioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = profileThemeVolume;
  }, [profileThemeVolume]);

  useEffect(() => {
    const audio = profileThemeAudioRef.current;

    if (!audio) {
      return;
    }

    let animationFrameId: number | null = null;
    const syncAudioState = (force = false) => {
      const nextIsPlaying = !audio.paused;
      const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;

      setProfileThemeIsPlaying((currentValue) =>
        currentValue === nextIsPlaying ? currentValue : nextIsPlaying
      );
      setProfileThemeCurrentTime((currentValue) =>
        force || Math.abs(currentValue - nextCurrentTime) >= PROFILE_THEME_TIMELINE_UPDATE_STEP_SECONDS
          ? nextCurrentTime
          : currentValue
      );
      setProfileThemeDuration((currentValue) =>
        force || Math.abs(currentValue - nextDuration) >= PROFILE_THEME_TIMELINE_UPDATE_STEP_SECONDS
          ? nextDuration
          : currentValue
      );
    };
    const syncAudioTimelineState = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        syncAudioState(false);
      });
    };

    const syncAudioStateImmediate = () => {
      syncAudioState(true);
    };

    syncAudioStateImmediate();
    audio.addEventListener("play", syncAudioStateImmediate);
    audio.addEventListener("pause", syncAudioStateImmediate);
    audio.addEventListener("timeupdate", syncAudioTimelineState);
    audio.addEventListener("loadedmetadata", syncAudioStateImmediate);
    audio.addEventListener("durationchange", syncAudioStateImmediate);
    audio.addEventListener("ended", syncAudioStateImmediate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      audio.removeEventListener("play", syncAudioStateImmediate);
      audio.removeEventListener("pause", syncAudioStateImmediate);
      audio.removeEventListener("timeupdate", syncAudioTimelineState);
      audio.removeEventListener("loadedmetadata", syncAudioStateImmediate);
      audio.removeEventListener("durationchange", syncAudioStateImmediate);
      audio.removeEventListener("ended", syncAudioStateImmediate);
    };
  }, [profileThemeSongSrc]);

  const isActiveProfileOnline = isPresenceOnlineNow(activePresence);
  const hasUsername = Boolean(activeProfile?.login?.trim());
  const requiresUsernamePasswordConfirmation = Boolean(
    isOwner && visibleCurrentUser?.providerIds?.includes("password")
  );
  const profileRoles = deriveVisibleProfileRoles(activeProfile);
  const normalizedProfileRoles = profileRoles;
  const canUseEnhancedAvatarMedia = canUseEnhancedAvatarMediaForRoles(activeProfile?.roles);
  const topProfileRole = profileRoles[0] ?? null;
  const profileHeadlineStyle = roleHeadlineStyle(topProfileRole);
  const normalizedProfileRoleSet = new Set(profileRoles.map((role) => normalizeRoleName(role)));
  const isCurrentAccountBanned = visibleCurrentUser?.isBanned === true;
  const subscriptionSummary = activeProfile?.isBanned === true
    ? {
        title: "Account Banned",
        badgeRole: "banned",
        status: "Restricted",
        description: "This account is blocked. Sign-in actions, profile changes, and new activity are disabled until it is unbanned.",
      }
    : normalizedProfileRoleSet.has("root")
    ? {
        title: "Cheat Access",
        badgeRole: "root",
        status: "Internal",
        description: "Root access is active for this account. Profile tools and privileged controls are unlocked.",
      }
    : normalizedProfileRoleSet.has("co-owner")
      ? {
          title: "Co-Owner Access",
          badgeRole: "co-owner",
          status: "Priority",
          description: "Co-owner access is active. Shared management and elevated profile controls are available.",
        }
      : normalizedProfileRoleSet.has("support")
        ? {
            title: "Support Access",
            badgeRole: "support",
            status: "Available",
            description: "Support access is active. Staff-facing assistance tools and profile support workflows are available here.",
          }
      : normalizedProfileRoleSet.has("sponsor")
        ? {
            title: "Sponsor Access",
            badgeRole: "sponsor",
            status: "Active",
            description: "Sponsor access is active for this account. Premium profile styling and future subscription perks can be surfaced here.",
          }
        : normalizedProfileRoleSet.has("moderator")
          ? {
              title: "Moderator Access",
              badgeRole: "moderator",
              status: "Enabled",
              description: "Moderator access is active. Comment moderation and profile management tools stay available here.",
            }
          : {
              title: "Free Access",
              badgeRole: "user",
              status: "Base",
              description: "This account is currently on the free tier. Future subscription upgrades and perks can be shown in this block.",
            };
  const subscriptionBadgeStyle = roleBadgeStyle(subscriptionSummary.badgeRole);
  const shouldShowVerificationBanner = Boolean(
    isOwner &&
      !activeProfile?.isBanned &&
      activeProfile?.email &&
      activeProfile.emailVerified === false &&
      activeProfile.verificationRequired !== false
  );
  const canManageRoleAssignments = Boolean(visibleCurrentUser && canManageRoles(visibleCurrentUser.roles));
  const actorIsRootManager = hasRoleInSelection(visibleCurrentUser?.roles ?? [], "root");
  const actorIsCoOwnerManager = hasRoleInSelection(visibleCurrentUser?.roles ?? [], "co-owner");
  const targetHasRootRole = hasRoleInSelection(activeProfile?.roles ?? [], "root");
  const isCoOwnerBlockedByRootTarget = Boolean(
    actorIsCoOwnerManager && !actorIsRootManager && targetHasRootRole
  );
  const canOpenAdminPanel = Boolean(
    canManageRoleAssignments &&
    activeProfile?.profileId &&
    !isCoOwnerBlockedByRootTarget
  );
  const isTargetBanned = activeProfile?.isBanned === true;
  const targetVerificationStatus = !activeProfile?.email
    ? "no-email"
    : activeProfile.emailVerified === true
      ? "verified"
      : activeProfile.emailVerified === false && activeProfile.verificationRequired !== false
        ? "locked"
        : "unknown";
  const isTargetVerificationLocked = targetVerificationStatus === "locked";
  const isTargetVerified = targetVerificationStatus === "verified";
  const isAdminSelfTarget = Boolean(canOpenAdminPanel && isOwner);
  const shouldShowPendingState =
    !authError &&
    !activeProfile &&
    (!authReady || !authStateSettled || isProfileLoading || (requestedProfileId !== null && !profileError));

  useEffect(() => {
    setIsProfileControlsOpen(false);
    setUsernamePasswordInput("");
  }, [activeProfile?.profileId, isOwner]);

  useEffect(() => {
    if (!authReady || !authStateSettled || !isCurrentAccountVerificationLocked) {
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge) {
      router.replace("/");
      return;
    }

    let isCancelled = false;

    bridge
      .refreshVerificationStatus()
      .then((snapshot) => {
        if (isCancelled) {
          return;
        }

        setCurrentUser(snapshot);

        if (isEmailVerificationLockedForProfile(snapshot)) {
          router.replace("/");
        }
      })
      .catch(() => {
        if (!isCancelled) {
          router.replace("/");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [authReady, authStateSettled, isCurrentAccountVerificationLocked, router]);

  useEffect(() => {
    if (!hasHydrated || !shouldShowPendingState) {
      setShowPendingState(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowPendingState(true);
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasHydrated, shouldShowPendingState]);

  const primaryName = activeProfile ? nameOf(activeProfile) : "Sakura User";
  const initials = activeProfile ? initialsOf(activeProfile) : "SA";
  const activeProfileAvatarUrl = resolveProfileAvatarUrl(activeProfile);
  const hasActiveProfileAvatar = Boolean(activeProfileAvatarUrl);
  const activeProfileRoleSignature = activeProfile?.roles?.join("|") ?? "";

  useEffect(() => {
    if (!activeProfile?.profileId) {
      return;
    }

    writeCachedProfileComments(
      activeProfile.profileId,
      comments.filter((comment) => comment.pending !== true)
    );
  }, [activeProfile?.profileId, comments]);

  const applyUpdatedProfileSnapshot = (snapshot: UserProfile | null) => {
    if (!snapshot) {
      return;
    }

    if (typeof snapshot.profileId === "number" && snapshot.profileId > 0) {
      writeCachedProfileSnapshot(snapshot);
    }

    const snapshotProfileId =
      typeof snapshot.profileId === "number" && snapshot.profileId > 0
        ? snapshot.profileId
        : null;
    const matchesSnapshot = (profile: UserProfile | null | undefined) =>
      Boolean(
        profile &&
          (
            profile.uid === snapshot.uid ||
            (snapshotProfileId !== null && profile.profileId === snapshotProfileId)
          )
      );

    if (matchesSnapshot(activeProfile)) {
      setProfile(snapshot);
    }

    if (matchesSnapshot(visibleCurrentUser)) {
      setCurrentUser(snapshot);
    }

    setComments((currentComments) =>
      currentComments.map((comment) => {
        const matchesCommentAuthor =
          (typeof comment.authorUid === "string" && comment.authorUid === snapshot.uid) ||
          (snapshotProfileId !== null && comment.authorProfileId === snapshotProfileId);

        if (!matchesCommentAuthor) {
          return comment;
        }

        return {
          ...comment,
          authorPhotoURL: snapshot.photoURL ?? null,
          authorAccentRole: pickCommentAuthorAccentRole(snapshot.roles) ?? comment.authorAccentRole,
        };
      })
    );

    if (snapshotProfileId !== null) {
      setCommentAuthorProfiles((currentProfiles) => ({
        ...currentProfiles,
        [snapshotProfileId]: snapshot,
      }));

      setCommentAuthorProfilesByCommentId((currentProfilesByCommentId) => {
        let hasChanges = false;
        const nextProfilesByCommentId: Record<string, UserProfile> = {};

        Object.entries(currentProfilesByCommentId).forEach(([commentId, profile]) => {
          if (
            profile &&
            (
              profile.uid === snapshot.uid ||
              profile.profileId === snapshotProfileId
            )
          ) {
            nextProfilesByCommentId[commentId] = snapshot;
            hasChanges = true;
            return;
          }

          nextProfilesByCommentId[commentId] = profile;
        });

        return hasChanges ? nextProfilesByCommentId : currentProfilesByCommentId;
      });
    }
  };
  const normalizeCommentAuthorKey = (value: string | null | undefined) =>
    typeof value === "string"
      ? value.trim().replace(/^@+/, "").toLocaleLowerCase().replace(/\s+/g, " ")
      : "";
  const isCommentMentionBoundary = (value: string | undefined) =>
    !value || !/[A-Za-z\u0400-\u04FF0-9._-]/.test(value);
  const extractCommentMentionKeys = (value: string | null | undefined) => {
    if (typeof value !== "string" || !value) {
      return [];
    }

    const mentionKeys: string[] = [];
    COMMENT_MENTION_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = COMMENT_MENTION_PATTERN.exec(value))) {
      const matchIndex = match.index;
      const nextIndex = matchIndex + match[0].length;
      const previousCharacter = matchIndex > 0 ? value[matchIndex - 1] : undefined;
      const nextCharacter = nextIndex < value.length ? value[nextIndex] : undefined;

      if (!isCommentMentionBoundary(previousCharacter) || !isCommentMentionBoundary(nextCharacter)) {
        continue;
      }

      const mentionKey = normalizeCommentAuthorKey(match[1]);

      if (mentionKey && !mentionKeys.includes(mentionKey)) {
        mentionKeys.push(mentionKey);
      }
    }

    return mentionKeys;
  };
  const isCommentMentionTokenCharacter = (value: string | null | undefined) =>
    Boolean(value) && COMMENT_MENTION_TOKEN_CHARACTER_PATTERN.test(value ?? "");
  const getCommentMentionDraft = (value: string, caret: number): MentionDraft | null => {
    if (!value || caret < 0 || caret > value.length) {
      return null;
    }

    const beforeCaret = value.slice(0, caret);
    const match = beforeCaret.match(COMMENT_MENTION_DRAFT_PATTERN);

    if (!match) {
      return null;
    }

    const query = normalizeCommentAuthorKey(match[2]);

    if (!query || query.length < 2) {
      return null;
    }

    let mentionEnd = beforeCaret.length;

    while (mentionEnd < value.length && isCommentMentionTokenCharacter(value[mentionEnd])) {
      mentionEnd += 1;
    }

    return {
      start: beforeCaret.length - match[2].length - 1,
      end: mentionEnd,
      query,
    };
  };
  const resolveMentionProfileRole = (profile: UserProfile | null | undefined) => {
    if (!profile) {
      return null;
    }

    if (profile.isBanned === true) {
      return "banned";
    }

    return pickCommentAuthorAccentRole(profile.roles) ?? null;
  };
  const renderProfileHoverPreview = (
    previewProfile: UserProfile,
    fallbackLabel: string,
    align: "center" | "start" = "center"
  ) => {
    const mentionProfileRole = resolveMentionProfileRole(previewProfile);
    const mentionPreviewName = profileNameOf(previewProfile);
    const mentionPreviewInitials = initialsOf(previewProfile);
    const mentionPreviewBadgeRole = deriveVisibleProfileRoles(previewProfile)[0] ?? "user";
    const mentionPreviewAlt = mentionPreviewName || fallbackLabel;
    const previewAlignmentClassName =
      align === "start" ? "left-0 translate-x-0" : "left-1/2 -translate-x-1/2";
    const previewArrowClassName =
      align === "start"
        ? "left-[28px] -translate-x-1/2"
        : "left-1/2 -translate-x-1/2";

    return (
      <span className={`absolute ${previewAlignmentClassName} top-full z-30 mt-3 w-[260px] translate-y-2 rounded-[22px] border border-[#2a2023] bg-[#0c0b0d] px-4 py-4 opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.46),0_0_35px_rgba(255,183,197,0.08)] transition duration-150 ease-out invisible group-hover/comment-profile:visible group-hover/comment-profile:translate-y-0 group-hover/comment-profile:opacity-100 group-focus-within/comment-profile:visible group-focus-within/comment-profile:translate-y-0 group-focus-within/comment-profile:opacity-100`}>
        <span className={`absolute ${previewArrowClassName} top-0 h-3 w-3 -translate-y-1/2 rotate-45 border-l border-t border-[#2a2023] bg-[#0c0b0d]`} />
        <span className="flex items-start gap-3">
          {resolveProfileAvatarUrl(previewProfile) ? (
            <AvatarMedia
              src={resolveProfileAvatarUrl(previewProfile) ?? ""}
              alt={mentionPreviewAlt}
              loading="lazy"
              decoding="async"
              className="h-12 w-12 shrink-0 rounded-[18px] border border-[#2a2022] object-cover shadow-[0_0_18px_rgba(255,183,197,0.12)]"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#2a2022] bg-[#171012] text-xs font-black uppercase text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.08)]">
              {mentionPreviewInitials}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <a
              href={typeof previewProfile.profileId === "number" ? profilePath(previewProfile.profileId) : "#"}
              style={roleCommentAuthorStyle(mentionProfileRole)}
              className="block truncate text-sm font-black uppercase tracking-[0.03em] transition hover:brightness-125 hover:text-white"
            >
              {mentionPreviewName}
            </a>
            <span className="mt-2 flex items-center justify-between gap-3">
              <span
                style={{ ...roleBadgeStyle(mentionPreviewBadgeRole), ...roleBadgeTextStyle }}
                className="inline-flex max-w-full items-center truncate whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold"
              >
                <span aria-hidden="true" className="inline-flex items-center truncate">
                  {renderRoleBadgeText(mentionPreviewBadgeRole)}
                </span>
              </span>
              {typeof previewProfile.profileId === "number" ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] text-[#b78a95]"
                >
                  <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff9fbd] shadow-[0_0_10px_rgba(255,159,189,0.7)]" />
                  <span className="truncate">UID: {previewProfile.profileId}</span>
                </span>
              ) : null}
            </span>
          </span>
        </span>
      </span>
    );
  };
  const resolveComposerMentionProfiles = (
    value: string,
    profilesByKey: Record<string, UserProfile>
  ) =>
    extractCommentMentionKeys(value)
      .map((mentionKey) => profilesByKey[mentionKey])
      .filter((profile): profile is UserProfile => Boolean(profile))
      .filter(
        (profile, index, profiles) =>
          index === profiles.findIndex((candidate) => candidate.uid === profile.uid)
      );
  const filterComposerMentionProfilesByValue = (
    value: string,
    profilesByKey: Record<string, UserProfile>
  ) => {
    const activeKeys = new Set(extractCommentMentionKeys(value));

    if (!activeKeys.size) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(profilesByKey).filter(([mentionKey]) => activeKeys.has(mentionKey))
    );
  };
  const removeMentionFromComposerValue = (value: string, login: string | null | undefined) => {
    const mentionKeyToRemove = normalizeCommentAuthorKey(login);

    if (!value || !mentionKeyToRemove) {
      return value;
    }

    const parts: string[] = [];
    COMMENT_MENTION_PATTERN.lastIndex = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let removed = false;

    while ((match = COMMENT_MENTION_PATTERN.exec(value))) {
      const matchIndex = match.index;
      const nextIndex = matchIndex + match[0].length;
      const previousCharacter = matchIndex > 0 ? value[matchIndex - 1] : undefined;
      const nextCharacter = nextIndex < value.length ? value[nextIndex] : undefined;

      if (!isCommentMentionBoundary(previousCharacter) || !isCommentMentionBoundary(nextCharacter)) {
        continue;
      }

      const currentMentionKey = normalizeCommentAuthorKey(match[1]);

      if (currentMentionKey !== mentionKeyToRemove) {
        continue;
      }

      if (lastIndex < matchIndex) {
        parts.push(value.slice(lastIndex, matchIndex));
      }

      removed = true;
      lastIndex = nextIndex;
    }

    if (!removed) {
      return value;
    }

    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }

    return parts
      .join("")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .trim();
  };
  const removeMentionAttachment = (mode: MentionComposerMode, profile: UserProfile) => {
    const nextValue =
      mode === "new"
        ? removeMentionFromComposerValue(commentInput, profile.login)
        : removeMentionFromComposerValue(editingCommentMessage, profile.login);

    if (mode === "new") {
      setCommentInput(nextValue);
      setCommentDraftMentionProfilesByKey((currentProfiles) =>
        filterComposerMentionProfilesByValue(nextValue, currentProfiles)
      );
    } else {
      setEditingCommentMessage(nextValue);
      setEditingDraftMentionProfilesByKey((currentProfiles) =>
        filterComposerMentionProfilesByValue(nextValue, currentProfiles)
      );
    }

    window.requestAnimationFrame(() => {
      const nextTextarea =
        mode === "new" ? commentTextareaRef.current : editingCommentTextareaRef.current;

      if (!nextTextarea) {
        return;
      }

      nextTextarea.focus();
      nextTextarea.setSelectionRange(nextValue.length, nextValue.length);
      syncTextareaHeight(nextTextarea);
    });
  };
  const renderComposerMentionAttachments = (
    mode: MentionComposerMode,
    value: string,
    profilesByKey: Record<string, UserProfile>
  ) => {
    const mentionProfiles = resolveComposerMentionProfiles(value, profilesByKey);

    if (!mentionProfiles.length) {
      return null;
    }

    return (
      <div className="mt-3 rounded-[20px] border border-[#232323] bg-[#090909] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gray-500">
          Attached Accounts
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {mentionProfiles.map((profile) => {
            const profileRole = resolveMentionProfileRole(profile);
            const profileBadgeRole = deriveVisibleProfileRoles(profile)[0] ?? "user";
            const profilePreviewName = profileNameOf(profile);
            const profilePreviewInitials = initialsOf(profile);
            const profileMentionLogin = profile.login ? `@${profile.login}` : profilePreviewName;
            const showProfileBadge = mode !== "edit";
            const profileSecondaryName =
              profilePreviewName && profilePreviewName !== profile.login
                ? profilePreviewName
                : null;

            return (
              <div
                key={`${mode}:${profile.uid}`}
                className="w-full min-w-0 overflow-hidden rounded-[18px] border border-[#2a2022] bg-[#120d11]"
              >
                <div className="flex min-w-0 items-stretch">
                  <a
                    href={typeof profile.profileId === "number" ? profilePath(profile.profileId) : "#"}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition hover:bg-[#171014]"
                  >
                  {resolveProfileAvatarUrl(profile) ? (
                    <AvatarMedia
                      src={resolveProfileAvatarUrl(profile) ?? ""}
                      alt={profilePreviewName}
                      loading="lazy"
                      decoding="async"
                        className="h-10 w-10 shrink-0 rounded-2xl border border-[#2a2022] object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2a2022] bg-[#171012] text-[11px] font-black uppercase text-[#ffb7c5]">
                        {profilePreviewInitials}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        style={roleCommentAuthorStyle(profileRole)}
                        className="block truncate text-sm font-semibold"
                      >
                        {profileMentionLogin}
                      </span>
                      {profileSecondaryName ? (
                        <span className="mt-1 block truncate text-xs text-gray-400">
                          {profileSecondaryName}
                        </span>
                      ) : null}
                    </span>
                    {showProfileBadge ? (
                      <span
                        style={{ ...roleBadgeStyle(profileBadgeRole), ...roleBadgeTextStyle }}
                        className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold"
                      >
                        <span aria-hidden="true" className="inline-flex items-center">
                          {renderRoleBadgeText(profileBadgeRole)}
                        </span>
                      </span>
                    ) : null}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeMentionAttachment(mode, profile)}
                    className="inline-flex min-w-[112px] shrink-0 items-center justify-center border-l border-[#2a2022] bg-[#140d11] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:bg-[#1a1115] hover:text-white"
                    aria-label={`Remove ${profilePreviewName} mention`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="mt-3 rounded-[20px] border border-[#232323] bg-[#090909] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gray-500">
          Attached Accounts
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {mentionProfiles.map((profile) => {
            const profileRole = resolveMentionProfileRole(profile);
            const profileBadgeRole = deriveVisibleProfileRoles(profile)[0] ?? "user";
            const profilePreviewName = profileNameOf(profile);
            const profilePreviewInitials = initialsOf(profile);

            return (
              <div
                key={`${mode}:${profile.uid}`}
                className="group relative w-full min-w-0"
              >
                <a
                  href={typeof profile.profileId === "number" ? profilePath(profile.profileId) : "#"}
                  className="flex w-full min-w-0 items-center gap-3 rounded-[18px] border border-[#2a2022] bg-[#120d11] px-4 py-3 pr-16 transition hover:border-[#ffb7c5]/40 hover:bg-[#171014]"
                >
                  {resolveProfileAvatarUrl(profile) ? (
                    <AvatarMedia
                      src={resolveProfileAvatarUrl(profile) ?? ""}
                      alt={profilePreviewName}
                      loading="lazy"
                      decoding="async"
                      className="h-9 w-9 shrink-0 rounded-full border border-[#2a2022] object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2a2022] bg-[#171012] text-[10px] font-black uppercase text-[#ffb7c5]">
                      {profilePreviewInitials}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span
                      style={roleCommentAuthorStyle(profileRole)}
                      className="block truncate text-xs font-semibold"
                    >
                      {profilePreviewName}
                    </span>
                    <span
                      style={{ ...roleBadgeStyle(profileBadgeRole), ...roleBadgeTextStyle }}
                      className="mt-1 inline-flex max-w-full items-center truncate whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold"
                    >
                      <span aria-hidden="true" className="inline-flex items-center truncate">
                        {renderRoleBadgeText(profileBadgeRole)}
                      </span>
                    </span>
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => removeMentionAttachment(mode, profile)}
                  className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] text-[16px] font-bold text-[#ffb7c5] opacity-0 transition hover:border-[#ffb7c5]/40 hover:text-white group-hover:opacity-100"
                  aria-label={`Remove ${profilePreviewName} mention`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const renderCommentMessageWithMentions = (value: string) => {
    const parts: ReactNode[] = [];
    COMMENT_MENTION_PATTERN.lastIndex = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = COMMENT_MENTION_PATTERN.exec(value))) {
      const matchIndex = match.index;
      const nextIndex = matchIndex + match[0].length;
      const previousCharacter = matchIndex > 0 ? value[matchIndex - 1] : undefined;
      const nextCharacter = nextIndex < value.length ? value[nextIndex] : undefined;

      if (!isCommentMentionBoundary(previousCharacter) || !isCommentMentionBoundary(nextCharacter)) {
        continue;
      }

      if (lastIndex < matchIndex) {
        parts.push(value.slice(lastIndex, matchIndex));
      }

      const mentionLogin = match[1];
      const mentionKey = normalizeCommentAuthorKey(mentionLogin);
      const mentionProfile = mentionKey ? commentMentionProfilesByKey[mentionKey] : null;
      const mentionText = `@${mentionLogin}`;
      const mentionRole = resolveMentionProfileRole(mentionProfile);
      const mentionDisplayText = mentionProfile ? profileNameOf(mentionProfile) : mentionText;

      if (mentionProfile?.profileId) {
        parts.push(
          <span
            key={`${mentionKey}:${matchIndex}`}
            className="group/comment-profile relative inline-flex max-w-full align-baseline"
          >
            <a
              href={profilePath(mentionProfile.profileId)}
              style={roleCommentAuthorStyle(mentionRole)}
              className="inline-flex max-w-full items-baseline truncate font-semibold underline decoration-transparent transition duration-150 hover:brightness-125 hover:decoration-current focus-visible:decoration-current"
            >
              {mentionDisplayText}
            </a>
            {renderProfileHoverPreview(mentionProfile, mentionText)}
          </span>
        );
      } else {
        parts.push(mentionText);
      }

      lastIndex = nextIndex;
    }

    if (!parts.length) {
      return value;
    }

    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }

    return parts;
  };
  const updateMentionComposerCaret = (
    mode: MentionComposerMode,
    element: HTMLTextAreaElement | null
  ) => {
    if (!element) {
      return;
    }

    const nextCaret = element.selectionStart ?? element.value.length;
    setActiveMentionComposer(mode);

    if (mode === "new") {
      setCommentMentionCaret(nextCaret);
      return;
    }

    setEditingCommentMentionCaret(nextCaret);
  };
  const clearMentionSuggestions = () => {
    setMentionSuggestions([]);
    setIsMentionSuggestionsLoading(false);
  };
  const getActiveMentionDraft = (): MentionDraft | null => {
    if (activeMentionComposer === "edit") {
      return getCommentMentionDraft(editingCommentMessage, editingCommentMentionCaret);
    }

    if (activeMentionComposer === "new") {
      return getCommentMentionDraft(commentInput, commentMentionCaret);
    }

    return null;
  };
  const applyMentionSuggestion = (mode: MentionComposerMode, profile: UserProfile) => {
    const login = profile.login?.trim();

    if (!login) {
      return;
    }

    const textarea =
      mode === "new" ? commentTextareaRef.current : editingCommentTextareaRef.current;
    const currentValue = mode === "new" ? commentInput : editingCommentMessage;
    const currentCaret =
      textarea?.selectionStart ??
      (mode === "new" ? commentMentionCaret : editingCommentMentionCaret);
    const mentionDraft = getCommentMentionDraft(currentValue, currentCaret);

    if (!mentionDraft) {
      return;
    }

    const replacement = `@${login}`;
    const nextCharacter = currentValue[mentionDraft.end];
    const needsTrailingSpace = !nextCharacter;
    const nextValue = `${currentValue.slice(0, mentionDraft.start)}${replacement}${needsTrailingSpace ? " " : ""}${currentValue.slice(mentionDraft.end)}`;
    const nextCaret = mentionDraft.start + replacement.length + (needsTrailingSpace ? 1 : 0);

    if (mode === "new") {
      setCommentInput(nextValue);
      setCommentMentionCaret(nextCaret);
    } else {
      setEditingCommentMessage(nextValue);
      setEditingCommentMentionCaret(nextCaret);
    }

    clearMentionSuggestions();
    setActiveMentionComposer(mode);

    window.requestAnimationFrame(() => {
      const nextTextarea =
        mode === "new" ? commentTextareaRef.current : editingCommentTextareaRef.current;

      if (!nextTextarea) {
        return;
      }

      nextTextarea.focus();
      nextTextarea.setSelectionRange(nextCaret, nextCaret);
      syncTextareaHeight(nextTextarea);
    });
  };
  const renderMentionSuggestions = (mode: MentionComposerMode) => {
    if (activeMentionComposer !== mode) {
      return null;
    }

    const activeDraft = getActiveMentionDraft();

    if (!activeDraft) {
      return null;
    }

    if (!isMentionSuggestionsLoading && !mentionSuggestions.length) {
      return (
        <div className="mt-3 rounded-[20px] border border-[#232323] bg-[#090909] px-4 py-3">
          <p className="text-xs text-gray-500">No matching logins.</p>
        </div>
      );
    }

    return (
      <div className="mt-3 overflow-hidden rounded-[20px] border border-[#232323] bg-[#090909] shadow-[0_0_24px_rgba(255,183,197,0.06)]">
        <div className="border-b border-[#1b1b1b] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gray-500">
            Mention Suggestions
          </p>
        </div>
        {isMentionSuggestionsLoading ? (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500">Searching...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {mentionSuggestions.map((profile) => {
              const mentionRole = resolveMentionProfileRole(profile);
              const mentionDisplayName = profile.displayName?.trim();
              const mentionNickname = profile.login ? `@${profile.login}` : "";
              const mentionPreviewInitials = initialsOf(profile);
              const mentionBadgeRole = deriveVisibleProfileRoles(profile)[0] ?? "user";

              return (
                <button
                  key={profile.uid}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyMentionSuggestion(mode, profile);
                  }}
                  className="flex items-center gap-3 border-b border-[#171717] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#120d11]"
                >
                  {resolveProfileAvatarUrl(profile) ? (
                    <AvatarMedia
                      src={resolveProfileAvatarUrl(profile) ?? ""}
                      alt={mentionDisplayName || mentionNickname}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 shrink-0 rounded-2xl border border-[#2a2022] object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2a2022] bg-[#171012] text-[11px] font-black uppercase text-[#ffb7c5]">
                      {mentionPreviewInitials}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      style={roleCommentAuthorStyle(mentionRole)}
                      className="block truncate text-sm font-semibold"
                    >
                      {mentionNickname}
                    </span>
                    {mentionDisplayName ? (
                      <span className="mt-1 block truncate text-xs text-gray-400">
                        {mentionDisplayName}
                      </span>
                    ) : null}
                  </span>
                  <span
                    style={{ ...roleBadgeStyle(mentionBadgeRole), ...roleBadgeTextStyle }}
                    className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold"
                  >
                    <span aria-hidden="true" className="inline-flex items-center">
                      {renderRoleBadgeText(mentionBadgeRole)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  const commentMatchesUser = (comment: ProfileComment, user: UserProfile | null) => {
    if (!user) {
      return false;
    }

    if (comment.authorUid && comment.authorUid === user.uid) {
      return true;
    }

    if (
      typeof comment.authorProfileId === "number" &&
      typeof user.profileId === "number" &&
      comment.authorProfileId === user.profileId
    ) {
      return true;
    }

    const authorKey = normalizeCommentAuthorKey(comment.authorName);

    if (!authorKey) {
      return false;
    }

    const userKeys = [
      user.login,
      user.displayName,
      nameOf(user),
      typeof user.profileId === "number" ? `Profile #${user.profileId}` : null,
    ];

    return userKeys.some((value) => normalizeCommentAuthorKey(value) === authorKey);
  };
  const resolveCommentAuthorProfile = (comment: ProfileComment) => {
    const cachedCommentAuthorProfile = commentAuthorProfilesByCommentId[comment.id];

    if (cachedCommentAuthorProfile) {
      return cachedCommentAuthorProfile;
    }

    if (typeof comment.authorProfileId === "number") {
      const cachedCommentAuthorProfileByProfileId = commentAuthorProfiles[comment.authorProfileId];

      if (cachedCommentAuthorProfileByProfileId) {
        return cachedCommentAuthorProfileByProfileId;
      }

      const persistedCommentAuthorProfile =
        readCachedProfileSnapshot<UserProfile>(comment.authorProfileId);

      if (persistedCommentAuthorProfile) {
        return persistedCommentAuthorProfile;
      }
    }

    if (activeProfile && commentMatchesUser(comment, activeProfile)) {
      return activeProfile;
    }

    if (visibleCurrentUser && commentMatchesUser(comment, visibleCurrentUser)) {
      return visibleCurrentUser;
    }

    return null;
  };
  const resolveCommentAuthorRole = (comment: ProfileComment) => {
    const resolvedCommentAuthorProfile = resolveCommentAuthorProfile(comment);

    if (resolvedCommentAuthorProfile) {
      if (resolvedCommentAuthorProfile.isBanned === true) {
        return "banned";
      }

      return pickCommentAuthorAccentRole(resolvedCommentAuthorProfile.roles) ?? null;
    }

    if (comment.authorAccentRole) {
      const normalizedRole = normalizeRoleName(comment.authorAccentRole);
      return normalizedRole && !REMOVED_ROLE_NAMES.has(normalizedRole) ? normalizedRole : null;
    }

    return null;
  };
  const resolveCommentAuthorPhotoURL = (comment: ProfileComment) => {
    const resolvedCommentAuthorProfile = resolveCommentAuthorProfile(comment);

    const resolvedProfileAvatarUrl = resolveProfileAvatarUrl(resolvedCommentAuthorProfile);

    if (resolvedProfileAvatarUrl) {
      return resolvedProfileAvatarUrl;
    }

    if (comment.authorPhotoURL) {
      return comment.authorPhotoURL;
    }

    return null;
  };
  const canDeleteComment = (comment: ProfileComment) =>
    Boolean(
      visibleCurrentUser &&
        !isCurrentAccountVerificationLocked &&
        (() => {
          const ownsTargetProfile =
            isOwner &&
            typeof activeProfile?.profileId === "number" &&
            comment.profileId === activeProfile.profileId;
          const resolvedCommentAuthorRole = resolveCommentAuthorRole(comment);

          return (
            comment.authorUid === visibleCurrentUser.uid ||
            ownsTargetProfile ||
            canDeleteCommentAsModerator(
              {
                roles: visibleCurrentUser.roles,
                profileId: visibleCurrentUser.profileId,
              },
              comment,
              resolvedCommentAuthorRole
            )
          );
        })()
    );
  const canEditComment = (comment: ProfileComment) =>
    Boolean(
      visibleCurrentUser &&
        !isCurrentAccountVerificationLocked &&
        (comment.authorUid === visibleCurrentUser.uid ||
          canManageRoles(visibleCurrentUser.roles))
    );

  useEffect(() => {
    if (!activeProfile) {
      setDraftRoles([]);
      setRolesError(null);
      setRolesSuccess(null);
      setVerificationError(null);
      setVerificationSuccess(null);
      setAdminVerificationError(null);
      setAdminVerificationSuccess(null);
      setComments([]);
      setCommentAuthorProfiles({});
      setCommentAuthorProfilesByCommentId({});
      setCommentMentionProfilesByKey({});
      setCommentDraftMentionProfilesByKey({});
      setEditingDraftMentionProfilesByKey({});
      setCommentsError(null);
      setIsAdminPanelOpen(false);
      setBanError(null);
      setBanSuccess(null);
      setCommentInput("");
      setCommentError(null);
      setCommentSuccess(null);
      setActiveMentionComposer(null);
      setCommentMentionCaret(0);
      setEditingCommentMentionCaret(0);
      clearMentionSuggestions();
      setEditingCommentId(null);
      setEditingCommentMessage("");
      setEditingCommentMediaFile(null);
      setEditingCommentMediaPreviewUrl(null);
      setIsEditingCommentMediaRemoved(false);
      setIsCommentUpdating(false);
      setDeletingCommentId(null);
      setOpenCommentActionsMenuId(null);
      return;
    }

    setDraftRoles(normalizeRoleSelection(activeProfile.roles));
    setRolesError(null);
    setRolesSuccess(null);
    setVerificationError(null);
    setVerificationSuccess(null);
    setAdminVerificationError(null);
    setAdminVerificationSuccess(null);
    setBanError(null);
    setBanSuccess(null);
    setDisplayNameInput(activeProfile.displayName ?? activeProfile.login ?? "");
    setDisplayNameError(null);
    setDisplayNameSuccess(null);
    setUsernameInput(activeProfile.login ?? "");
    setUsernameError(null);
    setUsernameSuccess(null);
    setCommentInput("");
    setCommentError(null);
    setCommentSuccess(null);
    setActiveMentionComposer(null);
    setCommentMentionCaret(0);
    setEditingCommentMentionCaret(0);
    clearMentionSuggestions();
    setCommentDraftMentionProfilesByKey({});
    setEditingDraftMentionProfilesByKey({});
    setEditingCommentId(null);
    setEditingCommentMessage("");
    setEditingCommentMediaFile(null);
    setEditingCommentMediaPreviewUrl(null);
    setIsEditingCommentMediaRemoved(false);
    setIsCommentUpdating(false);
    setDeletingCommentId(null);
    setOpenCommentActionsMenuId(null);
  }, [activeProfile, activeProfileRoleSignature]);

  useEffect(() => {
    if (!canOpenAdminPanel) {
      setIsAdminPanelOpen(false);
    }
  }, [canOpenAdminPanel]);

  useEffect(() => {
    if (!openCommentActionsMenuId) {
      return;
    }

    const isCommentStillVisible = comments.some((comment) => comment.id === openCommentActionsMenuId);

    if (!isCommentStillVisible) {
      setOpenCommentActionsMenuId(null);
    }
  }, [comments, openCommentActionsMenuId]);

  useEffect(() => {
    if (!openCommentActionsMenuId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        setOpenCommentActionsMenuId(null);
        return;
      }

      if (target.closest("[data-comment-actions-menu]")) {
        return;
      }

      setOpenCommentActionsMenuId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenCommentActionsMenuId(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCommentActionsMenuId]);

  useEffect(() => {
    if (typeof window === "undefined" || !authReady || !authStateSettled || authError || !activeProfile?.profileId) {
      if (!activeProfile?.profileId) {
        setComments([]);
        setCommentAuthorProfiles({});
        setCommentAuthorProfilesByCommentId({});
        setCommentsError(null);
        setIsCommentsLoading(false);
      }
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;
    if (!bridge) return;

    let isCancelled = false;
    const cachedComments = readCachedProfileComments<ProfileComment>(activeProfile.profileId);

    setComments(cachedComments);
    setIsCommentsLoading(!cachedComments.length);
    setCommentsError(null);

    bridge
      .getProfileComments(activeProfile.profileId)
      .then((nextComments) => {
        if (isCancelled) return;
        setComments(nextComments);
      })
      .catch((error) => {
        if (isCancelled) return;
        if (!cachedComments.length) {
          setComments([]);
          setCommentsError(getProfileActionErrorMessage(error, "Could not load profile comments."));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCommentsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeProfile?.profileId, authReady, authStateSettled, authError]);

  useEffect(() => {
    if (!comments.length) {
      setCommentAuthorProfiles({});
      setCommentAuthorProfilesByCommentId({});
      setCommentMentionProfilesByKey({});
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge) {
      setCommentAuthorProfiles({});
      setCommentAuthorProfilesByCommentId({});
      return;
    }

    const nextCommentAuthorProfiles: Record<number, UserProfile> = {};

    if (typeof activeProfile?.profileId === "number") {
      nextCommentAuthorProfiles[activeProfile.profileId] = activeProfile;
    }

    if (typeof visibleCurrentUser?.profileId === "number") {
      nextCommentAuthorProfiles[visibleCurrentUser.profileId] = visibleCurrentUser;
    }

    const commentAuthorProfileIds = [...new Set(
      comments
        .map((comment) => comment.authorProfileId)
        .filter(
          (authorProfileId): authorProfileId is number =>
            typeof authorProfileId === "number" && authorProfileId > 0
        )
    )];

    commentAuthorProfileIds.forEach((authorProfileId) => {
      if (nextCommentAuthorProfiles[authorProfileId]) {
        return;
      }

      const cachedAuthorProfile = readCachedProfileSnapshot<UserProfile>(authorProfileId);

      if (cachedAuthorProfile && typeof cachedAuthorProfile.profileId === "number") {
        nextCommentAuthorProfiles[authorProfileId] = cachedAuthorProfile;
      }
    });

    const pendingCommentAuthorProfileIds = commentAuthorProfileIds.filter(
      (authorProfileId) => !nextCommentAuthorProfiles[authorProfileId]
    );

    if (!pendingCommentAuthorProfileIds.length) {
      setCommentAuthorProfiles(nextCommentAuthorProfiles);
      return;
    }

    let isCancelled = false;

    void Promise.all(
      pendingCommentAuthorProfileIds.map(async (authorProfileId) => {
        try {
          const nextAuthorProfile = await bridge.getProfileById(authorProfileId);

          return nextAuthorProfile && typeof nextAuthorProfile.profileId === "number"
            ? nextAuthorProfile
            : null;
        } catch (error) {
          return null;
        }
      })
    ).then((resolvedCommentAuthorProfiles) => {
      if (isCancelled) {
        return;
      }

      const resolvedCommentAuthorProfileMap = { ...nextCommentAuthorProfiles };

      resolvedCommentAuthorProfiles.forEach((resolvedCommentAuthorProfile) => {
        if (!resolvedCommentAuthorProfile || typeof resolvedCommentAuthorProfile.profileId !== "number") {
          return;
        }

        writeCachedProfileSnapshot(resolvedCommentAuthorProfile);
        resolvedCommentAuthorProfileMap[resolvedCommentAuthorProfile.profileId] =
          resolvedCommentAuthorProfile;
      });

      setCommentAuthorProfiles(resolvedCommentAuthorProfileMap);
    });

    return () => {
      isCancelled = true;
    };
  }, [comments, activeProfile, visibleCurrentUser]);

  useEffect(() => {
    if (!comments.length) {
      setCommentAuthorProfilesByCommentId({});
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge) {
      setCommentAuthorProfilesByCommentId({});
      return;
    }

    let isCancelled = false;

    void (async () => {
      const nextCommentAuthorProfilesByCommentId: Record<string, UserProfile> = {};

      comments.forEach((comment) => {
        if (typeof comment.authorProfileId === "number" && commentAuthorProfiles[comment.authorProfileId]) {
          nextCommentAuthorProfilesByCommentId[comment.id] = commentAuthorProfiles[comment.authorProfileId];
          return;
        }

        if (activeProfile && commentMatchesUser(comment, activeProfile)) {
          nextCommentAuthorProfilesByCommentId[comment.id] = activeProfile;
          return;
        }

        if (visibleCurrentUser && commentMatchesUser(comment, visibleCurrentUser)) {
          nextCommentAuthorProfilesByCommentId[comment.id] = visibleCurrentUser;
        }
      });

      const unresolvedComments = comments.filter(
        (comment) =>
          !nextCommentAuthorProfilesByCommentId[comment.id] &&
          normalizeCommentAuthorKey(comment.authorName)
      );

      if (unresolvedComments.length) {
        const profilesByAuthorKey = new Map<string, UserProfile>();
        const unresolvedAuthorNames = [...new Set(
          unresolvedComments.map((comment) => normalizeCommentAuthorKey(comment.authorName)).filter(Boolean)
        )];

        await Promise.all(
          unresolvedAuthorNames.map(async (unresolvedAuthorName) => {
            const sampleComment = unresolvedComments.find(
              (comment) => normalizeCommentAuthorKey(comment.authorName) === unresolvedAuthorName
            );

            if (!sampleComment) {
              return;
            }

            try {
              const resolvedCommentAuthorProfile = await bridge.getProfileByAuthorName(sampleComment.authorName);

              if (resolvedCommentAuthorProfile) {
                if (typeof resolvedCommentAuthorProfile.profileId === "number") {
                  writeCachedProfileSnapshot(resolvedCommentAuthorProfile);
                }
                profilesByAuthorKey.set(unresolvedAuthorName, resolvedCommentAuthorProfile);
              }
            } catch (error) {
            }
          })
        );

        unresolvedComments.forEach((comment) => {
          const authorKey = normalizeCommentAuthorKey(comment.authorName);

          if (!authorKey) {
            return;
          }

          const resolvedCommentAuthorProfile = profilesByAuthorKey.get(authorKey);

          if (resolvedCommentAuthorProfile) {
            nextCommentAuthorProfilesByCommentId[comment.id] = resolvedCommentAuthorProfile;
          }
        });
      }

      if (isCancelled) {
        return;
      }

      setCommentAuthorProfilesByCommentId(nextCommentAuthorProfilesByCommentId);
    })();

    return () => {
      isCancelled = true;
    };
  }, [comments, commentAuthorProfiles, activeProfile, visibleCurrentUser]);

  useEffect(() => {
    if (!comments.length) {
      setCommentMentionProfilesByKey({});
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge) {
      setCommentMentionProfilesByKey({});
      return;
    }

    let isCancelled = false;

    void (async () => {
      const nextMentionProfilesByKey: Record<string, UserProfile> = {};

      const knownProfiles = [activeProfile, visibleCurrentUser, ...Object.values(commentAuthorProfiles)].filter(
        (profile): profile is UserProfile => Boolean(profile)
      );

      knownProfiles.forEach((knownProfile) => {
        const knownLoginKey = normalizeCommentAuthorKey(knownProfile.login);

        if (knownLoginKey) {
          nextMentionProfilesByKey[knownLoginKey] = knownProfile;
        }
      });

      const mentionKeys = [...new Set(comments.flatMap((comment) => extractCommentMentionKeys(comment.message)))];
      const unresolvedMentionKeys = mentionKeys.filter((mentionKey) => !nextMentionProfilesByKey[mentionKey]);

      if (unresolvedMentionKeys.length) {
        await Promise.all(
          unresolvedMentionKeys.map(async (mentionKey) => {
            try {
              const resolvedMentionProfile = await bridge.getProfileByAuthorName(`@${mentionKey}`);

              if (resolvedMentionProfile) {
                nextMentionProfilesByKey[mentionKey] = resolvedMentionProfile;
              }
            } catch (error) {
            }
          })
        );
      }

      if (!isCancelled) {
        setCommentMentionProfilesByKey(nextMentionProfilesByKey);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [comments, activeProfile, visibleCurrentUser, commentAuthorProfiles]);

  useEffect(() => {
    const activeMentionDraft = getActiveMentionDraft();

    if (!activeMentionComposer || !activeMentionDraft) {
      clearMentionSuggestions();
      return;
    }

    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge) {
      clearMentionSuggestions();
      return;
    }

    let isCancelled = false;
    const cachedSuggestions = mentionSuggestionsCacheRef.current[activeMentionDraft.query];

    if (cachedSuggestions) {
      setIsMentionSuggestionsLoading(false);
      setMentionSuggestions(cachedSuggestions);
      return;
    }

    setIsMentionSuggestionsLoading(true);
    setMentionSuggestions([]);
    const searchTimeout = window.setTimeout(() => {
      bridge
        .getProfilesByLoginPrefix(activeMentionDraft.query)
        .then((profiles) => {
          if (isCancelled) {
            return;
          }

          const normalizedProfiles = profiles.filter((profile, index, entries) =>
            Boolean(profile.login) &&
            index === entries.findIndex((entry) => entry.uid === profile.uid)
          );

          mentionSuggestionsCacheRef.current[activeMentionDraft.query] = normalizedProfiles;
          setMentionSuggestions(normalizedProfiles);
        })
        .catch(() => {
          if (!isCancelled) {
            setMentionSuggestions([]);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsMentionSuggestionsLoading(false);
          }
        });
    }, 120);

    return () => {
      isCancelled = true;
      window.clearTimeout(searchTimeout);
    };
  }, [
    activeMentionComposer,
    commentInput,
    commentMentionCaret,
    editingCommentMessage,
    editingCommentMentionCaret,
  ]);

  useEffect(() => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    const syncMentionProfiles = async (
      value: string,
      setProfilesByKey: (value: Record<string, UserProfile>) => void
    ) => {
      const mentionKeys = extractCommentMentionKeys(value);

      if (!mentionKeys.length || !bridge) {
        setProfilesByKey({});
        return;
      }

      const nextProfilesByKey: Record<string, UserProfile> = {};
      const knownProfiles = [
        activeProfile,
        visibleCurrentUser,
        ...Object.values(commentAuthorProfiles),
        ...Object.values(commentMentionProfilesByKey),
      ].filter((profile): profile is UserProfile => Boolean(profile));

      knownProfiles.forEach((profile) => {
        const loginKey = normalizeCommentAuthorKey(profile.login);

        if (loginKey) {
          nextProfilesByKey[loginKey] = profile;
        }
      });

      const unresolvedMentionKeys = mentionKeys.filter((mentionKey) => !nextProfilesByKey[mentionKey]);

      if (unresolvedMentionKeys.length) {
        await Promise.all(
          unresolvedMentionKeys.map(async (mentionKey) => {
            try {
              const resolvedProfile = await bridge.getProfileByAuthorName(`@${mentionKey}`);

              if (resolvedProfile) {
                nextProfilesByKey[mentionKey] = resolvedProfile;
              }
            } catch (error) {
            }
          })
        );
      }

      setProfilesByKey(nextProfilesByKey);
    };

    void syncMentionProfiles(commentInput, setCommentDraftMentionProfilesByKey);
    void syncMentionProfiles(editingCommentMessage, setEditingDraftMentionProfilesByKey);
  }, [
    commentInput,
    editingCommentMessage,
    activeProfile,
    visibleCurrentUser,
    commentAuthorProfiles,
    commentMentionProfilesByKey,
  ]);

  useEffect(() => {
    if (!activeMentionComposer) {
      return;
    }

    const idleTimeout = window.setTimeout(() => {
      const activeTextarea =
        activeMentionComposer === "new"
          ? commentTextareaRef.current
          : editingCommentTextareaRef.current;

      activeTextarea?.blur();
      setActiveMentionComposer(null);
      clearMentionSuggestions();
    }, 60 * 1000);

    return () => {
      window.clearTimeout(idleTimeout);
    };
  }, [activeMentionComposer, mentionComposerActivityTick]);

  const normalizedDraftRoles = normalizeRoleSelection(draftRoles);
  const availableRoleOptions = EDITABLE_ROLE_OPTIONS.filter(
    (role) =>
      (actorIsRootManager || normalizeRoleName(role) !== "root") &&
      !normalizedDraftRoles.some(
        (draftRole) => normalizeRoleName(draftRole) === normalizeRoleName(role)
      )
  );
  const hasRoleChanges =
    normalizedDraftRoles.join("|") !== normalizedProfileRoles.join("|");

  const handleMentionComposerChange = (
    mode: MentionComposerMode,
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const nextValue = event.currentTarget.value;

    if (mode === "new") {
      setCommentInput(nextValue);
      setCommentDraftMentionProfilesByKey((currentProfiles) =>
        filterComposerMentionProfilesByValue(nextValue, currentProfiles)
      );
    } else {
      setEditingCommentMessage(nextValue);
      setEditingDraftMentionProfilesByKey((currentProfiles) =>
        filterComposerMentionProfilesByValue(nextValue, currentProfiles)
      );
    }

    updateMentionComposerCaret(mode, event.currentTarget);
  };
  const handleMentionComposerInteraction = (
    mode: MentionComposerMode,
    element: HTMLTextAreaElement
  ) => {
    updateMentionComposerCaret(mode, element);
    setMentionComposerActivityTick(Date.now());
  };
  const handleMentionComposerBlur = () => {
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;

      if (
        activeElement !== commentTextareaRef.current &&
        activeElement !== editingCommentTextareaRef.current
      ) {
        setActiveMentionComposer(null);
        clearMentionSuggestions();
      }
    });
  };

  const handleLogout = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    if (!bridge) return;
    setIsLoggingOut(true);
    try {
      await bridge.logout();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    const bridge = getWindowState().sakuraFirebaseAuth;
    if (!file || !bridge) return;
    if (PREMIUM_AVATAR_MEDIA_TYPES.has(file.type) && !canUseEnhancedAvatarMedia) {
      setAvatarError(USER_AVATAR_UPGRADE_MESSAGE);
      setAvatarSuccess(null);
      return;
    }
    if (!isSupabaseConfigured) {
      setAvatarError(getSupabaseAvatarUnavailableMessage());
      return;
    }
    setAvatarError(null);
    setAvatarSuccess(null);
    setIsAvatarUploading(true);

    let uploadedAvatar: SupabaseCommentMediaUploadResult | null = null;

    try {
      let snapshot: UserProfile | null = null;
      const targetUid =
        isOwner ? visibleCurrentUser?.uid ?? activeProfile?.uid : activeProfile?.uid;

      if (!targetUid) {
        throw new Error("Could not resolve the target account for avatar upload.");
      }

      uploadedAvatar = await uploadSupabaseAvatarMedia(file, targetUid);
      const avatarPayload = toAvatarUploadPayload(uploadedAvatar);

      if (isOwner) {
        snapshot = await withAvatarActionTimeout(bridge.updateAvatar(avatarPayload));
      } else if (canOpenAdminPanel && activeProfile?.profileId) {
        snapshot = await withAvatarActionTimeout(
          bridge.adminUpdateProfileAvatar(activeProfile.profileId, avatarPayload)
        );
      }

      if (activeProfile?.avatarPath && activeProfile.avatarPath !== uploadedAvatar.path) {
        void deleteSupabaseStorageObject(activeProfile.avatarPath).catch((cleanupError) => {
          console.error("Failed to remove replaced avatar media:", cleanupError);
        });
      }

      applyUpdatedProfileSnapshot(snapshot);
      setAvatarSuccess(isOwner ? "Avatar saved." : "Avatar updated.");
    } catch (error) {
      if (uploadedAvatar && shouldCleanupUploadedMedia(uploadedAvatar)) {
        void deleteSupabaseStorageObject(uploadedAvatar.path).catch((cleanupError) => {
          console.error("Failed to cleanup uploaded avatar media:", cleanupError);
        });
      }

      setAvatarError(avatarErrorMessage(error));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    if (!bridge) return;
    setAvatarError(null);
    setAvatarSuccess(null);
    setIsAvatarDeleting(true);
    try {
      let snapshot: UserProfile | null = null;

      if (isOwner) {
        snapshot = await withAvatarActionTimeout(bridge.deleteAvatar());
      } else if (canOpenAdminPanel && activeProfile?.profileId) {
        snapshot = await withAvatarActionTimeout(
          bridge.adminDeleteProfileAvatar(activeProfile.profileId)
        );
      }

      applyUpdatedProfileSnapshot(snapshot);
      setAvatarSuccess("Avatar deleted.");

      if (activeProfile?.avatarPath) {
        void deleteSupabaseStorageObject(activeProfile.avatarPath).catch((cleanupError) => {
          console.error("Failed to remove deleted avatar media:", cleanupError);
        });
      }
    } catch (error) {
      setAvatarError(avatarErrorMessage(error));
    } finally {
      setIsAvatarDeleting(false);
    }
  };

  const addRole = (role: string) => {
    setRolesError(null);
    setRolesSuccess(null);
    setDraftRoles((currentRoles) => normalizeRoleSelection([...currentRoles, role]));
  };

  const removeRole = (role: string) => {
    setRolesError(null);
    setRolesSuccess(null);
    setDraftRoles((currentRoles) => {
      const normalizedTarget = normalizeRoleName(role);
      const nextRoles = currentRoles.filter(
        (currentRole) => normalizeRoleName(currentRole) !== normalizedTarget
      );

      return nextRoles.length ? normalizeRoleSelection(nextRoles) : ["user"];
    });
  };

  const resetRoles = () => {
    setDraftRoles(normalizedProfileRoles);
    setRolesError(null);
    setRolesSuccess(null);
  };

  const handleRolesSave = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge || !activeProfile?.profileId || !canManageRoleAssignments) {
      return;
    }

    setRolesError(null);
    setRolesSuccess(null);
    setIsRolesSaving(true);

    try {
      const snapshot = await bridge.updateProfileRoles(
        activeProfile.profileId,
        normalizedDraftRoles
      );

      if (snapshot) {
        setProfile(snapshot);
        if (visibleCurrentUser?.uid === snapshot.uid) {
          setCurrentUser(snapshot);
        }
      }

      setRolesSuccess("Roles updated.");
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : "Could not update roles.");
    } finally {
      setIsRolesSaving(false);
    }
  };

  const handleResendVerification = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge || !isOwner) {
      return;
    }

    setVerificationError(null);
    setVerificationSuccess(null);
    setIsVerificationSending(true);

    try {
      const snapshot = await bridge.resendVerificationEmail();

      if (snapshot) {
        setCurrentUser(snapshot);

        if (activeProfile && snapshot.uid === activeProfile.uid) {
          setProfile(snapshot);
        }
      }

      setVerificationSuccess("Verification email sent.");
    } catch (error) {
      setVerificationError(getProfileActionErrorMessage(error, "Could not send verification email."));
    } finally {
      setIsVerificationSending(false);
    }
  };

  const handleDisplayNameSave = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    const nextDisplayName = displayNameInput.trim();

    if (!bridge) {
      return;
    }

    if (!nextDisplayName) {
      setDisplayNameError("Enter a profile name.");
      return;
    }

    setDisplayNameError(null);
    setDisplayNameSuccess(null);
    setIsDisplayNameSaving(true);

    try {
      let snapshot: UserProfile | null = null;

      if (isOwner) {
        snapshot = await bridge.updateDisplayName(nextDisplayName);
      } else if (canOpenAdminPanel && activeProfile?.profileId) {
        snapshot = await bridge.adminUpdateProfileDisplayName(activeProfile.profileId, nextDisplayName);
      }

      applyUpdatedProfileSnapshot(snapshot);
      setDisplayNameSuccess(isOwner ? "Profile name saved." : "Profile name updated.");
    } catch (error) {
      setDisplayNameError(error instanceof Error ? error.message : "Could not save profile name.");
    } finally {
      setIsDisplayNameSaving(false);
    }
  };

  const handleUsernameSave = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    const nextUsername = normalizeUsernameDraft(usernameInput);

    if (!bridge) {
      return;
    }

    if (!nextUsername) {
      setUsernameError("Enter a login.");
      return;
    }

    if (isOwner && requiresUsernamePasswordConfirmation && !usernamePasswordInput) {
      setUsernameError("Enter your current password to change the login.");
      return;
    }

    setUsernameError(null);
    setUsernameSuccess(null);
    setIsUsernameSaving(true);

    try {
      let snapshot: UserProfile | null = null;

      if (isOwner) {
        snapshot = await bridge.updateUsername(
          nextUsername,
          requiresUsernamePasswordConfirmation ? usernamePasswordInput : undefined
        );
      } else if (canOpenAdminPanel && activeProfile?.profileId) {
        snapshot = await bridge.adminUpdateProfileLogin(activeProfile.profileId, nextUsername);
      }

      applyUpdatedProfileSnapshot(snapshot);
      if (snapshot?.login) {
        setUsernameInput(snapshot.login);
      }
      if (isOwner) {
        setUsernamePasswordInput("");
      }
      setUsernameSuccess(
        snapshot?.login
          ? (isOwner ? `Login saved: @${snapshot.login}` : `Login updated: @${snapshot.login}`)
          : (isOwner ? "Login saved." : "Login updated.")
      );
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : "Could not save login.");
    } finally {
      setIsUsernameSaving(false);
    }
  };
  const handleBanToggle = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge || !canOpenAdminPanel || !activeProfile?.profileId) {
      return;
    }

    if (isAdminSelfTarget && !isTargetBanned) {
      setBanError("You cannot ban your own account.");
      setBanSuccess(null);
      return;
    }

    setBanError(null);
    setBanSuccess(null);
    setIsBanSaving(true);

    try {
      const snapshot = await bridge.adminSetProfileBan(activeProfile.profileId, !isTargetBanned);

      applyUpdatedProfileSnapshot(snapshot);
      setBanSuccess(isTargetBanned ? "Account unbanned." : "Account banned.");
    } catch (error) {
      setBanError(error instanceof Error ? error.message : "Could not update the ban status.");
    } finally {
      setIsBanSaving(false);
    }
  };
  const handleAdminVerificationToggle = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;

    if (!bridge || !canOpenAdminPanel || !activeProfile?.profileId) {
      return;
    }

    setAdminVerificationError(null);
    setAdminVerificationSuccess(null);
    setIsAdminVerificationSaving(true);

    try {
      const snapshot = await bridge.adminSetProfileEmailVerification(
        activeProfile.profileId,
        isTargetVerificationLocked
      );

      applyUpdatedProfileSnapshot(snapshot);
      setAdminVerificationSuccess(
        isTargetVerificationLocked ? "Email marked as verified." : "Email verification revoked."
      );
    } catch (error) {
      setAdminVerificationError(
        error instanceof Error
          ? error.message
          : "Could not update email verification status."
      );
    } finally {
      setIsAdminVerificationSaving(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bridge = getWindowState().sakuraFirebaseAuth;
    const nextComment = commentInput.trim();
    const nextCommentMediaFile = commentMediaFile;

    if (!bridge || !activeProfile?.profileId) {
      return;
    }

    if (!nextComment && !nextCommentMediaFile) {
      setCommentError("Write a comment or attach media before sending.");
      return;
    }

    if (nextCommentMediaFile && (!isSupabaseConfigured || !visibleCurrentUser?.uid)) {
      setCommentError(getSupabaseCommentMediaUnavailableMessage());
      return;
    }

    setCommentError(null);
    setCommentSuccess(null);
    setIsCommentSubmitting(true);

    const pendingCommentId = createPendingCommentId();
    const pendingCommentAuthor = visibleCurrentUser ?? currentUser ?? activeProfile;
    const pendingCommentMediaPreviewUrl = nextCommentMediaFile
      ? URL.createObjectURL(nextCommentMediaFile)
      : null;
    const pendingComment: ProfileComment = {
      id: pendingCommentId,
      profileId: activeProfile.profileId,
      authorUid: pendingCommentAuthor?.uid ?? null,
      authorProfileId:
        typeof pendingCommentAuthor?.profileId === "number"
          ? pendingCommentAuthor.profileId
          : null,
      authorName: profileNameOf(pendingCommentAuthor),
      authorPhotoURL: resolveProfileAvatarUrl(pendingCommentAuthor),
      authorAccentRole: pickCommentAuthorAccentRole(pendingCommentAuthor.roles) ?? null,
      message: nextComment,
      mediaURL: pendingCommentMediaPreviewUrl,
      mediaType: nextCommentMediaFile?.type ?? null,
      mediaPath: null,
      mediaSize: nextCommentMediaFile?.size ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      pending: true,
    };
    setComments((currentComments) => [pendingComment, ...currentComments]);
    setCommentInput("");
    setCommentMediaFile(null);
    if (commentMediaInputRef.current) {
      commentMediaInputRef.current.value = "";
    }

    let uploadedMedia: SupabaseCommentMediaUploadResult | null = null;

    try {
      let nextMedia: File | CommentMediaPayload | null = nextCommentMediaFile;

      if (nextCommentMediaFile && isSupabaseConfigured && visibleCurrentUser?.uid) {
        uploadedMedia = await uploadSupabaseCommentMedia(
          nextCommentMediaFile,
          visibleCurrentUser.uid
        );
        nextMedia = toCommentMediaPayload(uploadedMedia);
      }

      const savedComment = await bridge.addProfileComment(
        activeProfile.profileId,
        nextComment,
        nextMedia
      );
      setComments((currentComments) => [
        savedComment,
        ...currentComments.filter(
          (comment) => comment.id !== savedComment.id && comment.id !== pendingCommentId
        ),
      ]);
      setCommentSuccess("Comment posted.");
    } catch (error) {
      if (uploadedMedia && shouldCleanupUploadedMedia(uploadedMedia)) {
        void deleteSupabaseCommentMedia(uploadedMedia.path).catch((cleanupError) => {
          console.error("Failed to cleanup uploaded comment media:", cleanupError);
        });
      }

      setComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== pendingCommentId)
      );
      setCommentInput(nextComment);
      if (nextCommentMediaFile) {
        setCommentMediaFile(nextCommentMediaFile);
      }
      setCommentError(
        getErrorCode(error) === "comments/write-denied"
          ? getCommentWriteDeniedMessage(Boolean(nextCommentMediaFile))
          : getProfileActionErrorMessage(error, "Could not post this comment.")
      );
    } finally {
      if (pendingCommentMediaPreviewUrl) {
        URL.revokeObjectURL(pendingCommentMediaPreviewUrl);
      }
      setIsCommentSubmitting(false);
    }
  };

  const handleCommentMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setCommentError(null);
    setCommentSuccess(null);
    setCommentMediaFile(nextFile);
  };

  const clearCommentMediaSelection = () => {
    setCommentMediaFile(null);
    if (commentMediaInputRef.current) {
      commentMediaInputRef.current.value = "";
    }
  };

  const deleteCommentMediaIfUnused = async (
    bridge: Bridge,
    mediaPath: string | null | undefined
  ) => {
    const normalizedMediaPath = typeof mediaPath === "string" ? mediaPath.trim() : "";

    if (!normalizedMediaPath) {
      return;
    }

    const isStillReferenced = await bridge.isCommentMediaPathReferenced(normalizedMediaPath);

    if (!isStillReferenced) {
      await deleteSupabaseCommentMedia(normalizedMediaPath);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    const currentComment = comments.find((comment) => comment.id === commentId) ?? null;

    if (!bridge || !commentId || !visibleCurrentUser) {
      return;
    }

    setCommentError(null);
    setCommentSuccess(null);
    setDeletingCommentId(commentId);

    try {
      const deletedCommentId = await bridge.deleteProfileComment(commentId);
      const resolvedCommentId = deletedCommentId ?? commentId;

      setComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== resolvedCommentId)
      );
      if (editingCommentId === resolvedCommentId) {
        setEditingCommentId(null);
        setEditingCommentMessage("");
        setEditingCommentMediaFile(null);
        setEditingCommentMediaPreviewUrl(null);
        setIsEditingCommentMediaRemoved(false);
      }

      setCommentSuccess("Comment deleted.");
      setConfirmingCommentDeleteId((currentId) => (currentId === resolvedCommentId ? null : currentId));
      setOpenCommentActionsMenuId((currentId) => (currentId === resolvedCommentId ? null : currentId));

      if (currentComment?.mediaPath) {
        void deleteCommentMediaIfUnused(bridge, currentComment.mediaPath).catch((cleanupError) => {
          console.error("Failed to remove deleted comment media:", cleanupError);
        });
      }
    } catch (error) {
      setCommentError(getProfileActionErrorMessage(error, "Could not delete this comment."));
    } finally {
      setDeletingCommentId((currentId) => (currentId === commentId ? null : currentId));
    }
  };

  const requestCommentDeleteConfirmation = (commentId: string) => {
    setCommentError(null);
    setCommentSuccess(null);
    setConfirmingCommentDeleteId(commentId);
    setOpenCommentActionsMenuId(commentId);
  };

  const cancelCommentDeleteConfirmation = (commentId?: string) => {
    setConfirmingCommentDeleteId((currentId) => {
      if (!commentId) {
        return null;
      }

      return currentId === commentId ? null : currentId;
    });
    setOpenCommentActionsMenuId((currentId) => {
      if (!commentId) {
        return null;
      }

      return currentId === commentId ? commentId : currentId;
    });
  };

  const handleCommentEditStart = (comment: ProfileComment) => {
    setCommentError(null);
    setCommentSuccess(null);
    setConfirmingCommentDeleteId((currentId) => (currentId === comment.id ? null : currentId));
    setOpenCommentActionsMenuId((currentId) => (currentId === comment.id ? null : currentId));
    setEditingCommentId(comment.id);
    setEditingCommentMessage(comment.message);
    setEditingDraftMentionProfilesByKey((currentProfiles) =>
      filterComposerMentionProfilesByValue(comment.message, currentProfiles)
    );
    setEditingCommentMediaFile(null);
    setEditingCommentMediaPreviewUrl(null);
    setIsEditingCommentMediaRemoved(false);
    if (editingCommentMediaInputRef.current) {
      editingCommentMediaInputRef.current.value = "";
    }
  };

  const handleCommentEditCancel = () => {
    setEditingCommentId(null);
    setEditingCommentMessage("");
    setEditingDraftMentionProfilesByKey({});
    setEditingCommentMediaFile(null);
    setEditingCommentMediaPreviewUrl(null);
    setIsEditingCommentMediaRemoved(false);
    if (editingCommentMediaInputRef.current) {
      editingCommentMediaInputRef.current.value = "";
    }
  };

  const handleEditingCommentMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setCommentError(null);
    setCommentSuccess(null);
    setEditingCommentMediaFile(nextFile);
    if (nextFile) {
      setIsEditingCommentMediaRemoved(false);
    }
  };

  const clearEditingCommentMediaSelection = () => {
    setEditingCommentMediaFile(null);
    if (editingCommentMediaInputRef.current) {
      editingCommentMediaInputRef.current.value = "";
    }
  };

  const removeEditingCommentMedia = () => {
    setEditingCommentMediaFile(null);
    setEditingCommentMediaPreviewUrl(null);
    setIsEditingCommentMediaRemoved(true);
    if (editingCommentMediaInputRef.current) {
      editingCommentMediaInputRef.current.value = "";
    }
  };

  const handleCommentUpdate = async (commentId: string) => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    const nextMessage = editingCommentMessage.trim();
    const currentComment = comments.find((comment) => comment.id === commentId) ?? null;
    const willKeepExistingMedia =
      Boolean(currentComment?.mediaURL) &&
      !editingCommentMediaFile &&
      !isEditingCommentMediaRemoved;
    const willHaveMedia = Boolean(editingCommentMediaFile) || willKeepExistingMedia;

    if (!bridge || !commentId) {
      return;
    }

    if (!nextMessage && !willHaveMedia) {
      setCommentError("Write a comment or attach media before saving.");
      return;
    }

    if (editingCommentMediaFile && (!isSupabaseConfigured || !visibleCurrentUser?.uid)) {
      setCommentError(getSupabaseCommentMediaUnavailableMessage());
      return;
    }

    setCommentError(null);
    setCommentSuccess(null);
    setIsCommentUpdating(true);

    let uploadedMedia: SupabaseCommentMediaUploadResult | null = null;

    try {
      let nextMedia: File | CommentMediaPayload | null = editingCommentMediaFile;

      if (editingCommentMediaFile && isSupabaseConfigured && visibleCurrentUser?.uid) {
        uploadedMedia = await uploadSupabaseCommentMedia(
          editingCommentMediaFile,
          visibleCurrentUser.uid
        );
        nextMedia = toCommentMediaPayload(uploadedMedia);
      }

      const updatedComment = await bridge.updateProfileComment(
        commentId,
        nextMessage,
        nextMedia,
        isEditingCommentMediaRemoved
      );

      if (!updatedComment) {
        if (uploadedMedia && shouldCleanupUploadedMedia(uploadedMedia)) {
          void deleteSupabaseCommentMedia(uploadedMedia.path).catch((cleanupError) => {
            console.error("Failed to cleanup uploaded comment media:", cleanupError);
          });
        }

        setCommentError("This comment no longer exists.");
        return;
      }

      setComments((currentComments) =>
        currentComments.map((comment) =>
          comment.id === updatedComment.id ? updatedComment : comment
        )
      );

      setEditingCommentId(null);
      setEditingCommentMessage("");
      setEditingCommentMediaFile(null);
      setEditingCommentMediaPreviewUrl(null);
      setIsEditingCommentMediaRemoved(false);
      if (editingCommentMediaInputRef.current) {
        editingCommentMediaInputRef.current.value = "";
      }
      setCommentSuccess("Comment updated.");

      if (currentComment?.mediaPath && (Boolean(uploadedMedia?.path) || isEditingCommentMediaRemoved)) {
        void deleteCommentMediaIfUnused(bridge, currentComment.mediaPath).catch((cleanupError) => {
          console.error("Failed to remove replaced comment media:", cleanupError);
        });
      }
    } catch (error) {
      if (uploadedMedia && shouldCleanupUploadedMedia(uploadedMedia)) {
        void deleteSupabaseCommentMedia(uploadedMedia.path).catch((cleanupError) => {
          console.error("Failed to cleanup uploaded comment media:", cleanupError);
        });
      }

      setCommentError(
        getErrorCode(error) === "comments/write-denied"
          ? getCommentWriteDeniedMessage(
              Boolean(editingCommentMediaFile) ||
              Boolean(currentComment?.mediaURL && !isEditingCommentMediaRemoved)
            )
          : getProfileActionErrorMessage(error, "Could not update this comment.")
      );
    } finally {
      setIsCommentUpdating(false);
    }
  };

  const handleProfileThemeToggle = async () => {
    const audio = profileThemeAudioRef.current;

    if (!audio || !shouldPlayProfileThemeSong) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
      }
      return;
    }

    audio.pause();
  };

  const handleProfileThemeSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = profileThemeAudioRef.current;
    const nextTime = Number(event.target.value);

    setProfileThemeCurrentTime(nextTime);

    if (audio && Number.isFinite(nextTime)) {
      audio.currentTime = nextTime;
    }
  };

  const handleProfileThemeVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    const normalizedVolume = Math.min(1, Math.max(0, Number.isFinite(nextVolume) ? nextVolume : 0));

    setProfileThemeVolume(normalizedVolume);

    if (profileThemeAudioRef.current) {
      profileThemeAudioRef.current.volume = normalizedVolume;
    }
  };
  const handleProfileSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const bridge = getWindowState().sakuraFirebaseAuth;
    const rawQuery = profileSearchQuery.trim();
    const normalizedQuery = rawQuery.replace(/^@+/, "");

    if (!normalizedQuery) {
      setProfileSearchResults([]);
      setProfileSearchFeedback(null);
      setProfileSearchError("Enter UID, login, or username.");
      return;
    }

    if (!bridge) {
      setProfileSearchResults([]);
      setProfileSearchFeedback(null);
      setProfileSearchError("Profile search is unavailable right now.");
      return;
    }

    setIsProfileSearchLoading(true);
    setProfileSearchError(null);
    setProfileSearchFeedback(null);

    try {
      const collectedProfiles = new Map<string, UserProfile>();
      const collectProfile = (candidate: UserProfile | null | undefined) => {
        if (!candidate || typeof candidate.profileId !== "number") {
          return;
        }

        const profileKey = candidate.uid || `profile-${candidate.profileId}`;

        if (!collectedProfiles.has(profileKey)) {
          collectedProfiles.set(profileKey, candidate);
        }
      };

      if (/^\d+$/.test(normalizedQuery)) {
        collectProfile(await bridge.getProfileById(Number.parseInt(normalizedQuery, 10)));
      } else {
        const [loginMatches, nameMatch, mentionNameMatch] = await Promise.all([
          bridge.getProfilesByLoginPrefix(normalizedQuery).catch(() => []),
          bridge.getProfileByAuthorName(normalizedQuery).catch(() => null),
          bridge.getProfileByAuthorName(`@${normalizedQuery}`).catch(() => null),
        ]);

        (Array.isArray(loginMatches) ? loginMatches : []).forEach((candidate) =>
          collectProfile(candidate)
        );
        collectProfile(nameMatch);
        collectProfile(mentionNameMatch);
      }

      const loweredQuery = normalizedQuery.toLowerCase();
      const scoredProfiles = [...collectedProfiles.values()]
        .map((candidate) => {
          const login = (candidate.login ?? "").toLowerCase();
          const displayName = (candidate.displayName ?? "").toLowerCase();
          const uidText = String(candidate.profileId ?? "");
          let score = 0;

          if (uidText === normalizedQuery) {
            score += 180;
          }
          if (login === loweredQuery) {
            score += 140;
          } else if (login.startsWith(loweredQuery)) {
            score += 90;
          } else if (login.includes(loweredQuery)) {
            score += 40;
          }
          if (displayName === loweredQuery) {
            score += 120;
          } else if (displayName.startsWith(loweredQuery)) {
            score += 70;
          } else if (displayName.includes(loweredQuery)) {
            score += 30;
          }

          return { candidate, score };
        })
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }

          return (left.candidate.profileId ?? 0) - (right.candidate.profileId ?? 0);
        })
        .map((entry) => entry.candidate);

      setProfileSearchResults(scoredProfiles);
      setProfileSearchFeedback(
        scoredProfiles.length
          ? scoredProfiles.length === 1
            ? "1 account found."
            : `${scoredProfiles.length} accounts found.`
          : "No accounts found."
      );
    } catch (error) {
      setProfileSearchResults([]);
      setProfileSearchFeedback(null);
      setProfileSearchError(
        error instanceof Error ? error.message : "Could not search profiles right now."
      );
    } finally {
      setIsProfileSearchLoading(false);
    }
  };

  return (
    <main
      data-profile-build={PROFILE_BUILD_MARKER}
      className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.14),transparent_35%),linear-gradient(180deg,#090909_0%,#040404_100%)] px-5 py-8 text-white sm:px-8"
    >
      <script
        dangerouslySetInnerHTML={{
          __html: restoreProfilePathScript,
        }}
      />
      <audio
        ref={profileThemeAudioRef}
        src={profileThemeSongSrc ?? undefined}
        preload="auto"
        aria-hidden="true"
        className="hidden"
      />
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative">
            <nav className="flex flex-col gap-4 rounded-[28px] border border-[#1b1b1b] bg-black/40 px-6 py-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <HeaderSocialLinks showLabel />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Home</Link>
                {visibleCurrentUser?.profileId && !isOwner ? <a href={profilePath(visibleCurrentUser.profileId)} className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">My Profile</a> : null}
                {visibleCurrentUser ? <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isLoggingOut ? "Logging out..." : "Logout"}</button> : null}
                <div className="lg:hidden">
                  <SiteOnlineBadge count={siteOnlineCount} profileHrefBuilder={profilePath} />
                </div>
              </div>
            </nav>

            <div className="fixed right-8 top-[52px] z-40 hidden lg:flex">
              <SiteOnlineBadge
                count={siteOnlineCount}
                profileHrefBuilder={profilePath}
              />
            </div>
          </div>
        </div>

        {authError ? <section className="rounded-[32px] border border-red-400/20 bg-red-500/10 px-8 py-12"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Auth Error</p><p className="mt-4 text-sm leading-relaxed text-red-100/85">{authError}</p></section> : null}
        {hasHydrated && showPendingState ? <section className="rounded-[32px] border border-[#181818] bg-[#090909]/85 px-6 py-5 shadow-[0_0_40px_rgba(255,183,197,0.04)]"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#ffb7c5]">Loading</p><p className="mt-2 text-sm text-gray-400">{requestedProfileId ? `Preparing profile #${requestedProfileId}...` : "Preparing profile..."}</p></div><div className="h-2 w-2 rounded-full bg-[#ffb7c5] animate-pulse"></div></div></section> : null}
        {hasHydrated && authReady && !authError && !isProfileLoading && !activeProfile && profileError ? <section className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-8 py-12 shadow-[0_0_60px_rgba(255,183,197,0.06)]"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">{requestedProfileId ? "Profile Missing" : "Guest State"}</p><p className="mt-4 text-sm leading-relaxed text-gray-400">{profileError}</p></section> : null}

        {activeProfile ? (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,64fr)_minmax(0,36fr)] lg:items-start">
            <div className="relative w-full self-start overflow-hidden rounded-[34px] border border-[#201517] bg-[#0d0d0d] shadow-[0_0_80px_rgba(255,183,197,0.06)]">
              {previousProfileId ? <a href={profilePath(previousProfileId)} aria-label="Open previous account" className="absolute left-0 top-[136px] z-20 hidden h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-[#2b1b1e] bg-[#140d11] text-lg text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.14)] transition hover:border-[#ffb7c5]/50 hover:text-white lg:inline-flex">
                ←
              </a> : null}
              {nextProfileId ? <a href={profilePath(nextProfileId)} aria-label="Open next account" className="absolute right-0 top-[136px] z-20 hidden h-11 w-11 translate-x-1/2 items-center justify-center rounded-full border border-[#2b1b1e] bg-[#140d11] text-lg text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.14)] transition hover:border-[#ffb7c5]/50 hover:text-white lg:inline-flex">
                →
              </a> : null}
              <div className="border-b border-[#1b1b1b] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.16),transparent_55%)] px-8 py-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col items-center gap-3">
                  {hasActiveProfileAvatar ? <AvatarMedia src={activeProfileAvatarUrl ?? ""} alt={primaryName} decoding="async" className="h-[104px] w-[104px] rounded-[30px] border border-[#2c2023] object-cover shadow-[0_0_30px_rgba(255,183,197,0.14)]" /> : <div className="flex h-[104px] w-[104px] items-center justify-center rounded-[30px] border border-[#2c2023] bg-[#1a1012] text-2xl font-black uppercase text-[#ffb7c5] shadow-[0_0_30px_rgba(255,183,197,0.14)]">{initials}</div>}
                  <span style={{ minWidth: 104, height: 30 }} className={`inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isActiveProfileOnline ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2]" : "border-[#312228] bg-[#140d11] text-[#ffb7c5]"}`}>{isActiveProfileOnline ? "Online" : "Offline"}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col sm:min-h-[146px]">
                    <div className="min-w-0">
                      <h1 style={profileHeadlineStyle} className="min-w-0 truncate text-3xl font-black uppercase tracking-tighter">{primaryName}</h1>
                      {hasUsername ? <p className="mt-1 text-sm font-medium text-[#c7d4cc]">@{activeProfile.login}</p> : isOwner ? <p className="mt-1 text-sm text-gray-500">Login not set yet.</p> : null}
                      {typeof activeProfile.profileId === "number" ? <p className="mt-1 flex max-w-full items-center gap-2 text-[11px] text-[#b78a95]">
                        <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff9fbd] shadow-[0_0_10px_rgba(255,159,189,0.7)]" />
                        <span className="truncate">UID: {activeProfile.profileId}</span>
                      </p> : null}
                      <p className={`${typeof activeProfile.profileId === "number" ? "mt-0.5" : "mt-1"} flex max-w-full items-center gap-2 text-[11px] text-[#b78a95]`}>
                        <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff9fbd] shadow-[0_0_10px_rgba(255,159,189,0.7)]" />
                        <span className="truncate">Account created {formatTime(activeProfile.creationTime)}</span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-auto">
                      {profileRoles.map((role) => <span key={role} title={roleBadgeLabel(role)} style={{ ...roleBadgeStyle(role), ...roleBadgeTextStyle, height: 30 }} className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold"><span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span></span>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-8 pt-6 pb-7">
                <div className="rounded-[26px] border border-[#2f161d] bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.1),transparent_58%),linear-gradient(180deg,#0c0a0b_0%,#090909_100%)] p-5 shadow-[0_0_26px_rgba(255,143,177,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Subscription</p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">Subscription Pricing</p>
                    </div>
                    <span style={{ ...subscriptionBadgeStyle, ...roleBadgeTextStyle }} className="inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold">
                      {subscriptionSummary.status}
                    </span>
                  </div>
                  <div className="mt-4 rounded-[22px] border border-[#24171b] bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.08),transparent_62%),#090909] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b78a95]">Current Subscription</p>
                    <p className="mt-3 text-lg font-bold text-white">{subscriptionSummary.title}</p>
                    <p className="mt-3 text-xs leading-relaxed text-gray-400">{subscriptionSummary.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-6 self-start">
              <div className="rounded-[32px] border border-[#201517] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.12),transparent_70%),linear-gradient(180deg,#0d0d0d_0%,#090909_100%)] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Profile Navigator</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {previousProfileId ? <a href={profilePath(previousProfileId)} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/45 hover:text-white">
                    ← Previous
                  </a> : null}
                  {nextProfileId ? <a href={profilePath(nextProfileId)} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/45 hover:text-white">
                    Next →
                  </a> : null}
                  {!previousProfileId && !nextProfileId ? <p className="text-xs leading-relaxed text-gray-500">No adjacent accounts found nearby.</p> : null}
                </div>
                <form onSubmit={handleProfileSearchSubmit} className="mt-5">
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Find Account</span>
                    <div className="flex items-center gap-2">
                      <input type="text" value={profileSearchQuery} onChange={(event) => {
                        setProfileSearchQuery(event.target.value);
                        setProfileSearchError(null);
                      }} className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder="UID, login, or username" />
                      <button type="submit" disabled={isProfileSearchLoading} className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">
                        {isProfileSearchLoading ? "..." : "Search"}
                      </button>
                    </div>
                  </label>
                </form>
                {profileSearchError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{profileSearchError}</p> : null}
                {!profileSearchError && profileSearchFeedback ? <p className="mt-3 text-xs leading-relaxed text-gray-500">{profileSearchFeedback}</p> : null}
                {profileSearchResults.length ? <div className="mt-4 space-y-2">
                  {profileSearchResults.slice(0, 8).map((candidateProfile) => (
                    <a key={candidateProfile.uid || `profile-${candidateProfile.profileId}`} href={typeof candidateProfile.profileId === "number" ? profilePath(candidateProfile.profileId) : "#"} className="flex items-center justify-between gap-3 rounded-2xl border border-[#222] bg-[#0b0b0b] px-3 py-2.5 transition hover:border-[#ffb7c5]/35">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">{profileNameOf(candidateProfile)}</span>
                        <span className="block truncate text-xs text-gray-500">{candidateProfile.login ? `@${candidateProfile.login}` : "No login"}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] text-[#b78a95]">
                        <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff9fbd] shadow-[0_0_10px_rgba(255,159,189,0.7)]" />
                        <span className="whitespace-nowrap">UID: {candidateProfile.profileId}</span>
                      </span>
                    </a>
                  ))}
                </div> : null}
              </div>
              {isOwner && activeProfile && (!isProfileControlsOpen || activeProfile.isBanned) ? <div className="rounded-[32px] border border-[#201517] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.14),transparent_72%),linear-gradient(180deg,#0d0d0d_0%,#090909_100%)] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Profile Settings</p>
                  {!activeProfile.isBanned ? <button type="button" onClick={() => setIsProfileControlsOpen(true)} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/45 hover:text-white">
                    Manage Account
                  </button> : null}
                </div>
                {activeProfile.isBanned ? <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  This account is banned. Profile changes and new actions stay locked until a root account removes the ban.
                </p> : null}
              </div> : null}

              {(!isOwner || !isProfileControlsOpen || activeProfile?.isBanned) ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Profile Comments</p>
                {visibleCurrentUser && !isCurrentAccountBanned && !isCurrentAccountVerificationLocked ? (
                  <form onSubmit={handleCommentSubmit} className="mt-5">
                    <label className="block">
                      <textarea
                        ref={commentTextareaRef}
                        value={commentInput}
                        maxLength={280}
                        rows={1}
                        onChange={(event) => handleMentionComposerChange("new", event)}
                        onInput={(event) => {
                          syncTextareaHeight(event.currentTarget);
                          handleMentionComposerInteraction("new", event.currentTarget);
                        }}
                        onClick={(event) => handleMentionComposerInteraction("new", event.currentTarget)}
                        onSelect={(event) => handleMentionComposerInteraction("new", event.currentTarget)}
                        onFocus={(event) => handleMentionComposerInteraction("new", event.currentTarget)}
                        onBlur={handleMentionComposerBlur}
                        className="w-full resize-none overflow-hidden rounded-2xl border border-[#232323] bg-[#090909] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                        placeholder={`Write something for ${primaryName}...`}
                      />
                    </label>
                    {renderMentionSuggestions("new")}
                    {renderComposerMentionAttachments("new", commentInput, commentDraftMentionProfilesByKey)}
                    <input ref={commentMediaInputRef} type="file" accept={COMMENT_MEDIA_FILE_ACCEPT} onChange={handleCommentMediaChange} className="hidden" />
                    {commentMediaPreviewUrl ? <div className="mt-3 overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                      <CommentMediaFrame src={commentMediaPreviewUrl} mediaType={commentMediaFile?.type ?? null} alt="Selected comment media preview" className="block max-h-[320px] w-full object-contain" />
                    </div> : null}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" disabled={isCommentSubmitting || (!commentInput.trim() && !commentMediaFile)} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isCommentSubmitting ? "Posting..." : "Post"}</button>
                        <button type="button" onClick={() => commentMediaInputRef.current?.click()} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">
                          Media
                        </button>
                        {commentMediaFile ? <button type="button" onClick={clearCommentMediaSelection} className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Remove</button> : null}
                      </div>
                      <span className="text-xs text-gray-500">{commentInput.trim().length}/280</span>
                    </div>
                    {commentError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{commentError}</p> : null}
                    {commentSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{commentSuccess}</p> : null}
                  </form>
                ) : visibleCurrentUser && isCurrentAccountBanned ? (
                  <div className="mt-5 rounded-[24px] border border-red-400/20 bg-red-500/10 px-4 py-4">
                    <p className="text-sm leading-relaxed text-red-100/85">This account has been banned by an administrator. Posting and profile actions are disabled.</p>
                  </div>
                ) : visibleCurrentUser && isCurrentAccountVerificationLocked ? (
                  <div className="mt-5 rounded-[24px] border border-[#4d3024] bg-[linear-gradient(180deg,#1a110d_0%,#120d0a_100%)] px-4 py-4">
                    <p className="text-sm leading-relaxed text-[#f3d2c5]">Verify your email to open the profile and use comments.</p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-[#1d1d1d] bg-[#090909] px-4 py-4">
                    <p className="text-sm leading-relaxed text-gray-400">Sign in to leave a comment on this profile. Guests can read comments, but cannot post.</p>
                  </div>
                )}

                <div className="mt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Recent Messages</p>
                  {isCommentsLoading ? <p className="mt-4 text-sm text-gray-500">Loading comments...</p> : null}
                  {!isCommentsLoading && commentsError ? <p className="mt-4 text-sm leading-relaxed text-[#ff9aa9]">{commentsError}</p> : null}
                  {!isCommentsLoading && !commentsError && !comments.length ? <p className="mt-4 text-sm text-gray-500">No comments yet.</p> : null}
                  {!isCommentsLoading && !commentsError && comments.length ? <div className="mt-4 flex flex-col gap-3">
                    {comments.map((comment) => {
                      const isDeletingComment = deletingCommentId === comment.id;
                      const isConfirmingCommentDelete = confirmingCommentDeleteId === comment.id;
                      const isEditingComment = editingCommentId === comment.id;
                      const isSavingCommentUpdate = isEditingComment && isCommentUpdating;
                      const isPendingComment = comment.pending === true;
                      const showEditAction = !isPendingComment && canEditComment(comment);
                      const showDeleteAction = !isPendingComment && canDeleteComment(comment);
                      const isCommentActionsMenuOpen = openCommentActionsMenuId === comment.id;
                      const canShowCommentActionsMenu =
                        isConfirmingCommentDelete ||
                        showDeleteAction ||
                        (showEditAction && !isEditingComment);
                      const isCommentActionMenuBusy = isDeletingComment || isSavingCommentUpdate;
                      const commentInitials = initialsFromText(comment.authorName);
                      const resolvedCommentAuthorProfile = resolveCommentAuthorProfile(comment);
                      const resolvedCommentAuthorRole = resolveCommentAuthorRole(comment);
                      const resolvedCommentAuthorPhotoURL = resolveCommentAuthorPhotoURL(comment);
                      const commentAuthorStyle = roleCommentAuthorStyle(resolvedCommentAuthorRole);
                      const isCommentEdited = Boolean(comment.updatedAt);

                      return <div key={comment.id} className="rounded-[24px] border border-[#1d1d1d] bg-[#090909] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="group/comment-profile relative flex min-w-0 items-start gap-3">
                            {resolvedCommentAuthorPhotoURL ? <AvatarMedia src={resolvedCommentAuthorPhotoURL} alt={comment.authorName} loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-2xl border border-[#2a2022] object-cover shadow-[0_0_18px_rgba(255,183,197,0.1)]" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2a2022] bg-[#1a1012] text-[11px] font-black uppercase text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.08)]">{commentInitials}</div>}
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                {comment.authorProfileId ? <a href={profilePath(comment.authorProfileId)} style={commentAuthorStyle} className="min-w-0 truncate text-sm font-semibold transition hover:text-white">{comment.authorName}</a> : <p style={commentAuthorStyle} className="min-w-0 truncate text-sm font-semibold">{comment.authorName}</p>}
                                {!isConfirmingCommentDelete && isPendingComment ? <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.16em] text-[#ffb7c5]">Sending...</span> : null}
                                {!isConfirmingCommentDelete && isCommentEdited ? <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.16em] text-gray-500">Edited</span> : null}
                              </div>
                              {!isConfirmingCommentDelete ? <p className="mt-1 text-xs text-gray-500">{formatTime(comment.createdAt)}</p> : null}
                            </div>
                            {resolvedCommentAuthorProfile ? renderProfileHoverPreview(resolvedCommentAuthorProfile, comment.authorName, "start") : null}
                          </div>
                          <div className="-mt-1 flex shrink-0 items-start justify-end">
                            {canShowCommentActionsMenu ? <div data-comment-actions-menu className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCommentActionsMenuId((currentId) =>
                                    currentId === comment.id ? null : comment.id
                                  );
                                  if (!isConfirmingCommentDelete) {
                                    setConfirmingCommentDeleteId((currentId) =>
                                      currentId === comment.id ? currentId : null
                                    );
                                  }
                                }}
                                aria-label={isCommentActionsMenuOpen ? "Close comment actions" : "Open comment actions"}
                                aria-expanded={isCommentActionsMenuOpen}
                                disabled={isCommentActionMenuBusy}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isCommentActionsMenuOpen
                                    ? "bg-transparent text-[#ffb7c5]"
                                    : "bg-transparent text-[#b78a95] hover:text-[#ffb7c5]"
                                }`}
                              >
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="h-1 w-1 rounded-full bg-current" />
                                  <span className="h-1 w-1 rounded-full bg-current" />
                                  <span className="h-1 w-1 rounded-full bg-current" />
                                </span>
                              </button>
                              {isCommentActionsMenuOpen ? <div className="absolute right-0 top-0 z-20 translate-x-[calc(100%+20px)] p-0 max-[900px]:right-0 max-[900px]:top-full max-[900px]:mt-2 max-[900px]:translate-x-0">
                                <div className="flex min-w-[124px] flex-col gap-1.5">
                                  {isConfirmingCommentDelete ? <>
                                    <button type="button" onClick={() => handleCommentDelete(comment.id)} disabled={isDeletingComment || isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isDeletingComment ? "Deleting..." : "Yes"}</button>
                                    <button type="button" onClick={() => cancelCommentDeleteConfirmation(comment.id)} disabled={isDeletingComment} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">No</button>
                                  </> : <>
                                    {showEditAction && !isEditingComment ? <button type="button" onClick={() => handleCommentEditStart(comment)} disabled={isDeletingComment || isCommentUpdating} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Edit</button> : null}
                                    {showDeleteAction ? <button type="button" onClick={() => requestCommentDeleteConfirmation(comment.id)} disabled={isDeletingComment || isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Delete</button> : null}
                                  </>}
                                </div>
                              </div> : null}
                            </div> : null}
                          </div>
                        </div>
                        {isConfirmingCommentDelete ? null : isEditingComment ? <div className="mt-3">
                          <textarea
                            ref={editingCommentTextareaRef}
                            value={editingCommentMessage}
                            maxLength={280}
                            rows={3}
                            onChange={(event) => handleMentionComposerChange("edit", event)}
                            onInput={(event) => {
                              syncTextareaHeight(event.currentTarget);
                              handleMentionComposerInteraction("edit", event.currentTarget);
                            }}
                            onClick={(event) => handleMentionComposerInteraction("edit", event.currentTarget)}
                            onSelect={(event) => handleMentionComposerInteraction("edit", event.currentTarget)}
                            onFocus={(event) => handleMentionComposerInteraction("edit", event.currentTarget)}
                            onBlur={handleMentionComposerBlur}
                            className="w-full resize-none overflow-hidden rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                            placeholder="Update comment..."
                          />
                          {renderMentionSuggestions("edit")}
                          {renderComposerMentionAttachments("edit", editingCommentMessage, editingDraftMentionProfilesByKey)}
                          <input ref={editingCommentMediaInputRef} type="file" accept={COMMENT_MEDIA_FILE_ACCEPT} onChange={handleEditingCommentMediaChange} className="hidden" />
                          {editingCommentMediaPreviewUrl ? <div className="mt-3 overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                            <CommentMediaFrame src={editingCommentMediaPreviewUrl} mediaType={editingCommentMediaFile?.type ?? null} alt="Updated comment media preview" className="block max-h-[320px] w-full object-contain" />
                          </div> : (!isEditingCommentMediaRemoved && comment.mediaURL ? <div className="mt-3 overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                            <CommentMediaFrame src={comment.mediaURL} mediaType={comment.mediaType} alt={`${comment.authorName} comment attachment`} className="block max-h-[320px] w-full object-contain" controls={isCommentVideoMediaType(comment.mediaType)} />
                          </div> : null)}
                          {editingCommentMediaFile ? <div className="mt-3 flex items-center">
                            <button type="button" onClick={clearEditingCommentMediaSelection} disabled={isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Remove</button>
                          </div> : null}
                          {!editingCommentMediaFile && comment.mediaURL && !isEditingCommentMediaRemoved ? <div className="mt-3 flex items-center">
                            <button type="button" onClick={removeEditingCommentMedia} disabled={isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Remove</button>
                          </div> : null}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <button type="button" onClick={() => handleCommentUpdate(comment.id)} disabled={isSavingCommentUpdate || (!editingCommentMessage.trim() && !editingCommentMediaFile && !(comment.mediaURL && !isEditingCommentMediaRemoved))} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isSavingCommentUpdate ? "Saving..." : "Save"}</button>
                              <button type="button" onClick={() => editingCommentMediaInputRef.current?.click()} disabled={isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Media</button>
                              <button type="button" onClick={handleCommentEditCancel} disabled={isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
                            </div>
                            <span className="text-xs text-gray-500">{editingCommentMessage.trim().length}/280</span>
                          </div>
                        </div> : <div className="mt-3 space-y-3">
                          {comment.message ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{renderCommentMessageWithMentions(comment.message)}</p> : null}
                          {comment.mediaURL ? <div className="overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                            <CommentMediaFrame src={comment.mediaURL} mediaType={comment.mediaType} alt={`${comment.authorName} comment attachment`} className="block max-h-[360px] w-full object-contain" controls={isCommentVideoMediaType(comment.mediaType)} />
                          </div> : null}
                        </div>}
                      </div>;
                    })}
                  </div> : null}
                </div>
              </div> : null}

              <div className="flex flex-col gap-6">
              {isOwner && activeProfile && isProfileControlsOpen && !activeProfile.isBanned ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Profile Name</p>
                  <button type="button" onClick={() => setIsProfileControlsOpen(false)} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">
                    Back
                  </button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">This name is shown at the top of your profile. It is separate from your login.</p>
                <div className="mt-5">
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Name</span>
                    <input type="text" value={displayNameInput} maxLength={48} autoComplete="nickname" onChange={(event) => {
                      setDisplayNameInput(event.target.value);
                      setDisplayNameError(null);
                      setDisplayNameSuccess(null);
                    }} className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder="Absolute" />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">Displayed above your login in the profile header.</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleDisplayNameSave} disabled={isDisplayNameSaving} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isDisplayNameSaving ? "Saving..." : "Save Name"}</button>
                </div>
                {displayNameError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{displayNameError}</p> : null}
                {displayNameSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{displayNameSuccess}</p> : null}
              </div> : null}

              {isOwner && activeProfile && isProfileControlsOpen && !activeProfile.isBanned ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">{hasUsername ? "Login" : "Create Login"}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{hasUsername ? "This login is shown below your profile name and is used for sign-in." : "This account does not have a login yet. Create one so it appears below your profile name and can be used for sign-in."}</p>
                <div className="mt-5">
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Login</span>
                    <input ref={ownerUsernameInputRef} type="text" value={usernameInput} minLength={3} maxLength={24} autoComplete="username" onChange={(event) => {
                      setUsernameInput(event.target.value);
                      setUsernameError(null);
                      setUsernameSuccess(null);
                    }} className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder="your_login" />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">Login without spaces. Letters, numbers, `.`, `_`, and `-` are supported.</p>
                </div>
                {requiresUsernamePasswordConfirmation ? <div className="mt-5">
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Current Password</span>
                    <input type="password" value={usernamePasswordInput} autoComplete="current-password" onChange={(event) => {
                      setUsernamePasswordInput(event.target.value);
                      setUsernameError(null);
                      setUsernameSuccess(null);
                    }} className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder="Enter current password" />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">Required before changing the login for password-based accounts.</p>
                </div> : null}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleUsernameSave} disabled={isUsernameSaving} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isUsernameSaving ? "Saving..." : "Save Login"}</button>
                </div>
                {usernameError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{usernameError}</p> : null}
                {usernameSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{usernameSuccess}</p> : null}
              </div> : null}

              {isOwner && isProfileControlsOpen && shouldShowVerificationBanner ? <div className="rounded-[32px] border border-[#4d3024] bg-[linear-gradient(180deg,#1a110d_0%,#120d0a_100%)] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Email not verified</p>
                <p className="mt-3 text-sm leading-relaxed text-[#f3d2c5]">Verify your email to keep account access and login recovery enabled.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleResendVerification} disabled={isVerificationSending} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isVerificationSending ? "Sending..." : "Resend verification email"}</button>
                </div>
                {verificationError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{verificationError}</p> : null}
                {verificationSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{verificationSuccess}</p> : null}
              </div> : null}

              {false && canManageRoleAssignments && activeProfile?.profileId ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Role Access</p>
                <p className="mt-3 text-xs leading-relaxed text-gray-400">Open any participant profile and manage its roles here. Root and co-owner accounts can save changes.</p>
                <div className="mt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Assigned Roles</p>
                  <div className="mt-3 flex flex-wrap gap-3">{normalizedDraftRoles.map((role) => {
                    const isLastUserRole =
                      normalizedDraftRoles.length === 1 &&
                      normalizeRoleName(role) === "user";

                    return <button key={role} type="button" title={roleBadgeLabel(role)} onClick={() => removeRole(role)} disabled={isLastUserRole || isRolesSaving} style={{ ...roleBadgeStyle(role), ...roleBadgeTextStyle }} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-60"><span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span><span className="ml-2 text-[14px] leading-none">×</span></button>;
                  })}</div>
                </div>
                <div className="mt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Available Roles</p>
                  <div className="mt-3 flex flex-wrap gap-3">{availableRoleOptions.map((role) => <button key={role} type="button" title={roleBadgeLabel(role)} onClick={() => addRole(role)} disabled={isRolesSaving} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold opacity-70 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40" style={{ ...roleBadgeTextStyle, borderColor: "#2c2c2c", backgroundColor: "#101010", color: "#9ca3af", boxShadow: "none" }}><span className="mr-2 text-[14px] leading-none">+</span><span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span></button>)}</div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleRolesSave} disabled={isRolesSaving || !hasRoleChanges} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isRolesSaving ? "Saving..." : "Save Roles"}</button>
                  <button type="button" onClick={resetRoles} disabled={isRolesSaving || !hasRoleChanges} className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Reset</button>
                </div>
                {rolesError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{rolesError}</p> : null}
                {rolesSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{rolesSuccess}</p> : null}
              </div> : null}

              {isOwner && isProfileControlsOpen && !activeProfile?.isBanned ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Avatar</p>
                <div className="mt-5 rounded-[24px] border border-[#1d1d1d] bg-[#090909] p-4">
                  <p className="text-sm font-semibold text-white">{hasActiveProfileAvatar ? "Custom Avatar" : "Generated Avatar"}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">Upload, replace, or delete your avatar here. PNG, JPG, and WEBP are available to all users. GIF, MP4, and WEBM require a higher profile tier.</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={isAvatarUploading || isAvatarDeleting} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">
                      {isAvatarUploading ? "Uploading..." : hasActiveProfileAvatar ? "Replace Avatar" : "Upload Avatar"}
                    </button>
                    {hasActiveProfileAvatar ? <button type="button" onClick={handleAvatarDelete} disabled={isAvatarUploading || isAvatarDeleting} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{isAvatarDeleting ? "Deleting..." : "Delete Avatar"}</button> : null}
                    <input ref={avatarInputRef} type="file" accept={AVATAR_FILE_ACCEPT} onChange={handleAvatarChange} className="hidden" />
                  </div>
                  {avatarError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{avatarError}</p> : null}
                  {avatarSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{avatarSuccess}</p> : null}
                </div>
              </div> : null}

              </div>

            </div>
          </section>
        ) : null}
      </div>
      {activeProfile ? (
        <>
          {shouldPlayProfileThemeSong ? (
            <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
              {isProfileThemePanelOpen ? (
                <div className="w-[min(88vw,272px)] rounded-[24px] border border-[#372028] bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.18),transparent_54%),linear-gradient(180deg,rgba(22,13,17,0.98)_0%,rgba(8,8,9,0.98)_100%)] p-4 shadow-[0_0_38px_rgba(255,183,197,0.14)] backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#ffb7c5]">
                        Profile Theme
                      </p>
                      <p className="mt-2 truncate text-[15px] font-semibold tracking-[-0.02em] text-white">
                        {profileThemeTitle ?? "Profile Theme"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        profileThemeIsPlaying
                          ? "border-[#ffb7c5]/40 bg-[#1b1015] text-[#ffb7c5] shadow-[0_0_16px_rgba(255,183,197,0.16)]"
                          : "border-[#2d2d2d] bg-[#111111] text-gray-400"
                      }`}
                    >
                      {profileThemeIsPlaying ? "Playing" : "Paused"}
                    </span>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[#2a181d] bg-[linear-gradient(180deg,rgba(18,11,14,0.96)_0%,rgba(11,11,12,0.96)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,183,197,0.04)]">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleProfileThemeToggle();
                        }}
                        aria-label={profileThemeIsPlaying ? "Pause music" : "Play music"}
                        className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border transition ${
                          profileThemeIsPlaying
                            ? "border-[#ffb7c5]/45 bg-[#ffb7c5] text-black shadow-[0_0_22px_rgba(255,183,197,0.22)] hover:bg-[#ffc8d3]"
                            : "border-[#ffb7c5]/35 bg-[linear-gradient(180deg,#241118_0%,#140d11_100%)] text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.16)] hover:border-[#ffb7c5]/60 hover:text-white"
                        }`}
                      >
                        <MusicGlyph playing={profileThemeIsPlaying} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-gray-400">
                          <span>{formatAudioClock(profileThemeCurrentTime)}</span>
                          <span>{formatAudioClock(profileThemeDuration)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={profileThemeDuration > 0 ? profileThemeDuration : 0}
                          step={0.1}
                          value={Math.min(profileThemeCurrentTime, profileThemeDuration || profileThemeCurrentTime)}
                          onChange={handleProfileThemeSeek}
                          disabled={profileThemeDuration <= 0}
                          style={buildMusicSliderStyle(
                            Math.min(profileThemeCurrentTime, profileThemeDuration || profileThemeCurrentTime),
                            profileThemeDuration > 0 ? profileThemeDuration : 1
                          )}
                          className={`mt-2 ${musicSliderClassName}`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[18px] border border-[#26151a] bg-[linear-gradient(180deg,rgba(16,10,13,0.94)_0%,rgba(10,10,11,0.94)_100%)] px-3 py-2.5">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#ffb7c5]">
                        Volume
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={profileThemeVolume}
                        onChange={handleProfileThemeVolumeChange}
                        style={buildMusicSliderStyle(profileThemeVolume, 1)}
                        className={musicSliderClassName}
                      />
                      <span className="w-10 shrink-0 text-right text-[10px] font-medium text-gray-400">
                        {Math.round(profileThemeVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setIsProfileThemePanelOpen((currentValue) => !currentValue)}
                aria-expanded={isProfileThemePanelOpen}
                className={`inline-flex items-center gap-2 justify-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] shadow-[0_0_24px_rgba(255,183,197,0.12)] transition ${
                  isProfileThemePanelOpen
                    ? "border-[#ffb7c5]/45 bg-[#ffb7c5] text-black hover:bg-[#ffc8d3]"
                    : "border-[#ffb7c5]/35 bg-[#140d11] text-[#ffb7c5] hover:border-[#ffb7c5]/60 hover:text-white"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    profileThemeIsPlaying ? "bg-[#ff7da0] shadow-[0_0_14px_rgba(255,125,160,0.9)]" : "bg-current/60"
                  }`}
                />
                Music
              </button>
            </div>
          ) : null}
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {canOpenAdminPanel ? (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(true)}
                className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-[11px] font-bold uppercase tracking-[0.22em] shadow-[0_0_30px_rgba(255,183,197,0.14)] transition hover:text-white ${
                  isTargetBanned
                    ? "border-[#ff5a54]/50 bg-[#19090b] text-[#ffb3ad] hover:border-[#ff5a54]"
                    : "border-[#ffb7c5]/35 bg-[#140d11] text-[#ffb7c5] hover:border-[#ffb7c5]/60"
                }`}
              >
                Admin Panel
              </button>
            ) : null}
          </div>
          {canOpenAdminPanel && isAdminPanelOpen ? (
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                aria-label="Close admin panel"
                onClick={() => setIsAdminPanelOpen(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              <aside className="absolute inset-y-4 right-4 flex w-[min(92vw,430px)] flex-col overflow-hidden rounded-[32px] border border-[#2a171c] bg-[#090909] shadow-[0_0_80px_rgba(255,183,197,0.12)]">
                <div className="border-b border-[#1c1c1c] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.16),transparent_60%)] px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Admin Panel</p>
                      <p className="mt-3 text-sm leading-relaxed text-gray-300">
                        Root controls for profile #{activeProfile.profileId ?? "?"}.
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Managing {primaryName}{hasUsername ? ` · @${activeProfile.login}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdminPanelOpen(false)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#312228] bg-[#140d11] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="space-y-5">
                    <section className="rounded-[24px] border border-[#1d1d1d] bg-[#0d0d0d] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Status</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {isTargetBanned ? "Account is banned" : "Account is active"}
                          </p>
                          {activeProfile.bannedAt ? (
                            <p className="mt-1 text-xs text-gray-500">Updated {formatTime(activeProfile.bannedAt)}</p>
                          ) : null}
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            isTargetBanned
                              ? "border-[#ff5a54]/40 bg-[#18090b] text-[#ffb3ad]"
                              : "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2]"
                          }`}
                        >
                          {isTargetBanned ? "Banned" : "Active"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleBanToggle}
                          disabled={isBanSaving || (isAdminSelfTarget && !isTargetBanned)}
                          className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isTargetBanned
                              ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2] hover:border-[#8ce5b2]/50 hover:text-white"
                              : "border-[#ff5a54]/35 bg-[#ff5a54] text-black hover:bg-[#ff746f]"
                          }`}
                        >
                          {isBanSaving ? "Saving..." : isTargetBanned ? "Unban Account" : "Ban Account"}
                        </button>
                      </div>
                      {isAdminSelfTarget && !isTargetBanned ? (
                        <p className="mt-3 text-xs leading-relaxed text-gray-500">
                          Self-ban is blocked to prevent losing access to your root account.
                        </p>
                      ) : null}
                      {banError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{banError}</p> : null}
                      {banSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{banSuccess}</p> : null}
                    </section>

                    <section className="rounded-[24px] border border-[#1d1d1d] bg-[#0d0d0d] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Email Verification</p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {targetVerificationStatus === "no-email"
                              ? "No email attached"
                              : targetVerificationStatus === "locked"
                                ? "Verification required"
                                : targetVerificationStatus === "verified"
                                  ? "Email verified"
                                  : "State unknown"}
                          </p>
                          {activeProfile.email ? (
                            <p className="mt-1 text-xs text-gray-500">{activeProfile.email}</p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-500">This account does not have a stored email.</p>
                          )}
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            targetVerificationStatus === "no-email"
                              ? "border-[#2b2b2b] bg-[#101010] text-gray-400"
                              : targetVerificationStatus === "locked"
                                ? "border-[#ffb7c5]/35 bg-[#140d11] text-[#ffb7c5]"
                                : targetVerificationStatus === "verified"
                                  ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2]"
                                  : "border-[#6b5b22] bg-[#171308] text-[#f4e2a2]"
                          }`}
                        >
                          {targetVerificationStatus === "no-email"
                            ? "Unavailable"
                            : targetVerificationStatus === "locked"
                              ? "Locked"
                              : targetVerificationStatus === "verified"
                                ? "Verified"
                                : "Unknown"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleAdminVerificationToggle}
                          disabled={
                            isAdminVerificationSaving ||
                            !activeProfile.email ||
                            (isAdminSelfTarget && isTargetVerified)
                          }
                          className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isTargetVerificationLocked
                              ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2] hover:border-[#8ce5b2]/50 hover:text-white"
                              : "border-[#ffb7c5]/35 bg-[#ffb7c5] text-black hover:bg-[#ffc8d3]"
                          }`}
                        >
                          {isAdminVerificationSaving
                            ? "Saving..."
                            : isTargetVerificationLocked || targetVerificationStatus === "unknown"
                              ? "Mark Verified"
                              : "Revoke Verification"}
                        </button>
                      </div>
                      {isAdminSelfTarget && isTargetVerified ? (
                        <p className="mt-3 text-xs leading-relaxed text-gray-500">
                          Self-revoke is blocked to prevent losing access to your own root account.
                        </p>
                      ) : null}
                      {adminVerificationError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{adminVerificationError}</p> : null}
                      {adminVerificationSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{adminVerificationSuccess}</p> : null}
                    </section>

                    <section className="rounded-[24px] border border-[#1d1d1d] bg-[#0d0d0d] p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Profile Name</p>
                      <label className="mt-4 block">
                        <span className="mb-2 block text-xs text-gray-500">Displayed name</span>
                        <input
                          type="text"
                          value={displayNameInput}
                          maxLength={48}
                          autoComplete="nickname"
                          onChange={(event) => {
                            setDisplayNameInput(event.target.value);
                            setDisplayNameError(null);
                            setDisplayNameSuccess(null);
                          }}
                          className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                          placeholder="Absolute"
                        />
                      </label>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleDisplayNameSave}
                          disabled={isDisplayNameSaving}
                          className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDisplayNameSaving ? "Saving..." : "Save Name"}
                        </button>
                      </div>
                      {displayNameError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{displayNameError}</p> : null}
                      {displayNameSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{displayNameSuccess}</p> : null}
                    </section>

                    <section className="rounded-[24px] border border-[#1d1d1d] bg-[#0d0d0d] p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Login</p>
                      <label className="mt-4 block">
                        <span className="mb-2 block text-xs text-gray-500">Sign-in login</span>
                        <input
                          ref={adminUsernameInputRef}
                          type="text"
                          value={usernameInput}
                          minLength={3}
                          maxLength={24}
                          autoComplete="username"
                          onChange={(event) => {
                            setUsernameInput(event.target.value);
                            setUsernameError(null);
                            setUsernameSuccess(null);
                          }}
                          className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                          placeholder="your_login"
                        />
                      </label>
                      <p className="mt-2 text-xs leading-relaxed text-gray-500">Login without spaces. Letters, numbers, `.`, `_`, and `-` are supported.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleUsernameSave}
                          disabled={isUsernameSaving}
                          className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUsernameSaving ? "Saving..." : "Save Login"}
                        </button>
                      </div>
                      {usernameError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{usernameError}</p> : null}
                      {usernameSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{usernameSuccess}</p> : null}
                    </section>

                    <section className="rounded-[24px] border border-[#1d1d1d] bg-[#0d0d0d] p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Roles</p>
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Assigned</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {normalizedDraftRoles.map((role) => {
                            const isLastUserRole =
                              normalizedDraftRoles.length === 1 &&
                              normalizeRoleName(role) === "user";

                            return (
                              <button
                                key={role}
                                type="button"
                                title={roleBadgeLabel(role)}
                                onClick={() => removeRole(role)}
                                disabled={isLastUserRole || isRolesSaving}
                                style={{ ...roleBadgeStyle(role), ...roleBadgeTextStyle }}
                                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span>
                                <span className="ml-2 text-[14px] leading-none">×</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Available</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {availableRoleOptions.map((role) => (
                            <button
                              key={role}
                              type="button"
                              title={roleBadgeLabel(role)}
                              onClick={() => addRole(role)}
                              disabled={isRolesSaving}
                              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold opacity-70 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ ...roleBadgeTextStyle, borderColor: "#2c2c2c", backgroundColor: "#101010", color: "#9ca3af", boxShadow: "none" }}
                            >
                              <span className="mr-2 text-[14px] leading-none">+</span>
                              <span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleRolesSave}
                          disabled={isRolesSaving || !hasRoleChanges}
                          className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRolesSaving ? "Saving..." : "Save Roles"}
                        </button>
                        <button
                          type="button"
                          onClick={resetRoles}
                          disabled={isRolesSaving || !hasRoleChanges}
                          className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset
                        </button>
                      </div>
                      {rolesError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{rolesError}</p> : null}
                      {rolesSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{rolesSuccess}</p> : null}
                    </section>

                    <section className="rounded-[24px] border border-[#1d1d1d] bg-[#0d0d0d] p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Avatar</p>
                      <p className="mt-3 text-xs leading-relaxed text-gray-400">Upload, replace, or delete the avatar for this account. PNG, JPG, and WEBP are available to all users. GIF, MP4, and WEBM require a higher profile tier.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => adminAvatarInputRef.current?.click()}
                          disabled={isAvatarUploading || isAvatarDeleting}
                          className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAvatarUploading ? "Uploading..." : hasActiveProfileAvatar ? "Replace Avatar" : "Upload Avatar"}
                        </button>
                        {hasActiveProfileAvatar ? (
                          <button
                            type="button"
                            onClick={handleAvatarDelete}
                            disabled={isAvatarUploading || isAvatarDeleting}
                            className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isAvatarDeleting ? "Deleting..." : "Delete Avatar"}
                          </button>
                        ) : null}
                        <input
                          ref={adminAvatarInputRef}
                          type="file"
                          accept={AVATAR_FILE_ACCEPT}
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      {avatarError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{avatarError}</p> : null}
                      {avatarSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{avatarSuccess}</p> : null}
                    </section>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
