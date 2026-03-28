"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";

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
  message: string;
  createdAt: string | null;
};

type Bridge = {
  getProfileById: (profileId: number) => Promise<UserProfile | null>;
  getProfileComments: (profileId: number) => Promise<ProfileComment[]>;
  addProfileComment: (profileId: number, message: string) => Promise<ProfileComment>;
  deleteProfileComment: (commentId: string) => Promise<string | null>;
  resendVerificationEmail: () => Promise<UserProfile | null>;
  updateUsername: (username: string) => Promise<UserProfile | null>;
  updateProfileRoles: (profileId: number, roles: string[]) => Promise<UserProfile | null>;
  updateAvatar: (file: File) => Promise<UserProfile | null>;
  deleteAvatar: () => Promise<UserProfile | null>;
  syncPresence: (options?: { path?: string; source?: string; forceVisit?: boolean }) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => () => void;
};

type RuntimeWindow = Window & {
  firebaseConfig?: { projectId?: string };
  sakuraCurrentUserSnapshot?: UserProfile | null;
  sakuraAuthStateSettled?: boolean;
  sakuraFirebaseAuth?: Bridge;
  sakuraFirebaseAuthError?: string;
};

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
const USER_UPDATE_EVENT = "sakura-user-update";
const PROFILE_PATH_STORAGE_KEY = "sakura-profile-path";
const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
const PROFILE_BUILD_MARKER = "role-colors-v19";
const repoBasePath = "/sakura.github.io";
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
const getProfileActionErrorMessage = (error: unknown, fallback: string) => {
  const code = getErrorCode(error);

  if (code === "auth/too-many-requests") {
    return "Too many requests. Wait a little before resending the verification email.";
  }

  if (code === "comments/login-required") {
    return "Sign in to leave a comment on this profile.";
  }

  if (code === "comments/delete-forbidden") {
    return "You can only delete your own comments or comments on your profile.";
  }

  return error instanceof Error ? error.message : fallback;
};
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

  if (normalizedRole === "sponsor") {
    return "Sponsor";
  }

  if (normalizedRole === "tester") {
    return "Tester";
  }

  if (normalizedRole === "subscriber") {
    return "Subscriber";
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
const ROLE_MANAGER_NAMES = new Set(["root"]);
const REMOVED_ROLE_NAMES = new Set([
  "super administrator",
  "administrator",
  "tester",
  "subscriber",
]);
const EDITABLE_ROLE_OPTIONS = [
  "root",
  "co-owner",
  "sponsor",
  "moderator",
  "user",
];
const ROLE_DISPLAY_ORDER = new Map(
  EDITABLE_ROLE_OPTIONS.map((role, index) => [normalizeRoleName(role), index])
);
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
const canManageRoles = (roles: string[]) =>
  normalizeRoleSelection(roles).some((role) => ROLE_MANAGER_NAMES.has(normalizeRoleName(role)));
const shouldPreferLoginName = (user: Pick<UserProfile, "login" | "displayName" | "providerIds">) =>
  Boolean(user.login?.trim()) &&
  (user.providerIds.includes("password") || !user.displayName?.trim());
const nameOf = (user: UserProfile) =>
  (shouldPreferLoginName(user) ? user.login?.trim() : user.displayName?.trim()) ||
  user.displayName?.trim() ||
  user.login?.trim() ||
  (typeof user.profileId === "number" ? `Profile #${user.profileId}` : "Sakura User");
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
  const [usernameInput, setUsernameInput] = useState("");
  const [isUsernameSaving, setIsUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [isRolesSaving, setIsRolesSaving] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const runtime = getWindowState();
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
      if (!getWindowState().sakuraFirebaseAuth && !getWindowState().sakuraFirebaseAuthError)
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
    if (!currentUser?.uid || currentUser.isAnonymous || !getWindowState().sakuraFirebaseAuth) return;
    getWindowState().sakuraFirebaseAuth?.syncPresence({ path: window.location.pathname, source: "profile-view", forceVisit: true }).catch(() => {});
  }, [currentUser?.uid, currentUser?.isAnonymous]);

  const visibleCurrentUser = currentUser && !currentUser.isAnonymous ? currentUser : null;
  const isOwner = Boolean(visibleCurrentUser && profile && visibleCurrentUser.uid === profile.uid);
  const activeProfile = profile;
  const hasUsername = Boolean(activeProfile?.login?.trim());
  const shouldShowUsernameSetup = Boolean(isOwner && activeProfile && !hasUsername);
  const profileRoles = activeProfile?.roles?.length ? normalizeRoleSelection(activeProfile.roles) : ["user"];
  const normalizedProfileRoles = profileRoles;
  const topProfileRole = profileRoles[0] ?? null;
  const profileHeadlineStyle = roleHeadlineStyle(topProfileRole);
  const shouldShowVerificationBanner = Boolean(
    isOwner &&
      activeProfile?.email &&
      activeProfile.emailVerified === false &&
      activeProfile.verificationRequired !== false
  );
  const canManageRoleAssignments = Boolean(visibleCurrentUser && canManageRoles(visibleCurrentUser.roles));
  const shouldShowPendingState =
    !authError &&
    !activeProfile &&
    (!authReady || !authStateSettled || isProfileLoading || (requestedProfileId !== null && !profileError));

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
  const canDeleteComment = (comment: ProfileComment) =>
    Boolean(
      visibleCurrentUser &&
        (comment.authorUid === visibleCurrentUser.uid ||
          (isOwner &&
            typeof activeProfile?.profileId === "number" &&
            comment.profileId === activeProfile.profileId))
    );

  useEffect(() => {
    if (!activeProfile) {
      setDraftRoles([]);
      setRolesError(null);
      setRolesSuccess(null);
      setVerificationError(null);
      setVerificationSuccess(null);
      setComments([]);
      setCommentsError(null);
      setCommentInput("");
      setCommentError(null);
      setCommentSuccess(null);
      setDeletingCommentId(null);
      return;
    }

    setDraftRoles(normalizeRoleSelection(activeProfile.roles));
    setRolesError(null);
    setRolesSuccess(null);
    setVerificationError(null);
    setVerificationSuccess(null);
    setUsernameInput(activeProfile.login ?? "");
    setUsernameError(null);
    setUsernameSuccess(null);
    setCommentInput("");
    setCommentError(null);
    setCommentSuccess(null);
    setDeletingCommentId(null);
  }, [activeProfile, activeProfileRoleSignature]);

  useEffect(() => {
    if (typeof window === "undefined" || !authReady || !authStateSettled || authError || !activeProfile?.profileId) {
      if (!activeProfile?.profileId) {
        setComments([]);
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
    if (!file || !bridge || !isOwner) return;
    setAvatarError(null);
    setAvatarSuccess(null);
    setIsAvatarUploading(true);
    try {
      const snapshot = await bridge.updateAvatar(file);
      if (snapshot) setProfile(snapshot);
      setAvatarSuccess("Avatar saved.");
    } catch (error) {
      setAvatarError(avatarErrorMessage(error));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    if (!bridge || !isOwner) return;
    setAvatarError(null);
    setAvatarSuccess(null);
    setIsAvatarDeleting(true);
    try {
      const snapshot = await bridge.deleteAvatar();
      if (snapshot) setProfile(snapshot);
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

  const handleUsernameSave = async () => {
    const bridge = getWindowState().sakuraFirebaseAuth;
    const nextUsername = usernameInput.trim().replace(/\s+/g, "");

    if (!bridge || !isOwner) {
      return;
    }

    if (!nextUsername) {
      setUsernameError("Enter a username.");
      return;
    }

    setUsernameError(null);
    setUsernameSuccess(null);
    setIsUsernameSaving(true);

    try {
      const snapshot = await bridge.updateUsername(nextUsername);

      if (snapshot) {
        setCurrentUser(snapshot);
        if (activeProfile && snapshot.uid === activeProfile.uid) {
          setProfile(snapshot);
        }
      }

      setUsernameSuccess("Username saved.");
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : "Could not save username.");
    } finally {
      setIsUsernameSaving(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bridge = getWindowState().sakuraFirebaseAuth;
    const nextComment = commentInput.trim();

    if (!bridge || !activeProfile?.profileId) {
      return;
    }

    if (!nextComment) {
      setCommentError("Write a comment before sending.");
      return;
    }

    setCommentError(null);
    setCommentSuccess(null);
    setIsCommentSubmitting(true);

    try {
      const savedComment = await bridge.addProfileComment(activeProfile.profileId, nextComment);
      setComments((currentComments) => [savedComment, ...currentComments.filter((comment) => comment.id !== savedComment.id)]);
      setCommentInput("");
      setCommentSuccess("Comment posted.");
    } catch (error) {
      setCommentError(getProfileActionErrorMessage(error, "Could not post this comment."));
    } finally {
      setIsCommentSubmitting(false);
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

      setCommentSuccess("Comment deleted.");
    } catch (error) {
      setCommentError(getProfileActionErrorMessage(error, "Could not delete this comment."));
    } finally {
      setDeletingCommentId((currentId) => (currentId === commentId ? null : currentId));
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
        <nav className="mb-8 flex flex-wrap items-center justify-end gap-3 rounded-[28px] border border-[#1b1b1b] bg-black/40 px-6 py-5 backdrop-blur-sm">
          <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Home</Link>
          {visibleCurrentUser?.profileId && !isOwner ? <a href={profilePath(visibleCurrentUser.profileId)} className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">My Profile</a> : null}
          {visibleCurrentUser ? <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isLoggingOut ? "Logging out..." : "Logout"}</button> : null}
        </nav>

        {authError ? <section className="rounded-[32px] border border-red-400/20 bg-red-500/10 px-8 py-12"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Auth Error</p><p className="mt-4 text-sm leading-relaxed text-red-100/85">{authError}</p></section> : null}
        {hasHydrated && showPendingState ? <section className="rounded-[32px] border border-[#181818] bg-[#090909]/85 px-6 py-5 shadow-[0_0_40px_rgba(255,183,197,0.04)]"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#ffb7c5]">Loading</p><p className="mt-2 text-sm text-gray-400">{requestedProfileId ? `Preparing profile #${requestedProfileId}...` : "Preparing profile..."}</p></div><div className="h-2 w-2 rounded-full bg-[#ffb7c5] animate-pulse"></div></div></section> : null}
        {hasHydrated && authReady && !authError && !isProfileLoading && !activeProfile && profileError ? <section className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-8 py-12 shadow-[0_0_60px_rgba(255,183,197,0.06)]"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">{requestedProfileId ? "Profile Missing" : "Guest State"}</p><p className="mt-4 text-sm leading-relaxed text-gray-400">{profileError}</p></section> : null}

        {activeProfile ? (
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-[34px] border border-[#201517] bg-[#0d0d0d] shadow-[0_0_80px_rgba(255,183,197,0.06)]">
              <div className="border-b border-[#1b1b1b] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.16),transparent_55%)] px-8 py-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col items-center gap-3">
                    {activeProfile.photoURL ? <img src={activeProfile.photoURL} alt={primaryName} className="h-24 w-24 rounded-[28px] border border-[#2c2023] object-cover shadow-[0_0_30px_rgba(255,183,197,0.14)]" /> : <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#2c2023] bg-[#1a1012] text-2xl font-black uppercase text-[#ffb7c5] shadow-[0_0_30px_rgba(255,183,197,0.14)]">{initials}</div>}
                    <span className={`inline-flex min-w-[104px] shrink-0 justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${activeProfile.presence?.isOnline ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2]" : "border-[#312228] bg-[#140d11] text-[#ffb7c5]"}`}>{activeProfile.presence?.isOnline ? "Online" : "Offline"}</span>
                  </div>
                  <div className="min-w-0">
                    <h1 style={profileHeadlineStyle} className="min-w-0 truncate text-3xl font-black uppercase tracking-tighter">{primaryName}</h1>
                    {hasUsername ? <p className="mt-2 text-sm font-medium text-[#c7d4cc]">@{activeProfile.login}</p> : shouldShowUsernameSetup ? <p className="mt-2 text-sm text-gray-500">Username not set yet.</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {profileRoles.map((role) => <span key={role} title={roleBadgeLabel(role)} style={{ ...roleBadgeStyle(role), ...roleBadgeTextStyle }} className="inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold"><span aria-hidden="true" className="inline-flex items-center">{renderRoleBadgeText(role)}</span></span>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-8 py-8 sm:grid-cols-2">
                {[
                  ["Profile ID", String(activeProfile.profileId ?? "Not assigned")],
                  ...(hasUsername || shouldShowUsernameSetup ? [["Username", hasUsername ? `@${activeProfile.login}` : "Not set yet"]] : []),
                  ["Account Created", formatTime(activeProfile.creationTime)],
                ].map(([label, value]) => <div key={label} className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">{label}</p><p className="mt-3 break-all text-sm leading-relaxed text-gray-300">{value}</p></div>)}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {shouldShowUsernameSetup ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Create Username</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">This account does not have a username yet. Create one so it appears on your profile and can be used for sign-in.</p>
                <div className="mt-5">
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">Username</span>
                    <input type="text" value={usernameInput} minLength={3} maxLength={24} autoComplete="username" onChange={(event) => setUsernameInput(event.target.value)} className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder="your_username" />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">Username without spaces. Letters, numbers, `.`, `_`, and `-` are supported.</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleUsernameSave} disabled={isUsernameSaving} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isUsernameSaving ? "Saving..." : "Save Username"}</button>
                </div>
                {usernameError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{usernameError}</p> : null}
                {usernameSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{usernameSuccess}</p> : null}
              </div> : null}

              {shouldShowVerificationBanner ? <div className="rounded-[32px] border border-[#4d3024] bg-[linear-gradient(180deg,#1a110d_0%,#120d0a_100%)] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Email not verified</p>
                <p className="mt-3 text-sm leading-relaxed text-[#f3d2c5]">Подтвердите почту, чтобы сохранить доступ к аккаунту и восстановлению входа.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleResendVerification} disabled={isVerificationSending} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isVerificationSending ? "Sending..." : "Resend verification email"}</button>
                </div>
                {verificationError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{verificationError}</p> : null}
                {verificationSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{verificationSuccess}</p> : null}
              </div> : null}

              {canManageRoleAssignments && activeProfile?.profileId ? <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
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

              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Avatar</p>
                <div className="mt-5 rounded-[24px] border border-[#1d1d1d] bg-[#090909] p-4">
                  <p className="text-sm font-semibold text-white">{activeProfile.photoURL ? "Custom Avatar" : "Generated Avatar"}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">{isOwner ? "Upload, replace, or delete your avatar here." : "Only the owner can change this avatar."}</p>
                  {isOwner ? <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => avatarInputRef.current?.click()} disabled={isAvatarUploading || isAvatarDeleting} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isAvatarUploading ? "Uploading..." : activeProfile.photoURL ? "Replace Avatar" : "Upload Avatar"}</button>{activeProfile.photoURL ? <button type="button" onClick={handleAvatarDelete} disabled={isAvatarUploading || isAvatarDeleting} className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{isAvatarDeleting ? "Deleting..." : "Delete Avatar"}</button> : null}<input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} className="hidden" /></div> : null}
                  {avatarError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{avatarError}</p> : null}
                  {avatarSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{avatarSuccess}</p> : null}
                </div>
              </div>

              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Profile Comments</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">A public wall for this profile. Only signed-in users can leave a message.</p>

                {visibleCurrentUser ? (
                  <form onSubmit={handleCommentSubmit} className="mt-5">
                    <label className="block">
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">New Comment</span>
                      <textarea value={commentInput} maxLength={280} rows={4} onChange={(event) => setCommentInput(event.target.value)} className="w-full resize-y rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55" placeholder={`Write something for ${primaryName}...`} />
                    </label>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                      <span>Posting as @{visibleCurrentUser.login ?? visibleCurrentUser.displayName ?? "member"}</span>
                      <span>{commentInput.trim().length}/280</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button type="submit" disabled={isCommentSubmitting || !commentInput.trim()} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isCommentSubmitting ? "Posting..." : "Post Comment"}</button>
                    </div>
                    {commentError ? <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{commentError}</p> : null}
                    {commentSuccess ? <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{commentSuccess}</p> : null}
                  </form>
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
                      const showDeleteAction = canDeleteComment(comment);
                      const commentInitials = initialsFromText(comment.authorName);

                      return <div key={comment.id} className="rounded-[24px] border border-[#1d1d1d] bg-[#090909] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            {comment.authorPhotoURL ? <img src={comment.authorPhotoURL} alt={comment.authorName} className="h-11 w-11 shrink-0 rounded-2xl border border-[#2a2022] object-cover shadow-[0_0_18px_rgba(255,183,197,0.1)]" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2a2022] bg-[#1a1012] text-[11px] font-black uppercase text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.08)]">{commentInitials}</div>}
                            <div className="min-w-0">
                              {comment.authorProfileId ? <a href={profilePath(comment.authorProfileId)} className="block truncate text-sm font-semibold text-[#ffd2dc] transition hover:text-white">{comment.authorName}</a> : <p className="truncate text-sm font-semibold text-[#ffd2dc]">{comment.authorName}</p>}
                              <p className="mt-1 text-xs text-gray-500">{formatTime(comment.createdAt)}</p>
                            </div>
                          </div>
                          {showDeleteAction ? <button type="button" onClick={() => handleCommentDelete(comment.id)} disabled={isDeletingComment} className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{isDeletingComment ? "Deleting..." : "Delete"}</button> : null}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{comment.message}</p>
                      </div>;
                    })}
                  </div> : null}
                </div>
              </div>

            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
