// app/page.tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type ShowcaseSlide = {
  id: string;
  index: string;
  title: string;
  desc: string;
  mediaOverlayTitle: string;
  mediaCaption: string;
  mediaLabel: string;
  mediaSrc: string;
};

const repoBasePath = "/sakura.github.io";
const assetVersion = "20260324-1";

function withRepoBasePath(path: string, bustCache = false) {
  return `${repoBasePath}${path}${bustCache ? `?v=${assetVersion}` : ""}`;
}

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

const showcaseSlides: ShowcaseSlide[] = [
  {
    id: "camera",
    index: "01",
    title: "Отдаление камеры",
    desc: "Кастомное отдаление камеры для лучшего обзора карты и более удобного контроля замесов до 3000 юнитов.",
    mediaOverlayTitle: "Отдаление камеры",
    mediaCaption: "Функция отдаления камеры",
    mediaLabel: "Скриншот функции отдаления камеры",
    mediaSrc: withRepoBasePath("/camera-preview.jpg", true),
  },
  {
    id: "hud-panel",
    index: "02",
    title: "HP / MP bar + панель скиллов и предметов",
    desc: "Полосы ресурсов врагов и тимейтов, а также панель скиллов и предметов в одном блоке, чтобы удобно отслеживать, что у него есть, и тем самым иметь преимущество.",
    mediaOverlayTitle: "Enemy esp",
    mediaCaption: "HUD с барами, скиллами и предметами",
    mediaLabel: "Скриншот HUD с барами, скиллами и предметами",
    mediaSrc: withRepoBasePath("/hud-preview.jpg", true),
  },
];

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
  providerIds: string[];
  creationTime: string | null;
  lastSignInTime: string | null;
  loginHistory: string[];
  visitHistory: VisitHistoryEntry[];
  presence: PresenceSnapshot | null;
};

type FirebaseAuthBridge = {
  login: (identifier: string, password: string) => Promise<AuthUserSnapshot | null>;
  loginWithGoogle: () => Promise<AuthUserSnapshot | null>;
  register: (credentials: {
    login: string;
    email: string;
    password: string;
  }) => Promise<AuthUserSnapshot | null>;
  resendVerificationEmail: () => Promise<AuthUserSnapshot | null>;
  getProfileById: (profileId: number) => Promise<AuthUserSnapshot | null>;
  updateAvatar: (file: File) => Promise<AuthUserSnapshot | null>;
  deleteAvatar: () => Promise<AuthUserSnapshot | null>;
  syncPresence: (options?: {
    path?: string;
    source?: string;
    forceVisit?: boolean;
  }) => Promise<AuthUserSnapshot | null>;
  logout: () => Promise<void>;
  onAuthStateChanged: (callback: (user: AuthUserSnapshot | null) => void) => () => void;
};

declare global {
  interface Window {
    firebaseConfig?: FirebaseClientConfig;
    loginWithGoogle?: () => Promise<AuthUserSnapshot | null>;
    sakuraCurrentUserSnapshot?: AuthUserSnapshot | null;
    sakuraAuthStateSettled?: boolean;
    sakuraFirebaseAuth?: FirebaseAuthBridge;
    sakuraFirebaseAuthError?: string;
  }
}

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const USER_UPDATE_EVENT = "sakura-user-update";
const LOGIN_PATTERN = /^[A-Za-zА-Яа-яЁё0-9._-]+$/;

const ROLE_CHIP_ORDER = new Map([
  ["root", 0],
  ["co-owner", 1],
  ["super administrator", 2],
  ["administrator", 3],
  ["sponsor", 4],
  ["moderator", 5],
  ["user", 6],
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

  return {
    borderColor: "#22c55e",
    backgroundColor: "#08170d",
    color: "#c6f6d5",
    boxShadow: "0 0 18px rgba(34,197,94,0.2)",
  };
}

function highestPriorityRole(roles: string[]) {
  const normalizedRoles = roles.map((role) => normalizeRoleName(role)).filter(Boolean);

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

  if (code === "auth/invalid-login") {
    return "Username must be 3-24 characters with no spaces.";
  }

  if (code === "auth/login-already-in-use") {
    return "This username is already taken.";
  }

  if (code === "auth/login-not-found") {
    return "Account with this username was not found.";
  }

  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential"
  ) {
    return "Invalid email, username, or password.";
  }

  if (code === "auth/invalid-login") {
    return "Логин должен содержать минимум 3 символа и быть без пробелов.";
  }

  if (code === "auth/login-already-in-use") {
    return "Этот логин уже занят.";
  }

  if (code === "auth/login-not-found") {
    return "Аккаунт с таким логином не найден.";
  }

  if (code === "permission-denied") {
    return "Firestore blocked access. Проверьте rules для users и meta/counters в Firebase Console.";
  }

  switch (code) {
    case "auth/email-already-in-use":
      return "Этот email уже зарегистрирован.";
    case "auth/invalid-email":
      return "Введите корректный email.";
    case "auth/weak-password":
    case "auth/invalid-login":
    case "auth/login-already-in-use":
    case "auth/login-not-found":
      return "Пароль должен содержать минимум 6 символов.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Неверный email, логин или пароль.";
    case "auth/too-many-requests":
      return "Слишком много попыток. Попробуйте немного позже.";
    case "auth/network-request-failed":
      return "Не удалось подключиться к Firebase. Проверьте интернет.";
    case "auth/operation-not-allowed":
      return "Email/password вход не включен в настройках Firebase Auth.";
    case "auth/popup-closed-by-user":
      return "Окно входа через Google было закрыто.";
    case "auth/popup-blocked":
      return "Браузер заблокировал pop-up. Разрешите всплывающие окна.";
    case "auth/cancelled-popup-request":
      return "Запрос на вход через Google был отменен.";
    case "auth/unauthorized-domain":
      return "Текущий домен не добавлен в список разрешенных в Firebase.";
    case "auth/account-exists-with-different-credential":
      return "Для этого email уже используется другой способ входа.";
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }

      return "Не удалось выполнить запрос к Firebase Auth. Попробуйте еще раз.";
  }
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
  return profileId ? `${repoBasePath}/profile/${profileId}` : `${repoBasePath}/`;
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
        authLoadError ?? "Firebase Auth еще не готов. Подождите пару секунд и попробуйте снова."
      );
      return;
    }

    setIsGoogleSubmitting(true);
    setSubmitError(null);

    try {
      let snapshot: AuthUserSnapshot | null;
      const snapshot = await window.sakuraFirebaseAuth.loginWithGoogle();
      if (!snapshot?.login) {
        setFlashMessage("Signed in with Google. Create a username on your profile.");
      }
      setFlashMessage("Вход через Google выполнен.");
      if (mode === "register" && snapshot?.verificationEmailSent) {
        setFlashMessage("Аккаунт создан. Письмо для подтверждения отправлено на почту.");
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
        <motion.div
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
        </motion.div>
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
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const visibleUser = currentUser && !currentUser.isAnonymous ? currentUser : null;
  const currentUserId = visibleUser?.uid ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let unsubscribe: () => void = () => {};

    const syncAuthBridge = () => {
      if (window.sakuraFirebaseAuth) {
        setAuthReady(true);
        setAuthLoadError(null);
        setCurrentUser(window.sakuraCurrentUserSnapshot ?? null);
        unsubscribe();
        unsubscribe = window.sakuraFirebaseAuth.onAuthStateChanged((user) => {
          setCurrentUser(user);
        });
        return;
      }

      if (window.sakuraFirebaseAuthError) {
        setAuthLoadError(window.sakuraFirebaseAuthError);
      }
    };

    const handleReady = () => {
      syncAuthBridge();
    };

    const handleUserUpdate = () => {
      setCurrentUser(window.sakuraCurrentUserSnapshot ?? null);
    };

    const handleError = () => {
      setAuthLoadError(
        window.sakuraFirebaseAuthError ??
          "Firebase Auth module did not load. Проверьте соединение и настройки Firebase."
      );
    };

    const timeoutId = window.setTimeout(() => {
      if (!window.sakuraFirebaseAuth && !window.sakuraFirebaseAuthError) {
        setAuthLoadError(
          "Firebase Auth module did not load. Проверьте соединение и настройки Firebase."
        );
      }
    }, 4000);

    syncAuthBridge();
    window.addEventListener(AUTH_READY_EVENT, handleReady);
    window.addEventListener(AUTH_ERROR_EVENT, handleError);
    window.addEventListener(USER_UPDATE_EVENT, handleUserUpdate);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_READY_EVENT, handleReady);
      window.removeEventListener(AUTH_ERROR_EVENT, handleError);
      window.removeEventListener(USER_UPDATE_EVENT, handleUserUpdate);
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
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
        setSubmitError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

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

  const openModal = (nextMode: AuthMode) => {
    setMode(nextMode);
    setIsModalOpen(true);
    setSubmitError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitError(null);
    setLoginName("");
    setPassword("");
    setConfirmPassword("");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitError(null);
    setLoginName("");
    setPassword("");
    setConfirmPassword("");
  };

  const navigateToProfile = (user: AuthUserSnapshot | null) => {
    window.location.assign(profileHref(user?.profileId ?? window.sakuraCurrentUserSnapshot?.profileId));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!window.sakuraFirebaseAuth) {
      setSubmitError(
        authLoadError ?? "Firebase Auth еще не готов. Подождите пару секунд и попробуйте снова."
      );
      return;
    }

    if (!identifier.trim()) {
      setSubmitError(mode === "register" ? "Enter your email." : "Enter your email or username.");
      return;
    }

    if (!identifier.trim()) {
      setSubmitError(mode === "register" ? "Введите email." : "Введите email или логин.");
      return;
    }

    if (!password) {
      setSubmitError("Введите пароль.");
      return;
    }

    if (mode === "register") {
      const normalizedLogin = loginName.trim().replace(/\s+/g, "");

      if (!normalizedLogin) {
        setSubmitError("Enter a username.");
        return;
      }

      if (!normalizedLogin) {
        setSubmitError("Введите логин.");
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
      setSubmitError("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let snapshot: AuthUserSnapshot | null;
      if (mode === "register") {
        snapshot = await window.sakuraFirebaseAuth.register({
          login: loginName.trim().replace(/\s+/g, ""),
          email: identifier.trim(),
          password,
        });
        setFlashMessage("Аккаунт создан. Вход выполнен автоматически.");
      } else {
        snapshot = await window.sakuraFirebaseAuth.login(identifier.trim(), password);
        setFlashMessage("Вход выполнен.");
      }

      if (!snapshot?.login) {
        setFlashMessage("Signed in. Create a username on your profile.");
      }

      closeModal();
      navigateToProfile(snapshot);
    } catch (error) {
      setSubmitError(getFirebaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!window.sakuraFirebaseAuth) {
      setFlashMessage(
        authLoadError ?? "Firebase Auth еще не готов. Подождите пару секунд и попробуйте снова."
      );
      return;
    }

    setIsLoggingOut(true);

    try {
      await window.sakuraFirebaseAuth.logout();
      setFlashMessage("Вы вышли из аккаунта.");
    } catch (error) {
      setFlashMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!window.sakuraFirebaseAuth) {
      setSubmitError(
        authLoadError ?? "Firebase Auth еще не готов. Подождите пару секунд и попробуйте снова."
      );
      return;
    }

    setIsGoogleSubmitting(true);
    setSubmitError(null);

    try {
      const snapshot = await window.sakuraFirebaseAuth.loginWithGoogle();
      if (!snapshot?.login) {
        setFlashMessage("Signed in with Google. Create a username on your profile.");
      }
      setFlashMessage("Вход через Google выполнен.");
      closeModal();
      navigateToProfile(snapshot);
    } catch (error) {
      setSubmitError(getFirebaseErrorMessage(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const userLabel = visibleUser ? buildUserLabel(visibleUser) : "Signed in";
  const userInitials = visibleUser ? buildUserInitials(visibleUser) : "SA";
  const userAccentRole = visibleUser ? highestPriorityRole(visibleUser.roles ?? []) : "user";
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
          <a
            href={profileHref(visibleUser.profileId)}
            style={userAccentStyle}
            className="group inline-flex max-w-full items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 transition hover:opacity-90"
          >
            {visibleUser.photoURL ? (
              <img
                src={visibleUser.photoURL}
                alt={userLabel}
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
            onClick={closeModal}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
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
                    {mode === "register" ? "Registration" : "Sign In"}
                  </h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {mode === "register"
                      ? "Create a username so it appears on your profile and works for sign-in."
                      : "You can sign in with your email or username through Firebase Auth."}
                  </p>
                  <p className="mt-2 hidden text-sm text-gray-400">
                    {mode === "register"
                      ? "Создайте логин, чтобы он отображался в профиле и подходил для входа."
                      : "Войти можно по email или логину через Firebase Auth."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#272727] bg-[#101010] text-lg text-gray-400 transition hover:border-[#ffb7c5]/40 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
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

              {!authReady && !authLoadError ? (
                <div className="mt-5 rounded-2xl border border-[#2b1b1e] bg-[#120d0f] px-4 py-3 text-sm text-[#f2c0cb]">
                  Подключаем Firebase Auth...
                </div>
              ) : null}

              {authLoadError ? (
                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
                  {authLoadError}
                </div>
              ) : null}

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
                <span>{isGoogleSubmitting ? "Connecting Google..." : "Войти через Google"}</span>
              </button>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#1f1f1f]"></div>
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-600">
                  or
                </span>
                <div className="h-px flex-1 bg-[#1f1f1f]"></div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                {mode === "register" ? (
                  <label className="block">
                    <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                      Username
                    </span>
                    <input
                      type="text"
                      value={loginName}
                      minLength={3}
                      maxLength={24}
                      autoComplete="username"
                      onChange={(event) => setLoginName(event.target.value)}
                      className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                      placeholder="your_username"
                    />
                    <span className="mt-2 block text-xs leading-relaxed text-gray-500">
                      Username without spaces. Letters, numbers, `.`, `_`, and `-` are supported.
                    </span>
                    <span className="mt-2 hidden text-xs leading-relaxed text-gray-500">
                      Логин без пробелов. Поддерживаются буквы, цифры, `.`, `_`, `-`.
                    </span>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
                    {mode === "register" ? "Email" : "Email or Username"}
                  </span>
                  <input
                    type={mode === "register" ? "email" : "text"}
                    value={identifier}
                    autoComplete={mode === "register" ? "email" : "username"}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="w-full rounded-2xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#ffb7c5]/55"
                    placeholder={
                      mode === "register" ? "you@example.com" : "you@example.com or your_username"
                    }
                  />
                </label>

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

                {mode === "register" ? (
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
                    ? mode === "register"
                      ? "Creating account..."
                      : "Signing in..."
                    : mode === "register"
                      ? "Create Account"
                      : "Sign In"}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-white selection:text-black">
      <SakuraBackground />

      <div className="relative z-10">
        <nav className="flex flex-col gap-5 border-b border-[#1a1a1a] px-8 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-3">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <span className="text-2xl text-[#ffb7c5] drop-shadow-[0_0_10px_rgba(255,183,197,0.5)]">
              🌸
            </span>
            <h1 className="text-xl font-black tracking-tighter uppercase text-white">
              Sa<span className="text-[#ffb7c5]">kura</span>
            </h1>
          </Link>
            <div className="flex items-center gap-2 rounded-full border border-[#2b1b1e] bg-[#1a1012] px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#ffb7c5] shadow-[0_0_10px_#ffb7c5]"></span>
              <span className="text-[10px] font-mono text-[#ffb7c5]">STATUS: UNDETECTED</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-medium text-gray-400">
            <a href="#feature-showcase" className="transition hover:text-white">
              Features
            </a>
            <HeaderAuth />
          </div>
        </nav>

        <section className="flex flex-col items-center justify-center px-4 pt-32 pb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6 text-center text-7xl font-black tracking-tighter uppercase"
          >
            Feel The <br /> <span className="italic text-gray-500">Sakura Power</span>
          </motion.h1>

          <p className="mb-10 max-w-xl text-center text-lg leading-relaxed text-gray-400">
            Бесплатное решение чита для Dota 2. Работа с памятью, и приятное глазу меню.
          </p>

          <div className="flex gap-4">
            <a
              href="#download"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("download");
              }}
              className="inline-flex items-center justify-center bg-[#ffb7c5] px-10 py-4 text-sm font-bold uppercase text-black shadow-[0_0_30px_rgba(255,183,197,0.2)] transition-all hover:bg-[#ffcdd7] active:scale-95"
            >
              Download Latest
            </a>
          </div>
        </section>

        <section id="features" className="grid grid-cols-1 gap-1 px-10 pt-20 pb-1 md:grid-cols-2">
          <FeatureBox
            delay={0.1}
            title="VMT Hooking"
            desc="Безопасный перехват функций через таблицы виртуальных методов."
          />
          <FeatureBox
            delay={0.2}
            title="Signature Scanner"
            desc="Быстрое обновление офсетов после патчей Valve."
          />
        </section>

        <BottomInfoSection />
        <FeatureShowcase />
        <SetupSteps />
        <DownloadSection />
      </div>
    </main>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="border border-[#1a1a1a] bg-[#0d0d0d] p-8 transition-colors duration-500 hover:border-[#ffb7c5]/50"
    >
      <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{title}</h3>
      <p className="text-sm leading-snug text-gray-300">{desc}</p>
    </motion.div>
  );
}

function BottomInfoSection() {
  return (
    <section className="grid grid-cols-1 gap-1 px-10 pt-0 pb-20 md:grid-cols-2">
      <FeatureBox
        delay={0.1}
        title="Best free choice"
        desc="Лучшее бесплатное решение для комфортной игры."
      />
      <FeatureBox
        delay={0.2}
        title="Temporary Testing Period"
        desc="Успейте воспользоваться бесплатно данным решением и помочь в развитии проекта."
      />
    </section>
  );
}

function FeatureShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [previewSlide, setPreviewSlide] = useState<ShowcaseSlide | null>(null);
  const [isPreviewZoomed, setIsPreviewZoomed] = useState(false);
  const [isPreviewDragging, setIsPreviewDragging] = useState(false);
  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const previewZoomTargetRef = useRef<{ xRatio: number; yRatio: number } | null>(null);
  const previewDragRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const carouselDragRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    swiped: boolean;
  } | null>(null);
  const suppressPreviewClickRef = useRef(false);
  const suppressCarouselClickRef = useRef(false);
  const slide = showcaseSlides[activeSlide];

  const goToPrevious = () => {
    setActiveSlide((current) => (current - 1 + showcaseSlides.length) % showcaseSlides.length);
  };

  const goToNext = () => {
    setActiveSlide((current) => (current + 1) % showcaseSlides.length);
  };

  const openPreview = () => {
    setPreviewSlide(slide);
    setIsPreviewZoomed(false);
    setIsPreviewDragging(false);
  };

  const closePreview = () => {
    setPreviewSlide(null);
    setIsPreviewZoomed(false);
    setIsPreviewDragging(false);
    previewDragRef.current = null;
    previewZoomTargetRef.current = null;
    suppressPreviewClickRef.current = false;
  };

  useEffect(() => {
    if (previewSlide || isCarouselDragging) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % showcaseSlides.length);
    }, 10000);

    return () => window.clearTimeout(timerId);
  }, [activeSlide, previewSlide, isCarouselDragging]);

  useEffect(() => {
    if (!previewSlide) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewSlide]);

  useEffect(() => {
    const viewport = previewViewportRef.current;

    if (!viewport) {
      return;
    }

    if (!isPreviewZoomed) {
      viewport.scrollTo({ left: 0, top: 0 });
      previewZoomTargetRef.current = null;
      return;
    }

    let frameId = 0;
    let settleFrameId = 0;
    let settleTimeoutId = 0;

    const applyZoomScroll = () => {
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);

      if (previewZoomTargetRef.current) {
        const targetScrollLeft =
          viewport.scrollWidth * previewZoomTargetRef.current.xRatio - viewport.clientWidth / 2;
        const targetScrollTop =
          viewport.scrollHeight * previewZoomTargetRef.current.yRatio - viewport.clientHeight / 2;

        viewport.scrollLeft = Math.min(maxScrollLeft, Math.max(0, targetScrollLeft));
        viewport.scrollTop = Math.min(maxScrollTop, Math.max(0, targetScrollTop));
      } else {
        viewport.scrollLeft = maxScrollLeft / 2;
        viewport.scrollTop = maxScrollTop / 2;
      }

      previewZoomTargetRef.current = null;
    };

    frameId = window.requestAnimationFrame(() => {
      applyZoomScroll();
      settleFrameId = window.requestAnimationFrame(applyZoomScroll);
      settleTimeoutId = window.setTimeout(applyZoomScroll, 120);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(settleFrameId);
      window.clearTimeout(settleTimeoutId);
    };
  }, [isPreviewZoomed, previewSlide]);

  const togglePreviewZoom = (event?: { clientX: number; clientY: number }) => {
    if (suppressPreviewClickRef.current) {
      suppressPreviewClickRef.current = false;
      return;
    }

    if (!isPreviewZoomed && event && previewViewportRef.current) {
      const rect =
        previewImageRef.current?.getBoundingClientRect() ??
        previewViewportRef.current.getBoundingClientRect();

      previewZoomTargetRef.current = {
        xRatio: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        yRatio: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      };
    }

    setIsPreviewZoomed((current) => !current);
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPreviewZoomed || !previewViewportRef.current) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    previewDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: previewViewportRef.current.scrollLeft,
      scrollTop: previewViewportRef.current.scrollTop,
      moved: false,
    };
    setIsPreviewDragging(true);
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPreviewZoomed || !previewViewportRef.current || !previewDragRef.current) {
      return;
    }

    const deltaX = event.clientX - previewDragRef.current.startX;
    const deltaY = event.clientY - previewDragRef.current.startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      previewDragRef.current.moved = true;
    }

    previewViewportRef.current.scrollLeft = previewDragRef.current.scrollLeft - deltaX;
    previewViewportRef.current.scrollTop = previewDragRef.current.scrollTop - deltaY;
  };

  const finishPreviewDrag = () => {
    if (!previewDragRef.current) {
      return;
    }

    if (previewDragRef.current.moved) {
      suppressPreviewClickRef.current = true;
    }

    previewDragRef.current = null;
    setIsPreviewDragging(false);
  };

  const handleCarouselPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    carouselDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      swiped: false,
    };
    setIsCarouselDragging(true);
  };

  const handleCarouselPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!carouselDragRef.current) {
      return;
    }

    const deltaX = event.clientX - carouselDragRef.current.startX;
    const deltaY = event.clientY - carouselDragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      carouselDragRef.current.moved = true;
    }

    if (
      !carouselDragRef.current.swiped &&
      Math.abs(deltaX) > 70 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      carouselDragRef.current.swiped = true;
      suppressCarouselClickRef.current = true;

      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  const finishCarouselDrag = () => {
    if (!carouselDragRef.current) {
      return;
    }

    if (carouselDragRef.current.moved) {
      suppressCarouselClickRef.current = true;
    }

    carouselDragRef.current = null;
    setIsCarouselDragging(false);
  };

  const handleCarouselClick = () => {
    if (suppressCarouselClickRef.current) {
      suppressCarouselClickRef.current = false;
      return;
    }

    openPreview();
  };

  return (
    <>
      <section id="feature-showcase" className="border-t border-[#1a1a1a] px-10 py-24">
        <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
            Feature Showcase
          </p>
          <h2 className="max-w-2xl text-4xl font-black uppercase tracking-tighter text-white">
            Листай карточки
          </h2>
        </div>

          <div className="grid items-stretch gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <motion.div
              key={`copy-${slide.id}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex min-h-[420px] flex-col justify-between rounded-[28px] border border-[#1a1a1a] bg-[#0d0d0d] p-8"
            >
              <div>
                <span className="mb-6 inline-flex rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.35em] text-[#ffb7c5]">
                  {slide.index}
                </span>
                <h3 className="mb-4 text-3xl font-black uppercase tracking-tighter text-white">
                  {slide.title}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-gray-400">{slide.desc}</p>
              </div>

              <div className="rounded-[24px] border border-[#1a1a1a] bg-black/40 p-5">
                <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.35em] text-gray-600">
                  Preview
                </span>
                <p className="text-sm leading-relaxed text-gray-500">{slide.mediaCaption}</p>
              </div>
            </motion.div>

            <div className="relative flex items-center px-4 md:px-8">
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Предыдущая карточка"
                className="absolute -left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#2b1b1e] bg-[#0d0d0d] text-[#ffb7c5] shadow-[0_0_20px_rgba(255,183,197,0.08)] transition hover:border-[#ffb7c5]/50 hover:bg-[#1a1012] md:-left-6"
              >
                ←
              </button>

              <motion.div
                key={`media-${slide.id}`}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full"
              >
                <button
                  type="button"
                  onClick={handleCarouselClick}
                  onPointerDown={handleCarouselPointerDown}
                  onPointerMove={handleCarouselPointerMove}
                  onPointerUp={finishCarouselDrag}
                  onPointerCancel={finishCarouselDrag}
                  onPointerLeave={finishCarouselDrag}
                  className={`group relative block w-full overflow-hidden rounded-[32px] border border-[#1f1f1f] bg-black text-left ${
                    isCarouselDragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  aria-label={`Открыть ${slide.title} в полном размере`}
                  style={{ touchAction: "pan-y" }}
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={slide.mediaSrc}
                      alt={slide.title}
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 via-black/25 to-transparent"></div>
                    <div className="absolute inset-x-8 top-8 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#ffb7c5]">
                        {slide.mediaOverlayTitle}
                      </span>
                      <span className="rounded-full border border-[#2b1b1e] bg-[#1a1012] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400">
                        click to open
                      </span>
                    </div>
                  </div>
                </button>

                <div className="mt-6 flex items-center justify-center gap-3">
                  {showcaseSlides.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Перейти к карточке ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === activeSlide ? "w-8 bg-[#ffb7c5]" : "w-2.5 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>

              <button
                type="button"
                onClick={goToNext}
                aria-label="Следующая карточка"
                className="absolute -right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#2b1b1e] bg-[#0d0d0d] text-[#ffb7c5] shadow-[0_0_20px_rgba(255,183,197,0.08)] transition hover:border-[#ffb7c5]/50 hover:bg-[#1a1012] md:-right-6"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </section>

      {previewSlide ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-[min(96vw,1700px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                  Full Preview
                </p>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                  {previewSlide.title}
                </h3>
              </div>
              <div className="text-right">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-gray-500">
                  Click image to zoom
                </p>
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#ffb7c5] transition hover:bg-[#241417]"
                >
                  Close
                </button>
              </div>
            </div>

            <div
              ref={previewViewportRef}
              className="max-h-[82vh] overflow-auto rounded-[28px] border border-[#1f1f1f] bg-[#050505] shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={(event) => togglePreviewZoom(event)}
                onDragStart={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePreviewZoom();
                  }
                }}
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={finishPreviewDrag}
                onPointerCancel={finishPreviewDrag}
                onPointerLeave={finishPreviewDrag}
                className={`block w-full bg-black outline-none ${
                  isPreviewZoomed
                    ? isPreviewDragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : "cursor-zoom-in"
                }`}
                style={{ touchAction: isPreviewZoomed ? "none" : "auto" }}
              >
                <div
                  className={`mx-auto ${
                    isPreviewZoomed ? "w-[165%]" : "w-full"
                  } ${isPreviewZoomed ? "cursor-inherit" : "cursor-zoom-in"}`}
                >
                  <img
                    ref={previewImageRef}
                    src={previewSlide.mediaSrc}
                    alt={previewSlide.title}
                    draggable={false}
                    className="pointer-events-none block h-auto w-full select-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SetupSteps() {
  const steps = [
    {
      num: "01",
      title: "Download",
      desc: "Получите последнюю версию билда и распакуйте архив в удобное место.",
    },
    {
      num: "02",
      title: "Initialize",
      desc: "Запустите Dota 2, затем откройте лоадер от имени администратора.",
    },
    {
      num: "03",
      title: "Configure",
      desc: "Нажмите INSERT в игре, чтобы открыть меню и подгрузить свои Lua конфиги.",
    },
  ];

  return (
    <section className="border-t border-[#1a1a1a] px-10 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
          Installation Process
        </h2>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  return (
    <section
      id="download"
      className="flex flex-col items-center border-y border-[#1a1a1a] bg-[#050505] px-10 py-24"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-4xl flex-col items-center justify-between gap-10 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-12 md:flex-row"
      >
        <div className="flex-1">
          <h2 className="mb-4 text-3xl font-black uppercase tracking-tighter text-[#ffb7c5]">
            Готовы стать победителем?
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">
            Загрузите последнюю версию чита.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                Version
              </span>
              <span className="cursor-default font-mono text-sm italic text-gray-300 transition-all hover:text-white">
                0.0.1 beta test
              </span>
            </div>
            <div className="h-8 w-px bg-[#1a1a1a]"></div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                Last Update
              </span>
              <span className="cursor-default font-mono text-sm italic text-gray-300 transition-all hover:text-white">
                24.03.2026
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="cursor-not-allowed bg-[#ffb7c5]/70 px-12 py-5 text-center text-sm font-black uppercase text-black/75 shadow-[0_0_30px_rgba(255,183,197,0.12)]"
          >
            Soon
          </button>
          <span className="text-center font-mono text-[10px] text-gray-600">MD5: 7A9D...F2C1</span>
        </div>
      </motion.div>
    </section>
  );
}
