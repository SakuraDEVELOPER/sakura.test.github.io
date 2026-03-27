"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

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
  email: string | null;
  login: string | null;
  displayName: string | null;
  profileId: number | null;
  photoURL: string | null;
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
  updateAvatar: (file: File) => Promise<AuthUserSnapshot | null>;
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
    sakuraCurrentUserSnapshot?: AuthUserSnapshot | null;
    sakuraFirebaseAuth?: FirebaseAuthBridge;
    sakuraFirebaseAuthError?: string;
  }
}

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const USER_UPDATE_EVENT = "sakura-user-update";
const PROFILE_PATH_STORAGE_KEY = "sakura-profile-path";
const repoBasePath = "/sakura.github.io";

function formatProvider(providerId: string) {
  switch (providerId) {
    case "password":
      return "Email / Password";
    case "google.com":
      return "Google";
    default:
      return providerId;
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildInitials(user: AuthUserSnapshot) {
  const source = user.displayName?.trim() || user.login?.trim() || user.email?.trim() || "Sakura User";
  const segments = source.split(/[\s@._-]+/).filter(Boolean);

  return segments
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function buildPrimaryName(user: AuthUserSnapshot) {
  return user.displayName?.trim() || user.login?.trim() || "Sakura User";
}

function getAvatarUploadErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "storage/unsupported-file-type":
      return "Загрузите PNG, JPG, WEBP или GIF.";
    case "storage/file-too-large":
      return "Файл должен быть не больше 5 МБ.";
    case "storage/invalid-file":
      return "Сначала выберите изображение.";
    case "storage/unauthorized":
    case "permission-denied":
      return "Firebase Storage или Firestore не разрешают сохранить аватар. Проверьте rules.";
    case "auth/no-current-user":
      return "Сессия истекла. Войдите снова и повторите загрузку.";
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }

      return "Не удалось загрузить аватар. Попробуйте ещё раз.";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUserSnapshot | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const currentUserId = currentUser?.uid ?? null;

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
    if (typeof window === "undefined" || !currentUser?.profileId) {
      return;
    }

    const fallbackPath = window.sessionStorage.getItem(PROFILE_PATH_STORAGE_KEY);
    const desiredPath = `${repoBasePath}/profile/${currentUser.profileId}`;

    if (fallbackPath) {
      window.sessionStorage.removeItem(PROFILE_PATH_STORAGE_KEY);
    }

    if (window.location.pathname !== desiredPath) {
      window.history.replaceState(null, "", desiredPath);
    }
  }, [currentUser?.profileId]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId || !window.sakuraFirebaseAuth) {
      return;
    }

    const syncCurrentPage = (source: string, forceVisit = false) => {
      window.sakuraFirebaseAuth
        ?.syncPresence({
          path: window.location.pathname,
          source,
          forceVisit,
        })
        .catch(() => {});
    };

    syncCurrentPage("profile-view", true);

    const handleOnline = () => {
      syncCurrentPage("profile-online", true);
    };

    const handleOffline = () => {
      syncCurrentPage("profile-offline", true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUserId]);

  const handleLogout = async () => {
    if (!window.sakuraFirebaseAuth) {
      setAuthLoadError(
        window.sakuraFirebaseAuthError ??
          "Firebase Auth еще не готов. Подождите пару секунд и попробуйте снова."
      );
      return;
    }

    setIsLoggingOut(true);

    try {
      await window.sakuraFirebaseAuth.logout();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!window.sakuraFirebaseAuth) {
      setAvatarError(
        window.sakuraFirebaseAuthError ??
          "Firebase Auth ещё не готов. Подождите пару секунд и попробуйте снова."
      );
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(null);
    setIsAvatarUploading(true);

    try {
      await window.sakuraFirebaseAuth.updateAvatar(file);
      setAvatarSuccess("Аватар сохранён.");
    } catch (error) {
      setAvatarError(getAvatarUploadErrorMessage(error));
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const providerLabels = currentUser?.providerIds.length
    ? currentUser.providerIds.map(formatProvider)
    : ["Firebase Auth"];

  const userInitials = currentUser ? buildInitials(currentUser) : "SA";
  const primaryName = currentUser ? buildPrimaryName(currentUser) : "Sakura User";
  const avatarMode = currentUser?.photoURL ? "Cloud Avatar" : "Generated Avatar";
  const privateSections = [
    {
      title: "Private Builds",
      desc: "Доступ к приватным раздачам, патчноутам и внутренним релизам только после авторизации.",
    },
    {
      title: "Cloud Config",
      desc: "Быстрый вход с сохранением персонального логина, истории входов и привязанных способов авторизации.",
    },
    {
      title: "Account Notes",
      desc: "Закрытая зона для будущих данных аккаунта: статуса, подписки, тикетов и внутренних уведомлений.",
    },
  ];
  const projectId = typeof window !== "undefined" ? window.firebaseConfig?.projectId : "sakura-bfa74";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.14),transparent_35%),linear-gradient(180deg,#090909_0%,#040404_100%)] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-wrap items-center justify-end gap-3 rounded-[28px] border border-[#1b1b1b] bg-black/40 px-6 py-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white"
            >
              Home
            </Link>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            ) : null}
          </div>
        </nav>

        {!authReady && !authLoadError ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-8 py-12 shadow-[0_0_60px_rgba(255,183,197,0.06)]"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
              Loading
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tighter text-white">
              Подключаем профиль
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
              Ждем инициализацию Firebase Auth, чтобы получить данные текущего аккаунта.
            </p>
          </motion.section>
        ) : null}

        {authLoadError ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-red-400/20 bg-red-500/10 px-8 py-12"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
              Auth Error
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tighter text-white">
              Профиль недоступен
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-red-100/85">
              {authLoadError}
            </p>
          </motion.section>
        ) : null}

        {authReady && !authLoadError && !currentUser ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-8 py-12 shadow-[0_0_60px_rgba(255,183,197,0.06)]"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
              Guest State
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tighter text-white">
              Сессия не найдена
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
              В этом браузере сейчас нет активного входа. Вернитесь на главную страницу и
              выполните логин или регистрацию.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-[#ffb7c5] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3]"
              >
                Перейти к логину
              </Link>
            </div>
          </motion.section>
        ) : null}

        {currentUser ? (
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[34px] border border-[#201517] bg-[#0d0d0d] shadow-[0_0_80px_rgba(255,183,197,0.06)]"
            >
              <div className="border-b border-[#1b1b1b] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.16),transparent_55%)] px-8 py-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={primaryName}
                      className="h-24 w-24 rounded-[28px] border border-[#2c2023] object-cover shadow-[0_0_30px_rgba(255,183,197,0.14)]"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#2c2023] bg-[#1a1012] text-2xl font-black uppercase text-[#ffb7c5] shadow-[0_0_30px_rgba(255,183,197,0.14)]">
                      {userInitials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                      Account Overview
                    </p>
                    <h2 className="mt-3 truncate text-3xl font-black uppercase tracking-tighter text-white">
                      {primaryName}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-[#2b1b1e] bg-[#1a1012] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ffb7c5]">
                        {currentUser.login ? `@${currentUser.login}` : "login pending"}
                      </span>
                      <span className="text-xs text-gray-500">
                        Логин можно использовать для входа вместо email.
                      </span>
                    </div>
                    <p className="mt-3 break-all text-sm leading-relaxed text-gray-400">
                      {currentUser.email ?? "Email not provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-8 py-8 sm:grid-cols-2">
                <div className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">
                      Profile ID
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-300">
                      {currentUser.profileId ?? "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">
                      Login
                    </p>
                    <p className="mt-3 break-all text-sm leading-relaxed text-gray-300">
                      {currentUser.login ? `@${currentUser.login}` : "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">
                      User ID
                    </p>
                    <p className="mt-3 break-all text-sm leading-relaxed text-gray-300">
                      {currentUser.uid}
                    </p>
                </div>

                <div className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">
                    Firebase Project
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">
                    {projectId ?? "sakura-bfa74"}
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">
                    Account Created
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">
                    {formatTimestamp(currentUser.creationTime)}
                  </p>
                </div>

                <div className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">
                    Last Sign-In
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">
                    {formatTimestamp(currentUser.lastSignInTime)}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="flex flex-col gap-6"
            >
              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                  Avatar
                </p>
                <div className="mt-5 rounded-[24px] border border-[#1d1d1d] bg-[#090909] p-4">
                  <div className="flex items-center gap-4">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={primaryName}
                      className="h-16 w-16 rounded-[20px] border border-[#2c2023] object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#2c2023] bg-[#1a1012] text-lg font-black uppercase text-[#ffb7c5]">
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{avatarMode}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {currentUser.photoURL
                        ? "Используется загруженный аватар аккаунта."
                        : "Если у пользователя нет фото, показываются инициалы как fallback-аватар."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={openAvatarPicker}
                        disabled={isAvatarUploading}
                        className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isAvatarUploading
                          ? "Uploading..."
                          : currentUser.photoURL
                            ? "Replace Avatar"
                            : "Upload Avatar"}
                      </button>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                        PNG / JPG / WEBP / GIF - up to 5 MB
                      </span>
                    </div>
                    {avatarError ? (
                      <p className="mt-3 text-xs leading-relaxed text-[#ff9aa9]">{avatarError}</p>
                    ) : null}
                    {avatarSuccess ? (
                      <p className="mt-3 text-xs leading-relaxed text-[#8ce5b2]">{avatarSuccess}</p>
                    ) : null}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
              </div>

              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                  Providers
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {providerLabels.map((provider) => (
                    <span
                      key={provider}
                      className="inline-flex rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5]"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                  Private Sections
                </p>
                <div className="mt-5 space-y-3">
                  {privateSections.map((section) => (
                    <div
                      key={section.title}
                      className="rounded-[22px] border border-[#1d1d1d] bg-[#090909] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{section.title}</p>
                        <span className="inline-flex rounded-full border border-[#1f3b2f] bg-[#0d1713] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8ce5b2]">
                          Unlocked
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">{section.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
