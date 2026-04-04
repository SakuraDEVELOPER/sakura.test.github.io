// app/page.tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import dynamic from "next/dynamic";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AvatarMedia } from "./avatar-media";
import { HeaderSocialLinks } from "./header-social-links";
import { SiteOnlineBadge } from "./site-online-badge";
import { readCachedAuthSnapshot } from "@/lib/auth-snapshot-cache";
import { writeCachedProfileSnapshot } from "@/lib/profile-cache";
import { writeCachedProfileComments } from "@/lib/profile-comments-cache";
import { readCachedSiteOnlineCount, writeCachedSiteOnlineCount } from "@/lib/site-online-cache";
import { getSupabasePublicObjectUrl, getSupabaseRenderedImageUrl } from "@/lib/supabase";

const repoBasePath = "/sakura.github.io";
const homeLogoStoragePath = process.env.NEXT_PUBLIC_HOME_LOGO_PATH?.trim() || "";
const homeLogoSrc =
  getSupabaseRenderedImageUrl(homeLogoStoragePath, {
    width: 160,
    height: 160,
    quality: 92,
    resize: "contain",
  }) || getSupabasePublicObjectUrl(homeLogoStoragePath);
const FeatureShowcase = dynamic(() => import("./home-feature-showcase"), {
  ssr: false,
  loading: () => <section className="px-10 pt-2 pb-12" aria-hidden="true" />,
});

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 9999) * 10000;
  return value - Math.floor(value);
}

const sakuraLeaves = Array.from({ length: 15 }, (_, index) => {
  const startLeft = pseudoRandom(index + 1) * 100;
  const drift = pseudoRandom((index + 1) * 7) * 10 - 5;

  return {
    id: index,
    startLeft: `${startLeft}%`,
    endLeft: `${Math.min(100, Math.max(0, startLeft + drift))}%`,
    duration: pseudoRandom((index + 1) * 11) * 10 + 10,
    delay: pseudoRandom((index + 1) * 13) * 20,
  };
});

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

type AuthMode = "login" | "register";

type VisitHistoryEntry = {
  timestamp: string;
  path: string;
  source: string;
  status: "online" | "offline";
};

type PresenceSnapshot = {
  status: "online" | "offline";
  isOnline: boolean;
  currentPath: string | null;
  lastSeenAt: string | null;
};

type AuthUserSnapshot = {
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
  loginHistory: string[];
  visitHistory: VisitHistoryEntry[];
  presence: PresenceSnapshot | null;
};

type FirebaseAuthBridge = {
  __runtimeVersion?: string;
  login: (identifier: string, password: string) => Promise<AuthUserSnapshot | null>;
  loginWithGoogle: () => Promise<AuthUserSnapshot | null>;
  completeGoogleAccount: (credentials: {
    login: string;
    displayName?: string;
    password: string;
  }) => Promise<AuthUserSnapshot | null>;
  register: (credentials: {
    login: string;
    displayName?: string;
    email: string;
    password: string;
  }) => Promise<AuthUserSnapshot | null>;
  resendVerificationEmail: () => Promise<AuthUserSnapshot | null>;
  refreshVerificationStatus: () => Promise<AuthUserSnapshot | null>;
  getProfileById: (profileId: number) => Promise<AuthUserSnapshot | null>;
  updateAvatar: (file: File) => Promise<AuthUserSnapshot | null>;
  deleteAvatar: () => Promise<AuthUserSnapshot | null>;
  syncPresence: (options?: {
    path?: string;
    source?: string;
    forceVisit?: boolean;
  }) => Promise<AuthUserSnapshot | null>;
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
  onAuthStateChanged: (callback: (user: AuthUserSnapshot | null) => void) => () => void;
};

declare global {
  interface Window {
    firebaseConfig?: FirebaseClientConfig;
    loginWithGoogle?: () => Promise<AuthUserSnapshot | null>;
    sakuraCurrentUserSnapshot?: AuthUserSnapshot | null;
    sakuraAuthStateSettled?: boolean;
    sakuraBootFirebaseAuth?: () => Promise<unknown> | unknown;
    sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
    sakuraFirebaseAuth?: FirebaseAuthBridge;
    sakuraFirebaseAuthError?: string;
    sakuraFirebaseRuntimeVersion?: string;
  }
}

const FIREBASE_AUTH_RUNTIME_VERSION = "2026-04-03-runtime-v2";
const STALE_RUNTIME_RECOVERY_STORAGE_KEY = "sakura-stale-runtime-recovery-at";
const STALE_RUNTIME_RECOVERY_COOLDOWN_MS = 20_000;
const RUNTIME_RECOVER_QUERY_PARAM = "__runtime_recover";
const STALE_RUNTIME_ERROR_PATTERNS = [
  /cacheResolvedProfileSnapshot is not defined/i,
  /AUTH_RUNTIME_INSTALLED_EVENT is not defined/i,
  /writeRuntimeCacheEntry is not defined/i,
];

const requestFirebaseAuthBoot = () => {
  if (typeof window === "undefined") {
    return;
  }

  void window.sakuraBootFirebaseAuth?.();
};

const hasCurrentFirebaseAuthRuntime = () =>
  typeof window !== "undefined" &&
  Boolean(window.sakuraFirebaseAuth) &&
  window.sakuraFirebaseRuntimeVersion === FIREBASE_AUTH_RUNTIME_VERSION &&
  window.sakuraFirebaseAuth?.__runtimeVersion === FIREBASE_AUTH_RUNTIME_VERSION;
const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "";
const isRecoverableStaleRuntimeError = (error: unknown) =>
  STALE_RUNTIME_ERROR_PATTERNS.some((pattern) => pattern.test(getErrorMessage(error)));
const clearRuntimeRecoverQueryParam = () => {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);

  if (!nextUrl.searchParams.has(RUNTIME_RECOVER_QUERY_PARAM)) {
    return;
  }

  nextUrl.searchParams.delete(RUNTIME_RECOVER_QUERY_PARAM);
  window.history.replaceState(
    window.history.state,
    "",
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  );
};
const recoverFromStaleRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
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
  } catch {}

  delete window.sakuraFirebaseAuth;
  delete window.sakuraFirebaseAuthError;
  delete window.sakuraFirebaseRuntimeVersion;
  delete window.sakuraBootFirebaseAuth;
  delete window.sakuraStartFirebaseAuth;
  window.sakuraAuthStateSettled = false;

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(RUNTIME_RECOVER_QUERY_PARAM, String(Date.now()));
  window.location.replace(nextUrl.toString());
  return true;
};

const getAuthBridgeErrorMessage = (event: Event | undefined, fallback: string) => {
  if (typeof window !== "undefined" && window.sakuraFirebaseAuthError) {
    return window.sakuraFirebaseAuthError;
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

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const USER_UPDATE_EVENT = "sakura-user-update";
const OPEN_AUTH_MODAL_EVENT = "sakura-open-auth-modal";
const EMAIL_VERIFICATION_LOCK_EVENT = "sakura-email-verification-lock";
const PRESENCE_DIRTY_EVENT = "sakura-presence-dirty";
const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
const LOGIN_PATTERN = /^[A-Za-z0-9._-]+$/;

const ROLE_CHIP_ORDER = new Map([
  ["banned", 0],
  ["root", 0],
  ["co-owner", 1],
  ["super administrator", 2],
  ["administrator", 3],
  ["moderator", 4],
  ["support", 5],
  ["sponsor", 6],
  ["tester", 7],
  ["user", 8],
]);
const REMOVED_ROLE_NAMES = new Set([
  "subscriber",
]);

function isUserLikeRole(role: string) {
  return /^u(?:[\s_-]*s)?[\s_-]*e[\s_-]*r$/i.test(role.trim());
}

function toCompactRoleToken(role: string) {
  return role
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
}

function normalizeRoleName(role: string) {
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

  if (compactRole === "root" || compactRole === "r00t" || compactRole === "owner") {
    return "root";
  }

  if (compactRole === "moderator") {
    return "moderator";
  }

  if (compactRole === "support" || compactRole === "supp0rt") {
    return "support";
  }

  if (
    compactRole === "banned" ||
    compactRole === "ban"
  ) {
    return "banned";
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

  if (compactRole === "user") {
    return "user";
  }

  return normalizedRole;
}

function roleChipStyle(role: string | null | undefined): CSSProperties {
  const normalizedRole = role ? normalizeRoleName(role) : "user";

  if (normalizedRole === "banned") {
    return {
      borderColor: "#ff3b30",
      backgroundColor: "#220909",
      color: "#ffd5d2",
      boxShadow: "0 0 18px rgba(255,59,48,0.24)",
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
      boxShadow: "0 0 18px rgba(255,59,48,0.24)",
    };
  }

  if (normalizedRole === "administrator") {
    return {
      borderColor: "#3b82f6",
      backgroundColor: "#081222",
      color: "#d6e7ff",
      boxShadow: "0 0 18px rgba(59,130,246,0.24)",
    };
  }

  if (normalizedRole === "support") {
    return {
      borderColor: "#22d3ee",
      backgroundColor: "#07181d",
      color: "#cffafe",
      boxShadow: "0 0 18px rgba(34,211,238,0.22)",
    };
  }

  if (normalizedRole === "moderator") {
    return {
      borderColor: "#4f7cff",
      backgroundColor: "#0a1328",
      color: "#d8e3ff",
      boxShadow: "0 0 18px rgba(79,124,255,0.22)",
    };
  }

  if (normalizedRole === "sponsor") {
    return {
      borderColor: "#8b5cf6",
      backgroundColor: "#161022",
      color: "#e3d8ff",
      boxShadow: "0 0 18px rgba(139,92,246,0.22)",
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

  return {
    borderColor: "#22c55e",
    backgroundColor: "#08170d",
    color: "#c6f6d5",
    boxShadow: "0 0 18px rgba(34,197,94,0.2)",
  };
}

function highestPriorityRole(roles: string[]) {
  const normalizedRoles = roles
    .map((role) => normalizeRoleName(role))
    .filter(Boolean)
    .filter((role) => !REMOVED_ROLE_NAMES.has(role));

  if (!normalizedRoles.length) {
    return "user";
  }

  return [...normalizedRoles].sort((left, right) => {
    const leftOrder = ROLE_CHIP_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = ROLE_CHIP_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.localeCompare(right, "en");
  })[0];
}

function getFirebaseErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const currentHostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "your domain";

  if (code === "auth/invalid-login") {
    return "Login must be 3-24 characters with no spaces.";
  }

  if (code === "auth/login-already-in-use") {
    return "This login is already taken.";
  }

  if (code === "auth/login-not-found") {
    return "Account with this login was not found.";
  }

  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential"
  ) {
    return "Invalid email, login, or password.";
  }

  if (code === "auth/invalid-login") {
    return "Login must be at least 3 characters long and contain no spaces.";
  }

  if (code === "auth/login-already-in-use") {
    return "This login is already taken.";
  }

  if (code === "auth/login-not-found") {
    return "No account was found with this login.";
  }

  if (code === "permission-denied") {
    return "Firestore blocked access. Check rules for users and meta/counters in Firebase Console.";
  }

  if (code === "auth/email-not-verified") {
    return "Verify your email before opening the profile and using the account.";
  }

  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-email":
      return "Enter a valid email.";
    case "auth/weak-password":
    case "auth/invalid-login":
    case "auth/login-already-in-use":
    case "auth/login-not-found":
      return "Password must contain at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email, login, or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Could not connect to Firebase. Check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Auth settings.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in popup was closed.";
    case "auth/popup-blocked":
      return "The browser blocked the popup. Allow popups and try again.";
    case "auth/cancelled-popup-request":
      return "The Google sign-in request was canceled.";
    case "auth/unauthorized-domain":
      return `Domain ${currentHostname} is not listed in Authorized domains in Firebase Auth. Add only the hostname, without https and without /sakura.github.io.`;
    case "auth/account-exists-with-different-credential":
      return "A different sign-in method is already linked to this email.";
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }

      return "Could not complete the Firebase Auth request. Please try again.";
  }
}

function isEmailVerificationLocked(user: AuthUserSnapshot | null | undefined) {
  return Boolean(
    user &&
      !user.isAnonymous &&
      user.email &&
      user.emailVerified === false &&
      user.verificationRequired !== false
  );
}

function requiresGoogleAccountCompletion(user: AuthUserSnapshot | null | undefined) {
  return Boolean(
    user &&
      !user.isAnonymous &&
      user.providerIds.includes("google.com") &&
      (!user.login?.trim() || !user.providerIds.includes("password"))
  );
}

function buildUserLabel(user: AuthUserSnapshot) {
  const shouldPreferLogin =
    Boolean(user.login?.trim()) &&
    (user.providerIds.includes("password") || !user.displayName?.trim());

  return (
    (shouldPreferLogin ? user.login?.trim() : user.displayName?.trim()) ||
    user.displayName?.trim() ||
    user.login?.trim() ||
    user.email?.trim() ||
    "Signed in"
  );
}

function buildUserInitials(user: AuthUserSnapshot) {
  const source = buildUserLabel(user);
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function profileHref(profileId: number | null | undefined) {
  if (typeof profileId === "number" && profileId > 0) {
    return `${repoBasePath}/profile/${profileId}`;
  }

  if (typeof window !== "undefined") {
    const storedProfileId = window.sessionStorage.getItem(CURRENT_PROFILE_ID_STORAGE_KEY);

    if (storedProfileId && /^\d+$/.test(storedProfileId)) {
      return `${repoBasePath}/profile/${storedProfileId}`;
    }
  }

  return `${repoBasePath}/profile`;
}

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId);

  if (!target) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    target.scrollIntoView({ behavior: "auto", block: "start" });
    return;
  }

  const startY = window.scrollY;
  const targetY = target.getBoundingClientRect().top + window.scrollY;
  const distance = targetY - startY;
  const duration = 1400;
  const root = document.documentElement;
  const body = document.body;
  const previousHtmlBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;
  let startTime: number | null = null;

  root.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  const easeInOutCubic = (progress: number) =>
    progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const step = (timestamp: number) => {
    if (startTime === null) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * easedProgress);

    if (progress < 1) {
      window.requestAnimationFrame(step);
      return;
    }

    root.style.scrollBehavior = previousHtmlBehavior;
    body.style.scrollBehavior = previousBodyBehavior;
  };

  window.requestAnimationFrame(step);
}

function SakuraBackground() {
  /* const handleGoogleLogin = async () => {
    if (!window.sakuraFirebaseAuth) {
      setSubmitError(
        authLoadError ?? "Firebase Auth is not ready yet. Wait a few seconds and try again."
      );
      return;
    }

    setIsGoogleSubmitting(true);
    setSubmitError(null);

    try {
      let snapshot: AuthUserSnapshot | null;
      const snapshot = await window.sakuraFirebaseAuth.loginWithGoogle();
      if (!snapshot?.login) {
        setFlashMessage("Signed in with Google. Create a login on your profile.");
      }
      setFlashMessage("Signed in with Google.");
      if (mode === "register" && snapshot?.verificationEmailSent) {
        setFlashMessage("Account created. Verification email sent.");
      }

      if (mode === "register" && snapshot?.verificationEmailSent) {
        setFlashMessage("Account created. Verification email sent.");
      }

      closeModal();
      navigateToProfile(snapshot);
    } catch (error) {
      setSubmitError(getFirebaseErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  */
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {sakuraLeaves.map((leaf) => (
        <m.div
          key={leaf.id}
          initial={{
            top: -20,
            left: leaf.startLeft,
            opacity: 0,
            rotate: 0,
          }}
          animate={{
            top: "110vh",
            opacity: [0, 0.4, 0.4, 0],
            rotate: 360,
            left: leaf.endLeft,
          }}
          transition={{
            duration: leaf.duration,
            repeat: Infinity,
            ease: "linear",
            delay: leaf.delay,
          }}
          className="absolute text-xs text-[#ffb7c5]"
        >
          🌸
        </m.div>
      ))}
    </div>
  );
}

function HeaderAuth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUserSnapshot | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [profileName, setProfileName] = useState("");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [isVerificationSending, setIsVerificationSending] = useState(false);
  const [isVerificationRefreshing, setIsVerificationRefreshing] = useState(false);
  const visibleUser = currentUser && !currentUser.isAnonymous ? currentUser : null;
  const isVerificationLockedUser = isEmailVerificationLocked(visibleUser);
  const isGoogleSetupFlowActive = requiresGoogleAccountCompletion(visibleUser);
  const currentUserId = visibleUser?.uid ?? null;
  const prefetchedProfileIdsRef = useRef<Set<number>>(new Set());
  const prefetchingProfileIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    clearRuntimeRecoverQueryParam();

    let unsubscribe: () => void = () => {};

    setCurrentUser(
      window.sakuraCurrentUserSnapshot ?? readCachedAuthSnapshot<AuthUserSnapshot>() ?? null
    );

    const syncAuthBridge = () => {
      if (hasCurrentFirebaseAuthRuntime() && window.sakuraFirebaseAuth) {
        setAuthReady(true);
        setAuthLoadError(null);
        setCurrentUser(window.sakuraCurrentUserSnapshot ?? null);
        unsubscribe();
        unsubscribe = window.sakuraFirebaseAuth.onAuthStateChanged((user) => {
          setCurrentUser(user);
        });
        return;
      }

      if (
        (!window.sakuraFirebaseRuntimeVersion ||
          window.sakuraFirebaseRuntimeVersion === FIREBASE_AUTH_RUNTIME_VERSION) &&
        window.sakuraFirebaseAuthError
      ) {
        setAuthLoadError(window.sakuraFirebaseAuthError);
      }
    };

    const handleReady = () => {
      syncAuthBridge();
    };

    const handleUserUpdate = () => {
      setCurrentUser(window.sakuraCurrentUserSnapshot ?? null);
    };

    const handleOpenAuthModal = (event: Event) => {
      const nextMode =
        event instanceof CustomEvent && event.detail?.mode === "login"
          ? "login"
          : "register";

      requestFirebaseAuthBoot();
      setMode(nextMode);
      setIsModalOpen(true);
      setSubmitError(null);
    };
    const handleVerificationLock = () => {
      setFlashMessage("Verify your email to open the profile and use the account.");
      setIsVerificationModalOpen(true);
    };

    const handleError = (event: Event) => {
      const message = getAuthBridgeErrorMessage(
        event,
        "Firebase Auth module did not load. Check your connection and Firebase settings."
      );

      if (isRecoverableStaleRuntimeError(message) && recoverFromStaleRuntime()) {
        return;
      }

      setAuthLoadError(message);
    };

    const timeoutId = window.setTimeout(() => {
      if (!hasCurrentFirebaseAuthRuntime() && !window.sakuraFirebaseAuthError) {
        setAuthLoadError(
          "Firebase Auth module did not load. Check your connection and Firebase settings."
        );
      }
    }, 4000);

    syncAuthBridge();
    window.addEventListener(AUTH_READY_EVENT, handleReady);
    window.addEventListener(AUTH_ERROR_EVENT, handleError);
    window.addEventListener(USER_UPDATE_EVENT, handleUserUpdate);
    window.addEventListener(OPEN_AUTH_MODAL_EVENT, handleOpenAuthModal);
    window.addEventListener(EMAIL_VERIFICATION_LOCK_EVENT, handleVerificationLock);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_READY_EVENT, handleReady);
      window.removeEventListener(AUTH_ERROR_EVENT, handleError);
      window.removeEventListener(USER_UPDATE_EVENT, handleUserUpdate);
      window.removeEventListener(OPEN_AUTH_MODAL_EVENT, handleOpenAuthModal);
      window.removeEventListener(EMAIL_VERIFICATION_LOCK_EVENT, handleVerificationLock);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId || !window.sakuraFirebaseAuth) {
      return;
    }

    window.sakuraFirebaseAuth
      .syncPresence({
        path: window.location.pathname,
        source: "home-view",
        forceVisit: true,
      })
      .catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !authReady ||
      !visibleUser ||
      typeof visibleUser.profileId !== "number" ||
      visibleUser.profileId <= 0 ||
      !window.sakuraFirebaseAuth
    ) {
      return;
    }

    const bridge = window.sakuraFirebaseAuth as (FirebaseAuthBridge & {
      getProfileComments?: (
        profileId: number
      ) => Promise<Array<{ id: string; pending?: boolean }>>;
    }) | null;
    const getProfileComments = bridge?.getProfileComments;
    if (!bridge || typeof getProfileComments !== "function") {
      return;
    }
    const candidateProfileIds = [
      visibleUser.profileId - 1,
      visibleUser.profileId,
      visibleUser.profileId + 1,
    ].filter((profileId) => profileId > 0);
    const toCacheableComments = (
      comments: Array<{ id: string; pending?: boolean }>
    ) =>
      comments.filter(
        (comment) =>
          comment &&
          typeof comment.id === "string" &&
          comment.id &&
          comment.pending !== true
      );

    candidateProfileIds.forEach((profileId) => {
      if (
        prefetchedProfileIdsRef.current.has(profileId) ||
        prefetchingProfileIdsRef.current.has(profileId)
      ) {
        return;
      }

      prefetchingProfileIdsRef.current.add(profileId);

      void (async () => {
        let hasPrefetchedPayload = false;

        try {
          const prefetchedProfile = await bridge.getProfileById(profileId);

          if (prefetchedProfile && typeof prefetchedProfile.profileId === "number") {
            writeCachedProfileSnapshot(prefetchedProfile);
            hasPrefetchedPayload = true;
          }
        } catch {}

        try {
          const prefetchedComments = await getProfileComments(profileId);

          if (Array.isArray(prefetchedComments) && prefetchedComments.length > 0) {
            writeCachedProfileComments(profileId, toCacheableComments(prefetchedComments));
            hasPrefetchedPayload = true;
          }
        } catch {}

        prefetchingProfileIdsRef.current.delete(profileId);

        if (hasPrefetchedPayload) {
          prefetchedProfileIdsRef.current.add(profileId);
        }
      })();
    });
  }, [authReady, visibleUser?.uid, visibleUser?.profileId]);

  useEffect(() => {
    if (!isModalOpen && !isVerificationModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isModalOpen && !isGoogleSetupFlowActive) {
          setIsModalOpen(false);
          setSubmitError(null);
        }

        if (isVerificationModalOpen) {
          setIsVerificationModalOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isVerificationModalOpen, isGoogleSetupFlowActive]);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlashMessage(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [flashMessage]);

  useEffect(() => {
    setVerificationError(null);
    setVerificationSuccess(null);
  }, [visibleUser?.uid, visibleUser?.emailVerified, visibleUser?.verificationRequired]);

  useEffect(() => {
    if (!isVerificationLockedUser) {
      setIsVerificationModalOpen(false);
    }
  }, [isVerificationLockedUser]);

  useEffect(() => {
    if (!visibleUser || !requiresGoogleAccountCompletion(visibleUser)) {
      return;
    }

    requestFirebaseAuthBoot();
    setMode("register");
    setIsModalOpen(true);
    setSubmitError(null);
    setProfileName(visibleUser.displayName?.trim() ?? "");
    setLoginName(visibleUser.login?.trim() ?? "");
    setIdentifier(visibleUser.email?.trim() ?? "");
    setPassword("");
    setConfirmPassword("");
  }, [
    visibleUser?.uid,
    visibleUser?.email,
    visibleUser?.login,
    visibleUser?.displayName,
    visibleUser?.providerIds,
  ]);

  const openModal = (nextMode: AuthMode) => {
    requestFirebaseAuthBoot();
    setMode(nextMode);
    setIsModalOpen(true);
    setSubmitError(null);
  };

  const closeModal = () => {
    if (isGoogleSetupFlowActive) {
      return;
    }

    setIsModalOpen(false);
    setSubmitError(null);
    setProfileName("");
    setLoginName("");
    setPassword("");
    setConfirmPassword("");
  };

  const openVerificationModal = () => {
    setVerificationError(null);
    setVerificationSuccess(null);
    setIsVerificationModalOpen(true);
  };

  const closeVerificationModal = () => {
    setIsVerificationModalOpen(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    if (isGoogleSetupFlowActive) {
      return;
    }

    setMode(nextMode);
    setSubmitError(null);
    setProfileName("");
    setLoginName("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleResendVerification = async () => {
    requestFirebaseAuthBoot();

    if (!window.sakuraFirebaseAuth) {
      setVerificationError(
        authLoadError ?? "Firebase Auth is not ready yet. Wait a few seconds and try again."
      );
      return;
    }

    setVerificationError(null);
    setVerificationSuccess(null);
    setIsVerificationSending(true);

    try {
      const snapshot = await window.sakuraFirebaseAuth.resendVerificationEmail();
      setCurrentUser(snapshot);
      setVerificationSuccess(
        snapshot?.verificationEmailSent
          ? "Verification email sent again."
          : "Email is already verified."
      );
    } catch (error) {
      setVerificationError(getFirebaseErrorMessage(error));
    } finally {
      setIsVerificationSending(false);
    }
  };

  const handleRefreshVerification = async () => {
    requestFirebaseAuthBoot();

    if (!window.sakuraFirebaseAuth) {
      setVerificationError(
        authLoadError ?? "Firebase Auth is not ready yet. Wait a few seconds and try again."
      );
      return;
    }

    setVerificationError(null);
    setVerificationSuccess(null);
    setIsVerificationRefreshing(true);

    try {
      const snapshot = await window.sakuraFirebaseAuth.refreshVerificationStatus();
      setCurrentUser(snapshot);

      if (isEmailVerificationLocked(snapshot)) {
        setVerificationSuccess("Verification not found yet. Check your email and try again.");
        return;
      }

      setFlashMessage("Email verified. Profile access is now unlocked.");
      setVerificationSuccess("Email verified. You can now open your profile.");
    } catch (error) {
      setVerificationError(getFirebaseErrorMessage(error));
    } finally {
      setIsVerificationRefreshing(false);
    }
  };

  const navigateToProfile = async (user: AuthUserSnapshot | null) => {
    let nextUser = user ?? window.sakuraCurrentUserSnapshot ?? null;

    if (isEmailVerificationLocked(nextUser) && window.sakuraFirebaseAuth) {
      try {
        const refreshedSnapshot = await window.sakuraFirebaseAuth.refreshVerificationStatus();
        setCurrentUser(refreshedSnapshot);
        nextUser = refreshedSnapshot;
      } catch (error) {}
    }

    if (isEmailVerificationLocked(nextUser)) {
      window.dispatchEvent(new CustomEvent(EMAIL_VERIFICATION_LOCK_EVENT));
      return;
    }

    if (requiresGoogleAccountCompletion(nextUser)) {
      requestFirebaseAuthBoot();
      setMode("register");
      setIsModalOpen(true);
      setSubmitError(
        "Finish your Google registration by creating a login and password."
      );
      setProfileName(nextUser?.displayName?.trim() ?? "");
      setLoginName(nextUser?.login?.trim() ?? "");
      setIdentifier(nextUser?.email?.trim() ?? "");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    window.location.assign(profileHref(nextUser?.profileId ?? window.sakuraCurrentUserSnapshot?.profileId));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestFirebaseAuthBoot();

    if (!window.sakuraFirebaseAuth) {
      setSubmitError(
        authLoadError ?? "Firebase Auth is not ready yet. Wait a few seconds and try again."
      );
      return;
    }

    if (!identifier.trim()) {
      setSubmitError(mode === "register" ? "Enter your email." : "Enter your email or login.");
      return;
    }

    if (!password) {
      setSubmitError("Enter your password.");
      return;
    }

    if (mode === "register") {
      const normalizedLogin = loginName.trim().replace(/\s+/g, "");

      if (!normalizedLogin) {
        setSubmitError("Enter a login.");
        return;
      }

      if (
        normalizedLogin.length < 3 ||
        normalizedLogin.length > 24 ||
        !LOGIN_PATTERN.test(normalizedLogin)
      ) {
        setSubmitError(getFirebaseErrorMessage({ code: "auth/invalid-login" }));
        return;
      }
    }

    if (mode === "register" && password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let snapshot: AuthUserSnapshot | null;
      if (isGoogleSetupFlowActive) {
        snapshot = await window.sakuraFirebaseAuth.completeGoogleAccount({
          login: loginName.trim().replace(/\s+/g, ""),
          displayName: profileName.trim(),
          password,
        });
        setFlashMessage("Google account completed. Login and password are now linked.");
      } else if (mode === "register") {
        snapshot = await window.sakuraFirebaseAuth.register({
          login: loginName.trim().replace(/\s+/g, ""),
          displayName: profileName.trim(),
          email: identifier.trim(),
          password,
        });
        setFlashMessage(
          isEmailVerificationLocked(snapshot)
            ? "Account created. Verify your email to open the profile and use the account."
            : "Account created. Signed in automatically."
        );
      } else {
        snapshot = await window.sakuraFirebaseAuth.login(identifier.trim(), password);
        setFlashMessage(
          isEmailVerificationLocked(snapshot)
            ? "Email is not verified. Verify your email to open the profile."
            : "Signed in."
        );
      }

      if (!snapshot?.login) {
        setFlashMessage("Signed in. Create a login on your profile.");
      }

      closeModal();
      if (isEmailVerificationLocked(snapshot)) {
        setIsVerificationModalOpen(true);
      }
      await navigateToProfile(snapshot);
    } catch (error) {
      setSubmitError(getFirebaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!window.sakuraFirebaseAuth) {
      setFlashMessage(
        authLoadError ?? "Firebase Auth is not ready yet. Wait a few seconds and try again."
      );
      return;
    }

    setIsLoggingOut(true);

    try {
      await window.sakuraFirebaseAuth.logout();
      setFlashMessage("Signed out.");
    } catch (error) {
      setFlashMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGoogleLogin = async () => {
    requestFirebaseAuthBoot();

    if (!window.sakuraFirebaseAuth) {
      setSubmitError(
        authLoadError ?? "Firebase Auth is not ready yet. Wait a few seconds and try again."
      );
      return;
    }

    setIsGoogleSubmitting(true);
    setSubmitError(null);

    try {
      const snapshot = await window.sakuraFirebaseAuth.loginWithGoogle();
      if (!snapshot) {
        closeModal();
        setFlashMessage("Opening Google sign-in...");
        return;
      }

      if (requiresGoogleAccountCompletion(snapshot)) {
        setCurrentUser(snapshot);
        setMode("register");
        setIsModalOpen(true);
        setProfileName(snapshot.displayName?.trim() ?? "");
        setLoginName(snapshot.login?.trim() ?? "");
        setIdentifier(snapshot.email?.trim() ?? "");
        setPassword("");
        setConfirmPassword("");
        setFlashMessage("Complete your Google account by creating a login and password.");
        return;
      }

      setFlashMessage(
        isEmailVerificationLocked(snapshot)
          ? "Email is not verified. Verify your email to open the profile."
          : "Signed in with Google."
      );
      closeModal();
      if (isEmailVerificationLocked(snapshot)) {
        setIsVerificationModalOpen(true);
      }
      await navigateToProfile(snapshot);
    } catch (error) {
      setSubmitError(getFirebaseErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const resolvedProfileId = visibleUser?.profileId ?? null;
  const resolvedProfileHref = profileHref(resolvedProfileId);
  const userLabel = visibleUser ? buildUserLabel(visibleUser) : "Signed in";
  const userInitials = visibleUser ? buildUserInitials(visibleUser) : "SA";
  const userAccentRole = visibleUser
    ? visibleUser.isBanned
      ? "banned"
      : highestPriorityRole(visibleUser.roles ?? [])
    : "user";
  const userAccentStyle = roleChipStyle(userAccentRole);
  const userAvatarStyle: CSSProperties = {
    borderColor: typeof userAccentStyle.borderColor === "string" ? userAccentStyle.borderColor : "#244233",
  };
  const userFallbackAvatarStyle: CSSProperties = {
    borderColor: typeof userAccentStyle.borderColor === "string" ? userAccentStyle.borderColor : "#244233",
    backgroundColor:
      typeof userAccentStyle.backgroundColor === "string" ? userAccentStyle.backgroundColor : "#14241c",
    color: typeof userAccentStyle.color === "string" ? userAccentStyle.color : "#b4eccd",
  };
  const userLabelStyle: CSSProperties = {
    color: typeof userAccentStyle.color === "string" ? userAccentStyle.color : "#d6f2e2",
  };

  return (
    <>
      {visibleUser ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isVerificationLockedUser ? (
            <button
              type="button"
              onClick={openVerificationModal}
              className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/45 hover:text-white"
            >
              Verify
            </button>
          ) : null}
          <a
            href={resolvedProfileHref}
            onClick={(event) => {
              event.preventDefault();
              void navigateToProfile(visibleUser);
            }}
            style={userAccentStyle}
            className="group inline-flex max-w-full items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 transition hover:opacity-90"
          >
            {visibleUser.photoURL ? (
              <AvatarMedia
                src={visibleUser.photoURL}
                alt={userLabel}
                decoding="async"
                style={userAvatarStyle}
                className="h-9 w-9 rounded-full border object-cover"
              />
            ) : (
              <span
                style={userFallbackAvatarStyle}
                className="flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black uppercase"
              >
                {userInitials}
              </span>
            )}
            <span className="flex min-w-0 items-center">
              <span
                style={userLabelStyle}
                className="max-w-[220px] truncate text-[12px] font-medium"
              >
                {userLabel}
              </span>
            </span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#130d0f] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/50 hover:bg-[#1a1012] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => openModal("login")}
            className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => openModal("register")}
            className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_0_25px_rgba(255,183,197,0.14)] transition hover:bg-[#ffc8d3]"
          >
            Registration
          </button>
        </>
      )}

      {flashMessage ? (
        <p className="basis-full text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffb7c5]">
          {flashMessage}
        </p>
      ) : null}

      {authLoadError && !isModalOpen ? (
        <p className="basis-full text-right text-[11px] text-red-200/80">{authLoadError}</p>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close auth modal"
            onClick={isGoogleSetupFlowActive ? undefined : closeModal}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <m.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[30px] border border-[#2b1b1e] bg-[#0d0d0d] shadow-[0_0_80px_rgba(255,183,197,0.08)]"
          >
            <div className="border-b border-[#1b1b1b] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.12),transparent_58%)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                    Sakura Access
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                    {isGoogleSetupFlowActive
                      ? "Complete Google Account"
                      : mode === "register"
                        ? "Registration"
                        : "Sign In"}
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {isGoogleSetupFlowActive
                      ? "Choose a login and password to finish Google registration. Until then, the profile stays locked."
                      : mode === "register"
                        ? "Create a username for your profile and a separate login for sign-in."
                        : "You can sign in with your email or login through Firebase Auth."}
                  </p>
                  <p className="mt-2 hidden text-sm text-gray-400">
                    {mode === "register"
                      ? "Create a login so it appears in the profile and can be used for sign-in."
                      : "Sign in with your email or login through Firebase Auth."}
                  </p>
                </div>

                {!isGoogleSetupFlowActive ? (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#272727] bg-[#101010] text-lg text-gray-400 transition hover:border-[#ffb7c5]/40 hover:text-white"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-6">
              {!isGoogleSetupFlowActive ? (
                <div className="grid grid-cols-2 gap-2 rounded-full border border-[#1e1e1e] bg-[#080808] p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                      mode === "login" ? "bg-[#ffb7c5] text-black" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                      mode === "register"
                        ? "bg-[#ffb7c5] text-black"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Registration
                  </button>
                </div>
              ) : null}

              {!authReady && !authLoadError ? (
                <div className="mt-5 rounded-2xl border border-[#2b1b1e] bg-[#120d0f] px-4 py-3 text-sm text-[#f2c0cb]">
                  Connecting Firebase Auth...
                </div>
              ) : null}

              {authLoadError ? (
                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
                  {authLoadError}
                </div>
              ) : null}

              {!isGoogleSetupFlowActive ? (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={!authReady || isGoogleSubmitting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-[#ffb7c5] bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#252525] hover:shadow-[0_0_15px_#ffb7c5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      width="18"
                      height="18"
                      alt="Google"
                    />
                    <span>{isGoogleSubmitting ? "Connecting Google..." : "Sign in with Google"}</span>
                  </button>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#1f1f1f]"></div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-600">
                      or
                    </span>
                    <div className="h-px flex-1 bg-[#1f1f1f]"></div>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-[#2b1b1e] bg-[#120d0f] px-4 py-3 text-sm text-[#f2c0cb]">
                  {visibleUser?.email ? `Google email: ${visibleUser.email}` : "Google account connected."}
                </div>
              )}

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                {mode === "register" || isGoogleSetupFlowActive ? (
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                      Username
                    </span>
                    <input
                      type="text"
                      value={profileName}
                      maxLength={48}
                      autoComplete="nickname"
                      onChange={(event) => setProfileName(event.target.value)}
                      className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                      placeholder="Absolute"
                    />
                    <span className="mt-2 block text-xs leading-relaxed text-gray-500">
                      Username is shown above your login on the profile.
                    </span>
                  </label>
                ) : null}

                {mode === "register" || isGoogleSetupFlowActive ? (
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                      Login
                    </span>
                    <input
                      type="text"
                      value={loginName}
                      minLength={3}
                      maxLength={24}
                      autoComplete="username"
                      onChange={(event) => setLoginName(event.target.value)}
                      className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                      placeholder="your_login"
                    />
                    <span className="mt-2 block text-xs leading-relaxed text-gray-500">
                      Login without spaces. Letters, numbers, `.`, `_`, and `-` are supported.
                    </span>
                    <span className="mt-2 hidden text-xs leading-relaxed text-gray-500">
                      Login without spaces. Letters, numbers, `.`, `_`, and `-` are supported.
                    </span>
                  </label>
                ) : null}

                {isGoogleSetupFlowActive ? (
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                      Google Email
                    </span>
                    <input
                      type="email"
                      value={identifier}
                      readOnly
                      className="w-full cursor-not-allowed rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-gray-400 outline-none"
                    />
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                      {mode === "register" ? "Email" : "Email or Login"}
                    </span>
                    <input
                      type={mode === "register" ? "email" : "text"}
                      value={identifier}
                      autoComplete={mode === "register" ? "email" : "username"}
                      onChange={(event) => setIdentifier(event.target.value)}
                      className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                      placeholder={
                        mode === "register" ? "you@example.com" : "you@example.com or your_login"
                      }
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                    placeholder="Minimum 6 characters"
                  />
                </label>

                {mode === "register" || isGoogleSetupFlowActive ? (
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                      Confirm Password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                      placeholder="Repeat your password"
                    />
                  </label>
                ) : null}

                {submitError ? (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || !authReady}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#ffb7c5] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_0_30px_rgba(255,183,197,0.12)] transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:bg-[#ffb7c5]/40 disabled:text-black/60"
                >
                  {isSubmitting
                    ? isGoogleSetupFlowActive
                      ? "Finishing Google account..."
                      : mode === "register"
                      ? "Creating account..."
                      : "Signing in..."
                    : isGoogleSetupFlowActive
                      ? "Finish Google Account"
                      : mode === "register"
                      ? "Create Account"
                      : "Sign In"}
                </button>
              </form>
            </div>
          </m.div>
        </div>
      ) : null}

      {isVerificationModalOpen && isVerificationLockedUser ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close verification modal"
            onClick={closeVerificationModal}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <m.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-[30px] border border-[#4d3024] bg-[linear-gradient(180deg,#1a110d_0%,#120d0a_100%)] shadow-[0_0_80px_rgba(255,183,197,0.08)]"
          >
            <div className="border-b border-[#3a221d] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.12),transparent_58%)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                    Email Not Verified
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                    Verify Your Access
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#f3d2c5]">
                    Verify your email to unlock your profile and use the site.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeVerificationModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] text-lg text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isVerificationSending || isVerificationRefreshing}
                  className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerificationSending ? "Sending..." : "Resend Email"}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshVerification}
                  disabled={isVerificationRefreshing || isVerificationSending}
                  className="inline-flex items-center justify-center rounded-full border border-[#3a2a31] bg-[#140d11] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerificationRefreshing ? "Checking..." : "I Verified My Email"}
                </button>
              </div>

              {verificationError ? (
                <p className="mt-4 text-xs leading-relaxed text-[#ff9aa9]">{verificationError}</p>
              ) : null}
              {verificationSuccess ? (
                <p className="mt-4 text-xs leading-relaxed text-[#8ce5b2]">{verificationSuccess}</p>
              ) : null}
            </div>
          </m.div>
        </div>
      ) : null}
    </>
  );
}

export default function Home() {
  const [siteOnlineCount, setSiteOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSiteOnlineCount(readCachedSiteOnlineCount());

    let isCancelled = false;
    let intervalId = 0;
    let isRefreshing = false;

    const refreshSiteOnlineCount = async () => {
      if (isRefreshing) {
        return;
      }

      const bridge = window.sakuraFirebaseAuth;

      if (!bridge) {
        return;
      }

      try {
        isRefreshing = true;
        const nextCount = await bridge.getSiteOnlineCount();

        if (!isCancelled) {
          setSiteOnlineCount(nextCount);
          writeCachedSiteOnlineCount(nextCount);
        }
      } catch (error) {
      } finally {
        isRefreshing = false;
      }
    };

    const handleRefreshRequest = () => {
      void refreshSiteOnlineCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        void refreshSiteOnlineCount();
      }
    };

    const startPolling = () => {
      void refreshSiteOnlineCount();

      if (!intervalId) {
        intervalId = window.setInterval(() => {
          void refreshSiteOnlineCount();
        }, 10000);
      }
    };

    requestFirebaseAuthBoot();

    if (window.sakuraFirebaseAuth) {
      startPolling();
    }

    const handleReady = () => {
      startPolling();
    };

    window.addEventListener(AUTH_READY_EVENT, handleReady);
    window.addEventListener(USER_UPDATE_EVENT, handleRefreshRequest);
    window.addEventListener(PRESENCE_DIRTY_EVENT, handleRefreshRequest);
    window.addEventListener("pageshow", handleRefreshRequest);
    window.addEventListener("online", handleRefreshRequest);
    window.addEventListener("offline", handleRefreshRequest);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener(AUTH_READY_EVENT, handleReady);
      window.removeEventListener(USER_UPDATE_EVENT, handleRefreshRequest);
      window.removeEventListener(PRESENCE_DIRTY_EVENT, handleRefreshRequest);
      window.removeEventListener("pageshow", handleRefreshRequest);
      window.removeEventListener("online", handleRefreshRequest);
      window.removeEventListener("offline", handleRefreshRequest);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleHeroTrialClick = async () => {
    if (typeof window === "undefined") {
      return;
    }

    let snapshot = window.sakuraCurrentUserSnapshot;

    if (snapshot && !snapshot.isAnonymous) {
      if (isEmailVerificationLocked(snapshot) && window.sakuraFirebaseAuth) {
        try {
          snapshot = await window.sakuraFirebaseAuth.refreshVerificationStatus();
        } catch (error) {}
      }

      if (isEmailVerificationLocked(snapshot)) {
        window.dispatchEvent(new CustomEvent(EMAIL_VERIFICATION_LOCK_EVENT));
        return;
      }

      window.location.assign(profileHref(snapshot?.profileId));
      return;
    }

    requestFirebaseAuthBoot();
    window.dispatchEvent(
      new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
        detail: { mode: "register" satisfies AuthMode },
      })
    );
  };

  return (
    <LazyMotion features={domAnimation}>
      <main className="relative isolate min-h-screen overflow-hidden bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-white selection:text-black">
        <SakuraBackground />

      <div className="relative z-10">
        <nav className="grid grid-cols-1 gap-5 border-b border-[#1a1a1a] px-8 py-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="flex flex-wrap items-center gap-3 md:justify-self-start">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
              {homeLogoSrc ? (
                <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#ffb7c5]/35 bg-[#130f12] shadow-[0_0_20px_rgba(255,183,197,0.18)]">
                  <img
                    src={homeLogoSrc}
                    alt="Sakura logo"
                    decoding="async"
                    loading="eager"
                    fetchPriority="high"
                    className="h-full w-full object-contain"
                  />
                </span>
              ) : (
                <span className="text-2xl text-[#ffb7c5] drop-shadow-[0_0_10px_rgba(255,183,197,0.5)]">
                  🌸
                </span>
              )}
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">
                Sa<span className="text-[#ffb7c5]">kura</span>
              </h1>
            </Link>
          </div>

          <div className="flex justify-start md:justify-center">
            <HeaderSocialLinks showLabel />
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 text-sm font-medium text-gray-400 md:justify-self-end md:justify-end">
            <SiteOnlineBadge count={siteOnlineCount} profileHrefBuilder={profileHref} />
            <HeaderAuth />
          </div>
        </nav>

        <section className="flex flex-col items-center justify-center px-4 pt-16 pb-1">
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-2 text-center text-7xl font-black tracking-tighter uppercase"
          >
            Feel The <br /> <span className="italic text-gray-500">Sakura Power</span>
          </m.h1>

        </section>

        <section className="px-10 pb-2">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
              Feature Showcase
            </p>
          </div>
        </section>

        <FeatureShowcase />

        <TrialCta
          onClick={() => {
            void handleHeroTrialClick();
          }}
        />

        <section id="features" className="grid grid-cols-1 gap-1 px-10 pt-10 pb-1 md:grid-cols-2">
          <FeatureBox
            delay={0.1}
            title="VMT Hooking"
            desc="Safe function interception through virtual method tables."
          />
          <FeatureBox
            delay={0.2}
            title="Signature Scanner"
            desc="Fast offset updates after Valve patches."
          />
        </section>
        <SetupSteps />
      </div>
      </main>
    </LazyMotion>
  );
}

function TrialCta({ onClick }: { onClick: () => void }) {
  return (
    <section className="px-10 pt-2 pb-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
        <p className="text-lg leading-relaxed text-gray-300">
          Private cheat for Dota 2.
        </p>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/60 bg-[#140f12] px-8 py-3 text-sm font-semibold text-[#ffd8e1] shadow-[0_0_24px_rgba(255,183,197,0.16)] transition-all hover:border-[#ffd1db] hover:bg-[#1c1217] hover:text-white active:scale-95"
        >
          7-day trial period
        </button>
      </div>
    </section>
  );
}

function FeatureBox({
  title,
  desc,
  delay,
}: {
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-[28px] border border-[#ffb7c5]/18 bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.12),transparent_55%),#0d0d0d] p-8 shadow-[0_0_30px_rgba(255,183,197,0.06)] transition-all duration-500 hover:border-[#ffb7c5]/45 hover:shadow-[0_0_38px_rgba(255,183,197,0.1)]"
    >
      <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.28em] text-[#ffb7c5]/70">{title}</h3>
      <p className="max-w-[40rem] text-sm leading-relaxed text-gray-300">{desc}</p>
    </m.div>
  );
}

function SetupSteps() {
  const steps = [
    {
      num: "01",
      title: "Download",
      desc: "Get the latest build and extract the archive to a convenient location.",
    },
    {
      num: "02",
      title: "Initialize",
      desc: "Launch Dota 2, then open the loader as administrator.",
    },
    {
      num: "03",
      title: "Configure",
      desc: "Press INSERT in-game to open the menu and load your Lua configs.",
    },
  ];

  return (
    <section className="border-t border-[#1a1a1a] px-10 pt-24 pb-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
          Installation Process
        </h2>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step, index) => (
            <m.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              <span className="absolute -top-8 -left-4 select-none text-6xl font-black text-white/5">
                {step.num}
              </span>
              <h3 className="relative z-10 mb-4 text-lg font-bold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.desc}</p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
