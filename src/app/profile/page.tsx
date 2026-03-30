"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { AvatarMedia, AVATAR_FILE_ACCEPT } from "../avatar-media";
import { HeaderSocialLinks } from "../header-social-links";
import { SiteOnlineBadge } from "../site-online-badge";

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
  createdAt: string | null;
  updatedAt?: string | null;
};

type Bridge = {
  getProfileById: (profileId: number) => Promise<UserProfile | null>;
  getProfileByAuthorName: (authorName: string) => Promise<UserProfile | null>;
  getProfileComments: (profileId: number) => Promise<ProfileComment[]>;
  addProfileComment: (profileId: number, message: string, mediaFile?: File | null) => Promise<ProfileComment>;
  updateProfileComment: (
    commentId: string,
    message: string,
    mediaFile?: File | null,
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
  updateAvatar: (file: File) => Promise<UserProfile | null>;
  deleteAvatar: () => Promise<UserProfile | null>;
  adminUpdateProfileAvatar: (profileId: number, file: File) => Promise<UserProfile | null>;
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
  sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraFirebaseAuth?: Bridge;
  sakuraFirebaseAuthError?: string;
};

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
const USER_UPDATE_EVENT = "sakura-user-update";
const PROFILE_PATH_STORAGE_KEY = "sakura-profile-path";
const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
const PROFILE_BUILD_MARKER = "role-colors-v46";
const repoBasePath = "/sakura.github.io";
const COMMENT_MEDIA_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";
const PRESENCE_ACTIVE_WINDOW_MS = 5 * 60 * 1000;
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
    return "You can only delete your own comments, comments on your profile, or moderate comments with staff roles.";
  }

  if (code === "comments/update-forbidden") {
    return "You can only edit your own comments unless you are root.";
  }

  if (code === "comments/media-unsupported") {
    return "Only PNG, JPG, WEBP, and GIF files are supported in comments.";
  }

  if (code === "comments/media-too-large") {
    return "The selected comment media is too large to save.";
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
    return "Подтвердите почту, прежде чем пользоваться профилем и комментариями.";
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
    ? "Comment media could not be saved. If attachments are enabled, allow mediaURL and mediaType in profileComments rules."
    : "Comment could not be saved. Check Firestore rules for profileComments.";
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
    ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
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
const ROLE_MANAGER_NAMES = new Set(["root"]);
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
const canModerateComments = (roles: string[]) =>
  normalizeRoleSelection(roles).some((role) =>
    COMMENT_MODERATOR_ROLE_NAMES.has(normalizeRoleName(role))
  );
const deriveVisibleProfileRoles = (
  profile: Pick<UserProfile, "roles" | "isBanned"> | null | undefined
) => {
  if (profile?.isBanned === true) {
    return ["banned"];
  }

  return normalizeRoleSelection(profile?.roles ?? []);
};
const profileNameOf = (user: Pick<UserProfile, "login" | "displayName" | "profileId">) =>
  user.displayName?.trim() ||
  user.login?.trim() ||
  (typeof user.profileId === "number" ? `Profile #${user.profileId}` : "Sakura User");
const nameOf = (user: UserProfile) =>
  profileNameOf(user);
const initialsOf = (user: UserProfile) =>
  (nameOf(user) || user.email || (typeof user.profileId === "number" ? `Profile ${user.profileId}` : "SA"))
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
const avatarErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Avatar action failed.");
const getInitialRequestedProfileId = () => {
  if (typeof window === "undefined") return null;
  const fallback = window.sessionStorage.getItem(PROFILE_PATH_STORAGE_KEY);
  if (fallback) window.sessionStorage.removeItem(PROFILE_PATH_STORAGE_KEY);
  return parseProfileId(window.location.pathname) ?? parseProfileId(fallback);
};
const getInitialCurrentUser = () =>
  typeof window === "undefined" ? null : getWindowState().sakuraCurrentUserSnapshot ?? null;
const getInitialProfile = (currentUser: UserProfile | null, requestedProfileId: number | null) =>
  currentUser && !currentUser.isAnonymous && (requestedProfileId === null || (currentUser.profileId ?? null) === requestedProfileId)
    ? currentUser
    : null;
const getInitialBootstrap = () => {
  const currentUser = getInitialCurrentUser();
  const requestedProfileId = getInitialRequestedProfileId();

  if (
    typeof window !== "undefined" &&
    requestedProfileId !== null &&
    window.location.pathname !== profilePath(requestedProfileId)
  ) {
    window.history.replaceState(null, "", profilePath(requestedProfileId));
  }

  return {
    authReady: typeof window !== "undefined" && Boolean(getWindowState().sakuraFirebaseAuth),
    authStateSettled: typeof window !== "undefined" && Boolean(getWindowState().sakuraAuthStateSettled),
    authError: typeof window === "undefined" ? null : getWindowState().sakuraFirebaseAuthError ?? null,
    currentUser,
    requestedProfileId,
    profile: getInitialProfile(currentUser, requestedProfileId),
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const adminAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [bootstrap] = useState(getInitialBootstrap);
  const [authReady, setAuthReady] = useState(bootstrap.authReady);
  const [authStateSettled, setAuthStateSettled] = useState(bootstrap.authStateSettled);
  const [authError, setAuthError] = useState<string | null>(bootstrap.authError);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(bootstrap.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(bootstrap.profile);
  const [requestedProfileId] = useState<number | null>(bootstrap.requestedProfileId);
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
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [commentAuthorProfiles, setCommentAuthorProfiles] = useState<Record<number, UserProfile>>({});
  const [commentAuthorProfilesByCommentId, setCommentAuthorProfilesByCommentId] = useState<Record<string, UserProfile>>({});
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentMediaFile, setCommentMediaFile] = useState<File | null>(null);
  const [commentMediaPreviewUrl, setCommentMediaPreviewUrl] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentMessage, setEditingCommentMessage] = useState("");
  const [editingCommentMediaFile, setEditingCommentMediaFile] = useState<File | null>(null);
  const [editingCommentMediaPreviewUrl, setEditingCommentMediaPreviewUrl] = useState<string | null>(null);
  const [isEditingCommentMediaRemoved, setIsEditingCommentMediaRemoved] = useState(false);
  const [isCommentUpdating, setIsCommentUpdating] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [siteOnlineCount, setSiteOnlineCount] = useState<number | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editingCommentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentMediaInputRef = useRef<HTMLInputElement | null>(null);
  const editingCommentMediaInputRef = useRef<HTMLInputElement | null>(null);
  const ownerUsernameInputRef = useRef<HTMLInputElement | null>(null);
  const adminUsernameInputRef = useRef<HTMLInputElement | null>(null);

  const syncTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    setHasHydrated(true);
  }, []);

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
    void runtime.sakuraStartFirebaseAuth?.();
    let unsubscribe: () => void = () => {};
    const sync = () => {
      if (runtime.sakuraFirebaseAuth) {
        setAuthReady(true);
        setAuthStateSettled(Boolean(runtime.sakuraAuthStateSettled));
        setAuthError(null);
        setCurrentUser(runtime.sakuraCurrentUserSnapshot ?? null);
        unsubscribe();
        unsubscribe = runtime.sakuraFirebaseAuth.onAuthStateChanged((user) => setCurrentUser(user));
        return;
      }
      if (runtime.sakuraFirebaseAuthError) setAuthError(runtime.sakuraFirebaseAuthError);
    };
    const onAuthStateSettled = () => {
      setAuthStateSettled(Boolean(getWindowState().sakuraAuthStateSettled));
    };
    const onUserUpdate = () => setCurrentUser(getWindowState().sakuraCurrentUserSnapshot ?? null);
    const onError = () =>
      setAuthError(
        getWindowState().sakuraFirebaseAuthError ??
          "Firebase Auth is still loading. Reload the page if this does not clear soon."
      );
    const timeoutId = window.setTimeout(() => {
      if (
        !getWindowState().sakuraFirebaseAuth &&
        !getWindowState().sakuraStartFirebaseAuth &&
        !getWindowState().sakuraFirebaseAuthError
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
        setProfile(null);
        setProfileError(error instanceof Error ? error.message : "Could not load this profile.");
      })
      .finally(() => setIsProfileLoading(false));
  }, [authReady, authStateSettled, authError, currentUser, requestedProfileId]);

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
    const refreshSiteOnlineCount = async () => {
      const bridge = getWindowState().sakuraFirebaseAuth;

      if (!bridge) {
        return;
      }

      try {
        const nextCount = await bridge.getSiteOnlineCount();

        if (!isCancelled) {
          setSiteOnlineCount(nextCount);
        }
      } catch (error) {}
    };

    void refreshSiteOnlineCount();
    const intervalId = window.setInterval(() => {
      void refreshSiteOnlineCount();
    }, 60000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authReady]);

  const visibleCurrentUser = currentUser && !currentUser.isAnonymous ? currentUser : null;
  const isCurrentAccountVerificationLocked = isEmailVerificationLockedForProfile(visibleCurrentUser);
  const isOwner = Boolean(visibleCurrentUser && profile && visibleCurrentUser.uid === profile.uid);
  const activeProfile = profile;
  const activePresence =
    isOwner && visibleCurrentUser?.uid === activeProfile?.uid
      ? visibleCurrentUser?.presence ?? activeProfile?.presence ?? null
      : activeProfile?.presence ?? null;
  const isActiveProfileOnline = isPresenceOnlineNow(activePresence);
  const hasUsername = Boolean(activeProfile?.login?.trim());
  const requiresUsernamePasswordConfirmation = Boolean(
    isOwner && visibleCurrentUser?.providerIds?.includes("password")
  );
  const profileRoles = deriveVisibleProfileRoles(activeProfile);
  const normalizedProfileRoles = profileRoles;
  const topProfileRole = profileRoles[0] ?? null;
  const profileHeadlineStyle = roleHeadlineStyle(topProfileRole);
  const metaCardStyle = profileMetaCardStyle(topProfileRole);
  const metaLabelStyle = profileMetaLabelStyle(topProfileRole);
  const metaValueStyle = profileMetaValueStyle(topProfileRole);
  const metaValuePillStyle = profileMetaValuePillStyle(topProfileRole);
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
  const canOpenAdminPanel = Boolean(canManageRoleAssignments && activeProfile?.profileId);
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
  const activeProfileRoleSignature = activeProfile?.roles?.join("|") ?? "";
  const applyUpdatedProfileSnapshot = (snapshot: UserProfile | null) => {
    if (!snapshot) {
      return;
    }

    if (activeProfile && snapshot.uid === activeProfile.uid) {
      setProfile(snapshot);
    }

    if (visibleCurrentUser?.uid === snapshot.uid) {
      setCurrentUser(snapshot);
    }
  };
  const normalizeCommentAuthorKey = (value: string | null | undefined) =>
    typeof value === "string"
      ? value.trim().replace(/^@+/, "").toLocaleLowerCase().replace(/\s+/g, " ")
      : "";
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

    if (resolvedCommentAuthorProfile?.photoURL) {
      return resolvedCommentAuthorProfile.photoURL;
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
        (comment.authorUid === visibleCurrentUser.uid ||
          canModerateComments(visibleCurrentUser.roles) ||
          (isOwner &&
            typeof activeProfile?.profileId === "number" &&
            comment.profileId === activeProfile.profileId))
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
      setCommentsError(null);
      setIsAdminPanelOpen(false);
      setBanError(null);
      setBanSuccess(null);
      setCommentInput("");
      setCommentError(null);
      setCommentSuccess(null);
      setEditingCommentId(null);
      setEditingCommentMessage("");
      setEditingCommentMediaFile(null);
      setEditingCommentMediaPreviewUrl(null);
      setIsEditingCommentMediaRemoved(false);
      setIsCommentUpdating(false);
      setDeletingCommentId(null);
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
    setEditingCommentId(null);
    setEditingCommentMessage("");
    setEditingCommentMediaFile(null);
    setEditingCommentMediaPreviewUrl(null);
    setIsEditingCommentMediaRemoved(false);
    setIsCommentUpdating(false);
    setDeletingCommentId(null);
  }, [activeProfile, activeProfileRoleSignature]);

  useEffect(() => {
    if (!canOpenAdminPanel) {
      setIsAdminPanelOpen(false);
    }
  }, [canOpenAdminPanel]);

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
    setIsCommentsLoading(true);
    setCommentsError(null);

    bridge
      .getProfileComments(activeProfile.profileId)
      .then((nextComments) => {
        if (isCancelled) return;
        setComments(nextComments);
      })
      .catch((error) => {
        if (isCancelled) return;
        setComments([]);
        setCommentsError(getProfileActionErrorMessage(error, "Could not load profile comments."));
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

  const normalizedDraftRoles = normalizeRoleSelection(draftRoles);
  const availableRoleOptions = EDITABLE_ROLE_OPTIONS.filter(
    (role) =>
      !normalizedDraftRoles.some(
        (draftRole) => normalizeRoleName(draftRole) === normalizeRoleName(role)
      )
  );
  const hasRoleChanges =
    normalizedDraftRoles.join("|") !== normalizedProfileRoles.join("|");

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
    setAvatarError(null);
    setAvatarSuccess(null);
    setIsAvatarUploading(true);
    try {
      let snapshot: UserProfile | null = null;

      if (isOwner) {
        snapshot = await withAvatarActionTimeout(bridge.updateAvatar(file));
      } else if (canOpenAdminPanel && activeProfile?.profileId) {
        snapshot = await withAvatarActionTimeout(
          bridge.adminUpdateProfileAvatar(activeProfile.profileId, file)
        );
      }

      applyUpdatedProfileSnapshot(snapshot);
      setAvatarSuccess(isOwner ? "Avatar saved." : "Avatar updated.");
    } catch (error) {
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

    if (!bridge || !activeProfile?.profileId) {
      return;
    }

    if (!nextComment && !commentMediaFile) {
      setCommentError("Write a comment or attach media before sending.");
      return;
    }

    setCommentError(null);
    setCommentSuccess(null);
    setIsCommentSubmitting(true);

    try {
      const savedComment = await bridge.addProfileComment(activeProfile.profileId, nextComment, commentMediaFile);
      setComments((currentComments) => [savedComment, ...currentComments.filter((comment) => comment.id !== savedComment.id)]);
      setCommentInput("");
      setCommentMediaFile(null);
      if (commentMediaInputRef.current) {
        commentMediaInputRef.current.value = "";
      }
      setCommentSuccess("Comment posted.");
    } catch (error) {
      setCommentError(
        getErrorCode(error) === "comments/write-denied"
          ? getCommentWriteDeniedMessage(Boolean(commentMediaFile))
          : getProfileActionErrorMessage(error, "Could not post this comment.")
      );
    } finally {
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

  const handleCommentDelete = async (commentId: string) => {
    const bridge = getWindowState().sakuraFirebaseAuth;

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
    } catch (error) {
      setCommentError(getProfileActionErrorMessage(error, "Could not delete this comment."));
    } finally {
      setDeletingCommentId((currentId) => (currentId === commentId ? null : currentId));
    }
  };

  const handleCommentEditStart = (comment: ProfileComment) => {
    setCommentError(null);
    setCommentSuccess(null);
    setEditingCommentId(comment.id);
    setEditingCommentMessage(comment.message);
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

    setCommentError(null);
    setCommentSuccess(null);
    setIsCommentUpdating(true);

    try {
      const updatedComment = await bridge.updateProfileComment(
        commentId,
        nextMessage,
        editingCommentMediaFile,
        isEditingCommentMediaRemoved
      );

      if (updatedComment) {
        setComments((currentComments) =>
          currentComments.map((comment) =>
            comment.id === updatedComment.id ? updatedComment : comment
          )
        );
      }

      setEditingCommentId(null);
      setEditingCommentMessage("");
      setEditingCommentMediaFile(null);
      setEditingCommentMediaPreviewUrl(null);
      setIsEditingCommentMediaRemoved(false);
      if (editingCommentMediaInputRef.current) {
        editingCommentMediaInputRef.current.value = "";
      }
      setCommentSuccess("Comment updated.");
    } catch (error) {
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
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative lg:pr-[190px]">
            <nav className="flex flex-col gap-4 rounded-[28px] border border-[#1b1b1b] bg-black/40 px-6 py-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <HeaderSocialLinks showLabel />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Home</Link>
                {visibleCurrentUser?.profileId && !isOwner ? <a href={profilePath(visibleCurrentUser.profileId)} className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">My Profile</a> : null}
                {visibleCurrentUser ? <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isLoggingOut ? "Logging out..." : "Logout"}</button> : null}
                <div className="lg:hidden">
                  <SiteOnlineBadge count={siteOnlineCount} profileHrefBuilder={profilePath} defaultVisible />
                </div>
              </div>
            </nav>

            <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 lg:flex">
              <SiteOnlineBadge
                count={siteOnlineCount}
                profileHrefBuilder={profilePath}
                defaultVisible
              />
            </div>
          </div>
        </div>

        {authError ? <section className="rounded-[32px] border border-red-400/20 bg-red-500/10 px-8 py-12"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Auth Error</p><p className="mt-4 text-sm leading-relaxed text-red-100/85">{authError}</p></section> : null}
        {hasHydrated && showPendingState ? <section className="rounded-[32px] border border-[#181818] bg-[#090909]/85 px-6 py-5 shadow-[0_0_40px_rgba(255,183,197,0.04)]"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#ffb7c5]">Loading</p><p className="mt-2 text-sm text-gray-400">{requestedProfileId ? `Preparing profile #${requestedProfileId}...` : "Preparing profile..."}</p></div><div className="h-2 w-2 rounded-full bg-[#ffb7c5] animate-pulse"></div></div></section> : null}
        {hasHydrated && authReady && !authError && !isProfileLoading && !activeProfile && profileError ? <section className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-8 py-12 shadow-[0_0_60px_rgba(255,183,197,0.06)]"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">{requestedProfileId ? "Profile Missing" : "Guest State"}</p><p className="mt-4 text-sm leading-relaxed text-gray-400">{profileError}</p></section> : null}

        {activeProfile ? (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,57.5fr)_minmax(0,42.5fr)] lg:items-start">
            <div className="w-full self-start overflow-hidden rounded-[34px] border border-[#201517] bg-[#0d0d0d] shadow-[0_0_80px_rgba(255,183,197,0.06)]">
              <div className="border-b border-[#1b1b1b] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.16),transparent_55%)] px-8 py-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col items-center gap-3">
                  {activeProfile.photoURL ? <AvatarMedia src={activeProfile.photoURL} alt={primaryName} decoding="async" className="h-24 w-24 rounded-[28px] border border-[#2c2023] object-cover shadow-[0_0_30px_rgba(255,183,197,0.14)]" /> : <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#2c2023] bg-[#1a1012] text-2xl font-black uppercase text-[#ffb7c5] shadow-[0_0_30px_rgba(255,183,197,0.14)]">{initials}</div>}
                  <span className={`inline-flex min-w-[104px] shrink-0 justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isActiveProfileOnline ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2]" : "border-[#312228] bg-[#140d11] text-[#ffb7c5]"}`}>{isActiveProfileOnline ? "Online" : "Offline"}</span>
                  </div>
                  <div className="min-w-0">
                    <h1 style={profileHeadlineStyle} className="min-w-0 truncate text-3xl font-black uppercase tracking-tighter">{primaryName}</h1>
                    {hasUsername ? <p className="mt-2 text-sm font-medium text-[#c7d4cc]">@{activeProfile.login}</p> : isOwner ? <p className="mt-2 text-sm text-gray-500">Login not set yet.</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {profileRoles.map((role) => <span key={role} title={roleBadgeLabel(role)} style={{ ...roleBadgeStyle(role), ...roleBadgeTextStyle }} className="inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold"><span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span></span>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-8 py-8 sm:grid-cols-2">
                {[
                  ["Profile ID", String(activeProfile.profileId ?? "Not assigned")],
                  ["Profile Name", primaryName],
                  ...(hasUsername || isOwner ? [["Login", hasUsername ? `@${activeProfile.login}` : "Not set yet"]] : []),
                  ["Account Created", formatTime(activeProfile.creationTime)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={metaCardStyle}
                    className="rounded-[26px] border p-5 backdrop-blur-sm"
                  >
                    <p
                      style={metaLabelStyle}
                      className="font-mono text-[10px] uppercase tracking-[0.32em]"
                    >
                      {label}
                    </p>
                    <div className="mt-4">
                      <span
                        style={metaValuePillStyle}
                        className="inline-flex max-w-full items-center rounded-full border px-4 py-2.5"
                      >
                        <span
                          style={metaValueStyle}
                          className="break-words text-[14px] leading-none sm:text-[15px]"
                        >
                          {value}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-8 pb-8">
                <div className="rounded-[26px] border border-[#2f161d] bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.1),transparent_58%),linear-gradient(180deg,#0c0a0b_0%,#090909_100%)] p-5 shadow-[0_0_26px_rgba(255,143,177,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Subscription</p>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400">Subscription Pricing</p>
                    </div>
                    <span style={{ ...subscriptionBadgeStyle, ...roleBadgeTextStyle }} className="inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold">
                      {subscriptionSummary.status}
                    </span>
                  </div>
                  <div className="mt-5 rounded-[22px] border border-[#24171b] bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.08),transparent_62%),#090909] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b78a95]">Current Subscription</p>
                    <p className="mt-3 text-lg font-bold text-white">{subscriptionSummary.title}</p>
                    <p className="mt-3 text-xs leading-relaxed text-gray-400">{subscriptionSummary.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-6 self-start">
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
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">New Comment</span>
                      <textarea ref={commentTextareaRef} value={commentInput} maxLength={280} rows={3} onChange={(event) => setCommentInput(event.target.value)} onInput={(event) => syncTextareaHeight(event.currentTarget)} className="w-full resize-none overflow-hidden rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder={`Write something for ${primaryName}...`} />
                    </label>
                    <input ref={commentMediaInputRef} type="file" accept={COMMENT_MEDIA_FILE_ACCEPT} onChange={handleCommentMediaChange} className="hidden" />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {commentMediaFile ? <span className="min-w-0 truncate text-xs text-gray-400">{commentMediaFile.name}</span> : null}
                      {commentMediaFile ? <button type="button" onClick={clearCommentMediaSelection} className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Remove</button> : null}
                    </div>
                    {commentMediaPreviewUrl ? <div className="mt-3 overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                      <img src={commentMediaPreviewUrl} alt="Selected comment media preview" className="block max-h-[320px] w-full object-contain" />
                    </div> : null}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" disabled={isCommentSubmitting || (!commentInput.trim() && !commentMediaFile)} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isCommentSubmitting ? "Posting..." : "Post"}</button>
                        <button type="button" onClick={() => commentMediaInputRef.current?.click()} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">
                          Media
                        </button>
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
                    <p className="text-sm leading-relaxed text-[#f3d2c5]">Подтвердите почту, чтобы открыть профиль и пользоваться комментариями.</p>
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
                      const isEditingComment = editingCommentId === comment.id;
                      const isSavingCommentUpdate = isEditingComment && isCommentUpdating;
                      const showEditAction = canEditComment(comment);
                      const showDeleteAction = canDeleteComment(comment);
                      const commentInitials = initialsFromText(comment.authorName);
                      const resolvedCommentAuthorRole = resolveCommentAuthorRole(comment);
                      const resolvedCommentAuthorPhotoURL = resolveCommentAuthorPhotoURL(comment);
                      const commentAuthorStyle = roleCommentAuthorStyle(resolvedCommentAuthorRole);
                      const isCommentEdited = Boolean(comment.updatedAt);

                      return <div key={comment.id} className="rounded-[24px] border border-[#1d1d1d] bg-[#090909] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            {resolvedCommentAuthorPhotoURL ? <AvatarMedia src={resolvedCommentAuthorPhotoURL} alt={comment.authorName} loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-2xl border border-[#2a2022] object-cover shadow-[0_0_18px_rgba(255,183,197,0.1)]" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2a2022] bg-[#1a1012] text-[11px] font-black uppercase text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.08)]">{commentInitials}</div>}
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                {comment.authorProfileId ? <a href={profilePath(comment.authorProfileId)} style={commentAuthorStyle} className="min-w-0 truncate text-sm font-semibold transition hover:text-white">{comment.authorName}</a> : <p style={commentAuthorStyle} className="min-w-0 truncate text-sm font-semibold">{comment.authorName}</p>}
                                {isCommentEdited ? <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.16em] text-gray-500">Edited</span> : null}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">{formatTime(comment.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {showEditAction && !isEditingComment ? <button type="button" onClick={() => handleCommentEditStart(comment)} disabled={isDeletingComment || isCommentUpdating} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Edit</button> : null}
                            {showDeleteAction ? <button type="button" onClick={() => handleCommentDelete(comment.id)} disabled={isDeletingComment || isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{isDeletingComment ? "Deleting..." : "Delete"}</button> : null}
                          </div>
                        </div>
                        {isEditingComment ? <div className="mt-3">
                          <textarea ref={editingCommentTextareaRef} value={editingCommentMessage} maxLength={280} rows={3} onChange={(event) => setEditingCommentMessage(event.target.value)} onInput={(event) => syncTextareaHeight(event.currentTarget)} className="w-full resize-none overflow-hidden rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder="Update comment..." />
                          <input ref={editingCommentMediaInputRef} type="file" accept={COMMENT_MEDIA_FILE_ACCEPT} onChange={handleEditingCommentMediaChange} className="hidden" />
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {editingCommentMediaFile ? <span className="min-w-0 truncate text-xs text-gray-400">{editingCommentMediaFile.name}</span> : null}
                            {editingCommentMediaFile ? <button type="button" onClick={clearEditingCommentMediaSelection} className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Remove file</button> : null}
                            {!editingCommentMediaFile && comment.mediaURL && !isEditingCommentMediaRemoved ? <button type="button" onClick={removeEditingCommentMedia} className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Remove media</button> : null}
                          </div>
                          {editingCommentMediaPreviewUrl ? <div className="mt-3 overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                            <img src={editingCommentMediaPreviewUrl} alt="Updated comment media preview" className="block max-h-[320px] w-full object-contain" />
                          </div> : (!isEditingCommentMediaRemoved && comment.mediaURL ? <div className="mt-3 overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                            <img src={comment.mediaURL} alt={`${comment.authorName} comment attachment`} loading="lazy" className="block max-h-[320px] w-full object-contain" />
                          </div> : null)}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <button type="button" onClick={() => handleCommentUpdate(comment.id)} disabled={isSavingCommentUpdate || (!editingCommentMessage.trim() && !editingCommentMediaFile && !(comment.mediaURL && !isEditingCommentMediaRemoved))} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isSavingCommentUpdate ? "Saving..." : "Save"}</button>
                              <button type="button" onClick={() => editingCommentMediaInputRef.current?.click()} disabled={isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Media</button>
                              <button type="button" onClick={handleCommentEditCancel} disabled={isSavingCommentUpdate} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
                            </div>
                            <span className="text-xs text-gray-500">{editingCommentMessage.trim().length}/280</span>
                          </div>
                        </div> : <div className="mt-3 space-y-3">
                          {comment.message ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{comment.message}</p> : null}
                          {comment.mediaURL ? <div className="overflow-hidden rounded-[22px] border border-[#232323] bg-[#050505]">
                            <img src={comment.mediaURL} alt={`${comment.authorName} comment attachment`} loading="lazy" className="block max-h-[360px] w-full object-contain" />
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
                <p className="mt-3 text-sm leading-relaxed text-[#f3d2c5]">Подтвердите почту, чтобы сохранить доступ к аккаунту и восстановлению входа.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleResendVerification} disabled={isVerificationSending} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isVerificationSending ? "Sending..." : "Resend verification email"}</button>
                </div>
                {verificationError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{verificationError}</p> : null}
                {verificationSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{verificationSuccess}</p> : null}
              </div> : null}

              {false && canManageRoleAssignments && activeProfile?.profileId ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Role Access</p>
                <p className="mt-3 text-xs leading-relaxed text-gray-400">Open any participant profile and manage its roles here. Only root accounts can save changes.</p>
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
                  <p className="text-sm font-semibold text-white">{activeProfile.photoURL ? "Custom Avatar" : "Generated Avatar"}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">Upload, replace, or delete your avatar here. PNG and JPG support up to 5 MB. GIF, WEBP, MP4, and WEBM are also supported with a smaller limit.</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={isAvatarUploading || isAvatarDeleting} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">
                      {isAvatarUploading ? "Uploading..." : activeProfile.photoURL ? "Replace Avatar" : "Upload Avatar"}
                    </button>
                    {activeProfile.photoURL ? <button type="button" onClick={handleAvatarDelete} disabled={isAvatarUploading || isAvatarDeleting} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{isAvatarDeleting ? "Deleting..." : "Delete Avatar"}</button> : null}
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
                      <p className="mt-3 text-xs leading-relaxed text-gray-400">Upload, replace, or delete the avatar for this account. PNG and JPG support up to 5 MB. GIF, WEBP, MP4, and WEBM are also supported with a smaller limit.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => adminAvatarInputRef.current?.click()}
                          disabled={isAvatarUploading || isAvatarDeleting}
                          className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAvatarUploading ? "Uploading..." : activeProfile.photoURL ? "Replace Avatar" : "Upload Avatar"}
                        </button>
                        {activeProfile.photoURL ? (
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
