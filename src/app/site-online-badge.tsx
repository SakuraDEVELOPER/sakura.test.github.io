"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AvatarMedia } from "./avatar-media";

type SiteOnlineUser = {
  uid: string | null;
  profileId: number | null;
  displayName: string | null;
  login: string | null;
  photoURL: string | null;
  presence?: {
    lastSeenAt: string | null;
  } | null;
};

type SiteOnlineBridge = {
  getSiteOnlineUsers?: () => Promise<SiteOnlineUser[]>;
};

type SiteOnlineBadgeProps = {
  count: number | null;
  className?: string;
  profileHrefBuilder?: (profileId: number) => string;
};

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

  if (user.profileId) {
    return `Profile #${user.profileId}`;
  }

  return null;
}

export function SiteOnlineBadge({
  count,
  className = "",
  profileHrefBuilder,
}: SiteOnlineBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<SiteOnlineUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isActive = isHovered || isOpen;
  const label =
    count === null ? "Online on site" : `${count} ${count === 1 ? "user" : "users"} online`;

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

    const loadUsers = async () => {
      const runtimeWindow = window as Window & { sakuraFirebaseAuth?: SiteOnlineBridge };

      if (!runtimeWindow.sakuraFirebaseAuth?.getSiteOnlineUsers) {
        setUsers([]);
        setLoadError("Online user list is unavailable right now.");
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const nextUsers = await runtimeWindow.sakuraFirebaseAuth.getSiteOnlineUsers();

        if (!isCancelled) {
          setUsers(Array.isArray(nextUsers) ? nextUsers : []);
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

    const refreshTimer = window.setInterval(() => {
      void loadUsers();
    }, 45000);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [isOpen]);

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
          isActive
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
              <p className="mt-1 text-xs text-gray-500">Click any profile to open it.</p>
            </div>
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffe2ea]">
              {count ?? users.length}
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
                        <p className="truncate text-sm font-semibold text-white">{primaryLabel}</p>
                        {secondaryLabel ? (
                          <p className="mt-1 truncate text-xs text-gray-500">{secondaryLabel}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.18em] text-[#ffb7c5]">
                        Online
                      </span>
                    </div>
                  );

                  if (user.profileId && profileHrefBuilder) {
                    return (
                      <Link key={user.uid ?? `profile-${user.profileId}`} href={profileHrefBuilder(user.profileId)}>
                        {content}
                      </Link>
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
