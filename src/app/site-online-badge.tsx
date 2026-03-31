"use client";

import { useEffect, useRef, useState } from "react";
import { AvatarMedia } from "./avatar-media";
import {
  readCachedSiteOnlineUsers,
  writeCachedSiteOnlineUsers,
} from "@/lib/site-online-cache";

type SiteOnlineUser = {
  uid: string | null;
  profileId: number | null;
  displayName: string | null;
  login: string | null;
  photoURL: string | null;
  accentRole?: string | null;
  presence?: {
    lastSeenAt: string | null;
  } | null;
};

type SiteOnlineBridge = {
  getSiteOnlineUsers?: () => Promise<SiteOnlineUser[]>;
};

type SiteOnlineRuntimeWindow = Window & {
  sakuraFirebaseAuth?: SiteOnlineBridge;
  sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraFirebaseAuthError?: string;
};

type SiteOnlineBadgeProps = {
  count: number | null;
  className?: string;
  profileHrefBuilder?: (profileId: number) => string;
  defaultVisible?: boolean;
};

const PRESENCE_DIRTY_EVENT = "sakura-presence-dirty";
const ONLINE_BRIDGE_RETRY_INTERVAL_MS = 250;
const ONLINE_BRIDGE_WAIT_TIMEOUT_MS = 5000;

function buildInitials(user: SiteOnlineUser) {
  const source = user.displayName || user.login || (user.profileId ? `P${user.profileId}` : "U");
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function buildPrimaryLabel(user: SiteOnlineUser) {
  return user.displayName || user.login || (user.profileId ? `Profile #${user.profileId}` : "Unknown user");
}

function buildSecondaryLabel(user: SiteOnlineUser) {
  if (user.login && user.displayName && user.login !== user.displayName) {
    return `@${user.login}`;
  }

  return null;
}

function normalizeRoleName(role: string | null | undefined) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function formatRole(role: string | null | undefined) {
  const normalizedRole = normalizeRoleName(role);

  if (!normalizedRole) {
    return "User";
  }

  return normalizedRole
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function roleTextColor(role: string | null | undefined) {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "root") return "#ff6b57";
  if (normalizedRole === "co-owner") return "#ff8f7a";
  if (normalizedRole === "super administrator") return "#ffb36b";
  if (normalizedRole === "administrator") return "#ffd36b";
  if (normalizedRole === "moderator") return "#7dd3fc";
  if (normalizedRole === "support") return "#67e8f9";
  if (normalizedRole === "sponsor") return "#a78bfa";
  if (normalizedRole === "tester") return "#f3f4f6";
  if (normalizedRole === "banned") return "#ff6b6b";

  return "#ffffff";
}

function roleBadgeStyle(role: string | null | undefined) {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === "root") {
    return {
      borderColor: "rgba(255,107,87,0.75)",
      backgroundColor: "rgba(42,11,12,0.92)",
      color: "#ffe1dc",
      boxShadow: "0 0 18px rgba(255,107,87,0.22)",
    };
  }

  if (normalizedRole === "co-owner") {
    return {
      borderColor: "rgba(255,143,122,0.58)",
      backgroundColor: "rgba(42,16,13,0.92)",
      color: "#ffd9cf",
      boxShadow: "0 0 16px rgba(255,143,122,0.16)",
    };
  }

  if (normalizedRole === "sponsor") {
    return {
      borderColor: "rgba(167,139,250,0.52)",
      backgroundColor: "rgba(20,14,34,0.92)",
      color: "#efe7ff",
      boxShadow: "0 0 16px rgba(167,139,250,0.18)",
    };
  }

  if (normalizedRole === "tester") {
    return {
      borderColor: "rgba(255,255,255,0.18)",
      backgroundColor: "rgba(22,22,24,0.92)",
      color: "#f4f4f5",
      boxShadow: "0 0 16px rgba(255,255,255,0.08)",
    };
  }

  return {
    borderColor: "rgba(58,42,49,0.88)",
    backgroundColor: "rgba(20,13,17,0.92)",
    color: "#ffb7c5",
    boxShadow: "0 0 14px rgba(255,183,197,0.08)",
  };
}

export function SiteOnlineBadge({
  count,
  className = "",
  profileHrefBuilder,
  defaultVisible = false,
}: SiteOnlineBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<SiteOnlineUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isActive = isHovered || isOpen;
  const effectiveCount =
    isOpen && !isLoading && !loadError ? users.length : count;
  const label =
    effectiveCount === null
      ? "Online on site"
      : `${effectiveCount} ${effectiveCount === 1 ? "user" : "users"} online`;

  useEffect(() => {
    setUsers(readCachedSiteOnlineUsers<SiteOnlineUser>());
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    const waitForOnlineBridge = async () => {
      const runtimeWindow = window as SiteOnlineRuntimeWindow;
      const startedAt = Date.now();

      while (!isCancelled && Date.now() - startedAt < ONLINE_BRIDGE_WAIT_TIMEOUT_MS) {
        if (runtimeWindow.sakuraFirebaseAuth?.getSiteOnlineUsers) {
          return runtimeWindow.sakuraFirebaseAuth;
        }

        if (runtimeWindow.sakuraFirebaseAuthError) {
          return null;
        }

        void runtimeWindow.sakuraStartFirebaseAuth?.();
        await new Promise((resolve) => window.setTimeout(resolve, ONLINE_BRIDGE_RETRY_INTERVAL_MS));
      }

      return runtimeWindow.sakuraFirebaseAuth?.getSiteOnlineUsers
        ? runtimeWindow.sakuraFirebaseAuth
        : null;
    };

    const loadUsers = async () => {
      const bridge = await waitForOnlineBridge();

      if (!bridge?.getSiteOnlineUsers) {
        setUsers([]);
        setLoadError("Online user list is unavailable right now.");
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const nextUsers = await bridge.getSiteOnlineUsers();

        if (!isCancelled) {
          const normalizedUsers = Array.isArray(nextUsers) ? nextUsers : [];
          setUsers(normalizedUsers);
          writeCachedSiteOnlineUsers(normalizedUsers);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError("Could not load the online user list.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    const handleRefreshRequest = () => {
      void loadUsers();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        void loadUsers();
      }
    };

    const refreshTimer = window.setInterval(() => {
      void loadUsers();
    }, 10000);

    window.addEventListener(PRESENCE_DIRTY_EVENT, handleRefreshRequest);
    window.addEventListener("pageshow", handleRefreshRequest);
    window.addEventListener("online", handleRefreshRequest);
    window.addEventListener("offline", handleRefreshRequest);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener(PRESENCE_DIRTY_EVENT, handleRefreshRequest);
      window.removeEventListener("pageshow", handleRefreshRequest);
      window.removeEventListener("online", handleRefreshRequest);
      window.removeEventListener("offline", handleRefreshRequest);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen]);

  const isHighlighted = defaultVisible || isActive;

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex items-center ${className}`.trim()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex h-[36px] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
          isHighlighted
            ? "border-[#ffb7c5]/35 bg-[#140d11] text-[#ffe2ea] shadow-[0_0_24px_rgba(255,183,197,0.12)]"
            : "border-transparent bg-transparent text-[#ffe2ea]"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff8fb0] shadow-[0_0_14px_rgba(255,143,176,0.95)]"
        />
        <span className="whitespace-nowrap">{label}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-40 mt-3 w-[min(340px,calc(100vw-2rem))] rounded-[24px] border border-[#2a171c] bg-[#090909]/96 p-3 shadow-[0_0_40px_rgba(255,183,197,0.12)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 border-b border-[#1d1d1d] px-2 pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#ffb7c5]">
                Users Online
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffe2ea]">
              {effectiveCount ?? users.length}
            </span>
          </div>

          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
            {isLoading ? (
              <p className="px-2 py-3 text-sm text-gray-500">Loading online users...</p>
            ) : null}

            {!isLoading && loadError ? (
              <p className="px-2 py-3 text-sm leading-relaxed text-[#ff9aa9]">{loadError}</p>
            ) : null}

            {!isLoading && !loadError && !users.length ? (
              <p className="px-2 py-3 text-sm text-gray-500">No active users are visible right now.</p>
            ) : null}

            {!isLoading && !loadError && users.length ? (
              <div className="flex flex-col gap-2">
                {users.map((user) => {
                  const primaryLabel = buildPrimaryLabel(user);
                  const secondaryLabel = buildSecondaryLabel(user);
                  const accentRole = normalizeRoleName(user.accentRole);
                  const content = (
                    <div className="flex items-center gap-3 rounded-[20px] border border-[#1c1c1c] bg-[#0d0d0d] px-3 py-3 transition hover:border-[#ffb7c5]/35 hover:bg-[#140d11]">
                      {user.photoURL ? (
                        <AvatarMedia
                          src={user.photoURL}
                          alt={primaryLabel}
                          loading="lazy"
                          decoding="async"
                          className="h-11 w-11 shrink-0 rounded-2xl border border-[#2a2022] object-cover shadow-[0_0_18px_rgba(255,183,197,0.08)]"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2a2022] bg-[#1a1012] text-[11px] font-black uppercase text-[#ffb7c5] shadow-[0_0_18px_rgba(255,183,197,0.08)]">
                          {buildInitials(user)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-semibold"
                          style={{ color: roleTextColor(accentRole) }}
                        >
                          {primaryLabel}
                        </p>
                        {secondaryLabel ? (
                          <p className="mt-1 truncate text-xs text-gray-500">{secondaryLabel}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {accentRole ? (
                            <span
                              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                              style={roleBadgeStyle(accentRole)}
                            >
                              {formatRole(accentRole)}
                            </span>
                          ) : null}
                          {typeof user.profileId === "number" ? (
                            <span className="inline-flex items-center rounded-full border border-[#3a2a31] bg-[#140d11] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb7c5]">
                              ID: {user.profileId}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.18em] text-[#ffb7c5]">
                        Online
                      </span>
                    </div>
                  );

                  if (user.profileId && profileHrefBuilder) {
                    return (
                      <a
                        key={user.uid ?? `profile-${user.profileId}`}
                        href={profileHrefBuilder(user.profileId)}
                        onClick={() => setIsOpen(false)}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <div key={user.uid ?? primaryLabel}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
