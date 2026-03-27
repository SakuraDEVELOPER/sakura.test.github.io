"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

type AuthUserSnapshot = {
  uid: string;
  email: string | null;
  displayName: string | null;
  profileId: number | null;
  photoURL: string | null;
  providerIds: string[];
  creationTime: string | null;
  lastSignInTime: string | null;
};

type FirebaseAuthBridge = {
  login: (email: string, password: string) => Promise<AuthUserSnapshot | null>;
  loginWithGoogle: () => Promise<AuthUserSnapshot | null>;
  register: (email: string, password: string) => Promise<AuthUserSnapshot | null>;
  logout: () => Promise<void>;
  onAuthStateChanged: (callback: (user: AuthUserSnapshot | null) => void) => () => void;
};

declare global {
  interface Window {
    firebaseConfig?: FirebaseClientConfig;
    sakuraFirebaseAuth?: FirebaseAuthBridge;
    sakuraFirebaseAuthError?: string;
  }
}

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
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
  const source = user.displayName?.trim() || user.email?.trim() || "Sakura User";
  const segments = source.split(/[\s@._-]+/).filter(Boolean);

  return segments
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export default function ProfilePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUserSnapshot | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let unsubscribe: () => void = () => {};

    const syncAuthBridge = () => {
      if (window.sakuraFirebaseAuth) {
        setAuthReady(true);
        setAuthLoadError(null);
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

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_READY_EVENT, handleReady);
      window.removeEventListener(AUTH_ERROR_EVENT, handleError);
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

  const providerLabels = currentUser?.providerIds.length
    ? currentUser.providerIds.map(formatProvider)
    : ["Firebase Auth"];

  const userInitials = currentUser ? buildInitials(currentUser) : "SA";
  const projectId = typeof window !== "undefined" ? window.firebaseConfig?.projectId : "sakura-bfa74";
  const profileLabel = currentUser?.profileId ? `Profile #${currentUser.profileId}` : "Profile";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.14),transparent_35%),linear-gradient(180deg,#090909_0%,#040404_100%)] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-col gap-4 rounded-[28px] border border-[#1b1b1b] bg-black/40 px-6 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.38em] text-[#ffb7c5]">
              Sakura Account
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tighter text-white">
              {profileLabel}
            </h1>
          </div>

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
                      alt={currentUser.displayName ?? currentUser.email ?? "Profile avatar"}
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
                      {currentUser.displayName ?? "Sakura User"}
                    </h2>
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
                  Account Status
                </p>
                <div className="mt-5 flex items-center gap-3 rounded-[24px] border border-[#1f3b2f] bg-[#0d1713] px-4 py-4">
                  <span className="h-3 w-3 rounded-full bg-[#8ce5b2] shadow-[0_0_18px_rgba(140,229,178,0.55)]"></span>
                  <div>
                    <p className="text-sm font-semibold text-[#d6f2e2]">Session Active</p>
                    <p className="mt-1 text-xs text-[#9ec7b3]">
                      Аккаунт успешно подключен к Firebase Auth.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">
                  Next Step
                </p>
                <p className="mt-4 text-sm leading-relaxed text-gray-400">
                  Теперь у тебя есть отдельная страница профиля. Следующим шагом можно добавить
                  редактирование имени, аватар, историю входов или приватные разделы только для
                  авторизованных пользователей.
                </p>
              </div>
            </motion.div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
