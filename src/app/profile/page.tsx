"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";

type UserProfile = {
  uid: string;
  email: string | null;
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

type Bridge = {
  getProfileById: (profileId: number) => Promise<UserProfile | null>;
  updateAvatar: (file: File) => Promise<UserProfile | null>;
  deleteAvatar: () => Promise<UserProfile | null>;
  syncPresence: (options?: { path?: string; source?: string; forceVisit?: boolean }) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => () => void;
};

type RuntimeWindow = Window & {
  firebaseConfig?: { projectId?: string };
  sakuraCurrentUserSnapshot?: UserProfile | null;
  sakuraFirebaseAuth?: Bridge;
  sakuraFirebaseAuthError?: string;
};

const AUTH_READY_EVENT = "sakura-auth-ready";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const USER_UPDATE_EVENT = "sakura-user-update";
const PROFILE_PATH_STORAGE_KEY = "sakura-profile-path";
const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
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
const parseProfileId = (path: string | null) => {
  if (!path || !path.startsWith(`${repoBasePath}/profile/`)) return null;
  const raw = path.slice(`${repoBasePath}/profile/`.length);
  return /^\d+$/.test(raw) ? Number(raw) : null;
};
const formatTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not available";
const normalizeRoleName = (role: string) => {
  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "admin") {
    return "administrator";
  }

  return normalizedRole;
};
const formatRole = (role: string) => {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "root") return "Root";
  if (normalizedRole === "administrator") return "Administrator";
  if (normalizedRole === "moderator") return "Moderator";
  if (normalizedRole === "tester") return "Tester";
  if (normalizedRole === "subscriber") return "Subscriber";
  if (normalizedRole === "user") return "User";

  return normalizedRole
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
};
const roleBadgeStyle = (role: string): CSSProperties => {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "root") {
    return {
      borderColor: "#ff4b5c",
      backgroundColor: "#1d0a0e",
      color: "#ffb8c0",
      boxShadow: "0 0 16px rgba(255,75,92,0.18)",
    };
  }

  if (normalizedRole === "administrator") {
    return {
      borderColor: "#4a93ff",
      backgroundColor: "#091321",
      color: "#bedaff",
      boxShadow: "0 0 16px rgba(74,147,255,0.18)",
    };
  }

  if (normalizedRole === "moderator") {
    return {
      borderColor: "#8f6cff",
      backgroundColor: "#151028",
      color: "#ddd1ff",
      boxShadow: "0 0 16px rgba(143,108,255,0.18)",
    };
  }

  if (normalizedRole === "tester") {
    return {
      borderColor: "#f2f2f2",
      backgroundColor: "#151515",
      color: "#ffffff",
      boxShadow: "0 0 16px rgba(255,255,255,0.12)",
    };
  }

  if (normalizedRole === "subscriber") {
    return {
      borderColor: "#f0c54c",
      backgroundColor: "#1a1406",
      color: "#ffe7a3",
      boxShadow: "0 0 16px rgba(240,197,76,0.18)",
    };
  }

  return {
    borderColor: "#43c980",
    backgroundColor: "#0b1711",
    color: "#b7f3cf",
    boxShadow: "0 0 16px rgba(67,201,128,0.16)",
  };
};
const nameOf = (user: UserProfile) => user.displayName?.trim() || user.login?.trim() || "Sakura User";
const initialsOf = (user: UserProfile) =>
  (user.displayName || user.login || user.email || "SA")
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
  requestedProfileId === null || (currentUser?.profileId ?? null) === requestedProfileId ? currentUser : null;
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
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

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
        setAuthError(null);
        setCurrentUser(runtime.sakuraCurrentUserSnapshot ?? null);
        unsubscribe();
        unsubscribe = runtime.sakuraFirebaseAuth.onAuthStateChanged((user) => setCurrentUser(user));
        return;
      }
      if (runtime.sakuraFirebaseAuthError) setAuthError(runtime.sakuraFirebaseAuthError);
    };
    const onUserUpdate = () => setCurrentUser(getWindowState().sakuraCurrentUserSnapshot ?? null);
    const onError = () => setAuthError(getWindowState().sakuraFirebaseAuthError ?? "Firebase Auth did not load.");
    const timeoutId = window.setTimeout(() => {
      if (!getWindowState().sakuraFirebaseAuth && !getWindowState().sakuraFirebaseAuthError) setAuthError("Firebase Auth did not load.");
    }, 4000);
    sync();
    window.addEventListener(AUTH_READY_EVENT, sync);
    window.addEventListener(AUTH_ERROR_EVENT, onError);
    window.addEventListener(USER_UPDATE_EVENT, onUserUpdate);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_READY_EVENT, sync);
      window.removeEventListener(AUTH_ERROR_EVENT, onError);
      window.removeEventListener(USER_UPDATE_EVENT, onUserUpdate);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !authReady || authError) return;
    const runtime = getWindowState();
    const requestedId = requestedProfileId;
    if (requestedId === null || currentUser?.profileId === requestedId) {
      setProfile(currentUser);
      setProfileError(null);
      setIsProfileLoading(false);
      if (currentUser?.profileId && requestedId === null && window.location.pathname !== profilePath(currentUser.profileId)) {
        window.history.replaceState(null, "", profilePath(currentUser.profileId));
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
        if (!user) setProfileError(`Profile #${requestedId} was not found.`);
        if (window.location.pathname !== profilePath(requestedId)) window.history.replaceState(null, "", profilePath(requestedId));
      })
      .catch((error) => {
        setProfile(null);
        setProfileError(error instanceof Error ? error.message : "Could not load this profile.");
      })
      .finally(() => setIsProfileLoading(false));
  }, [authReady, authError, currentUser, requestedProfileId]);

  useEffect(() => {
    if (!currentUser?.uid || !getWindowState().sakuraFirebaseAuth) return;
    getWindowState().sakuraFirebaseAuth?.syncPresence({ path: window.location.pathname, source: "profile-view", forceVisit: true }).catch(() => {});
  }, [currentUser?.uid]);

  const isOwner = Boolean(currentUser && profile && currentUser.uid === profile.uid);
  const activeProfile = profile;
  const profileRoles = activeProfile?.roles?.length ? activeProfile.roles : ["user"];
  const shouldShowPendingState =
    !authError &&
    !activeProfile &&
    (!authReady || isProfileLoading || (requestedProfileId !== null && !profileError));

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.14),transparent_35%),linear-gradient(180deg,#090909_0%,#040404_100%)] px-5 py-8 text-white sm:px-8">
      <script
        dangerouslySetInnerHTML={{
          __html: restoreProfilePathScript,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-wrap items-center justify-end gap-3 rounded-[28px] border border-[#1b1b1b] bg-black/40 px-6 py-5 backdrop-blur-sm">
          <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#101010] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition hover:border-[#4a4a4a] hover:text-white">Home</Link>
          {currentUser?.profileId && !isOwner ? <a href={profilePath(currentUser.profileId)} className="inline-flex items-center justify-center rounded-full border border-[#2b1b1e] bg-[#1a1012] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb7c5] transition hover:border-[#ffb7c5]/40 hover:text-white">My Profile</a> : null}
          {currentUser ? <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="inline-flex items-center justify-center rounded-full border border-[#ffb7c5]/30 bg-[#ffb7c5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc8d3] disabled:cursor-not-allowed disabled:opacity-60">{isLoggingOut ? "Logging out..." : "Logout"}</button> : null}
        </nav>

        {authError ? <section className="rounded-[32px] border border-red-400/20 bg-red-500/10 px-8 py-12"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Auth Error</p><p className="mt-4 text-sm leading-relaxed text-red-100/85">{authError}</p></section> : null}
        {hasHydrated && showPendingState ? <section className="rounded-[32px] border border-[#181818] bg-[#090909]/85 px-6 py-5 shadow-[0_0_40px_rgba(255,183,197,0.04)]"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#ffb7c5]">Loading</p><p className="mt-2 text-sm text-gray-400">{requestedProfileId ? `Preparing profile #${requestedProfileId}...` : "Preparing profile..."}</p></div><div className="h-2 w-2 rounded-full bg-[#ffb7c5] animate-pulse"></div></div></section> : null}
        {hasHydrated && authReady && !authError && !isProfileLoading && !activeProfile && profileError ? <section className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-8 py-12 shadow-[0_0_60px_rgba(255,183,197,0.06)]"><p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">{requestedProfileId ? "Profile Missing" : "Guest State"}</p><p className="mt-4 text-sm leading-relaxed text-gray-400">{profileError}</p></section> : null}

        {activeProfile ? (
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-[34px] border border-[#201517] bg-[#0d0d0d] shadow-[0_0_80px_rgba(255,183,197,0.06)]">
              <div className="border-b border-[#1b1b1b] bg-[radial-gradient(circle_at_top,rgba(255,183,197,0.16),transparent_55%)] px-8 py-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  {activeProfile.photoURL ? <img src={activeProfile.photoURL} alt={primaryName} className="h-24 w-24 rounded-[28px] border border-[#2c2023] object-cover shadow-[0_0_30px_rgba(255,183,197,0.14)]" /> : <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#2c2023] bg-[#1a1012] text-2xl font-black uppercase text-[#ffb7c5] shadow-[0_0_30px_rgba(255,183,197,0.14)]">{initials}</div>}
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">{isOwner ? "Account Overview" : "Public Profile"}</p>
                    <h1 className="mt-3 truncate text-3xl font-black uppercase tracking-tighter text-white">{primaryName}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-[#2b1b1e] bg-[#1a1012] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ffb7c5]">{activeProfile.login ? `@${activeProfile.login}` : "login pending"}</span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${activeProfile.presence?.isOnline ? "border-[#1f3b2f] bg-[#0d1713] text-[#8ce5b2]" : "border-[#312228] bg-[#140d11] text-[#ffb7c5]"}`}>{activeProfile.presence?.isOnline ? "Online" : "Offline"}</span>
                      {profileRoles.map((role) => <span key={role} style={roleBadgeStyle(role)} className="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">{formatRole(role)}</span>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-8 py-8 sm:grid-cols-2">
                {[
                  ["Profile ID", String(activeProfile.profileId ?? "Not assigned")],
                  ["Login", activeProfile.login ? `@${activeProfile.login}` : "Not assigned"],
                  ["Roles", profileRoles.map(formatRole).join(", ")],
                  ["Account Created", formatTime(activeProfile.creationTime)],
                ].map(([label, value]) => <div key={label} className="rounded-[26px] border border-[#1d1d1d] bg-[#090909] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.32em] text-gray-600">{label}</p><p className="mt-3 break-all text-sm leading-relaxed text-gray-300">{value}</p></div>)}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-[32px] border border-[#201517] bg-[#0d0d0d] px-7 py-7 shadow-[0_0_60px_rgba(255,183,197,0.06)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffb7c5]">Roles</p>
                <div className="mt-5 flex flex-wrap gap-3">{profileRoles.map((role) => <span key={role} style={roleBadgeStyle(role)} className="inline-flex rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]">{formatRole(role)}</span>)}</div>
              </div>

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

            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
