type FirebasePresenceRuntimeContext = {
  auth: any;
  db: any;
  usersCollection: any;
  userRefFor: (uid: string) => any;
  getDoc: (ref: any) => Promise<any>;
  setDoc: (ref: any, data: any, options?: any) => Promise<any>;
  getDocs: (query: any) => Promise<any>;
  query: (...args: any[]) => any;
  collection: (...args: any[]) => any;
  where: (...args: any[]) => any;
  createFirebaseError: (code: string, message: string) => Error & { code?: string };
  isPermissionDeniedError: (error: unknown) => boolean;
  buildFallbackUserDetails: (user: any, options?: Record<string, unknown>) => any;
  normalizeVisitHistory: (value: unknown) => any[];
  buildVisitHistory: (previousVisits: any[], nextVisit: any) => any[];
  toUserSnapshot: (user: any, details: any) => any;
  toStoredUserSnapshot: (uid: string, details: any) => any;
  normalizePresence: (value: unknown, fallbackPath?: string | null) => any;
  isPresenceFreshOnline: (presence: unknown) => boolean;
  pickCommentAccentRole: (roles: unknown[]) => string | null;
  publishUserSnapshot: (snapshot: any) => any;
  constants: {
    onlineUsersRuntimeCacheTtlMs: number;
    presenceHeartbeatIntervalMs: number;
    presenceVisitRecordCooldownMs: number;
    presenceTabRegistryStorageKey: string;
    presenceTabRegistryMaxAgeMs: number;
  };
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseRestUrl = supabaseUrl ? supabaseUrl.replace(/\/+$/, "") + "/rest/v1" : "";
const supabaseReadsEnabled = Boolean(supabaseRestUrl && supabaseAnonKey);

export const createFirebasePresenceRuntime = (context: FirebasePresenceRuntimeContext) => {
  const {
    auth,
    db,
    usersCollection,
    userRefFor,
    getDoc,
    setDoc,
    getDocs,
    query,
    collection,
    where,
    createFirebaseError,
    isPermissionDeniedError,
    buildFallbackUserDetails,
    normalizeVisitHistory,
    buildVisitHistory,
    toUserSnapshot,
    toStoredUserSnapshot,
    normalizePresence,
    isPresenceFreshOnline,
    pickCommentAccentRole,
    publishUserSnapshot,
    constants,
  } = context;

  const {
    onlineUsersRuntimeCacheTtlMs,
    presenceHeartbeatIntervalMs,
    presenceVisitRecordCooldownMs,
    presenceTabRegistryStorageKey,
    presenceTabRegistryMaxAgeMs,
  } = constants;

  const currentPresenceTabId =
    "presence-tab-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
  const siteOnlineUsersRuntimeCache = new Map<string, CacheEntry<any>>();
  const pendingOnlineUsersLookups = new Map<string, Promise<any>>();
  let lastPresenceSignature = "";
  let lastPresenceAt = 0;
  let stopPresenceTrackingInternal = () => {};

  const normalizeSupabaseInteger = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : null;
    }

    return null;
  };

  const buildSupabaseRestUrl = (table: string, query: Record<string, unknown> = {}) => {
    const url = new URL(supabaseRestUrl + "/" + table);

    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });

    return url.toString();
  };

  const fetchSupabaseRows = async (table: string, query: Record<string, unknown> = {}) => {
    if (!supabaseReadsEnabled) {
      return null;
    }

    try {
      const response = await fetch(buildSupabaseRestUrl(table, query), {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: "Bearer " + supabaseAnonKey,
          "Accept-Profile": "public",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return Array.isArray(payload) ? payload : null;
    } catch {
      return null;
    }
  };

  const readPresenceTabRegistry = () => {
    try {
      const rawValue = window.localStorage?.getItem(presenceTabRegistryStorageKey);

      if (!rawValue) {
        return {};
      }

      const parsedValue = JSON.parse(rawValue);

      return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
    } catch {
      return {};
    }
  };

  const writePresenceTabRegistry = (registry: Record<string, unknown>) => {
    try {
      window.localStorage?.setItem(presenceTabRegistryStorageKey, JSON.stringify(registry));
    } catch {}
  };

  const prunePresenceTabRegistry = (registry: Record<string, any>) => {
    const now = Date.now();
    const nextRegistry: Record<string, any> = {};

    Object.entries(registry || {}).forEach(([key, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const timestamp =
        typeof value.timestamp === "number" && Number.isFinite(value.timestamp)
          ? value.timestamp
          : Number.NaN;

      if (!Number.isFinite(timestamp) || now - timestamp > presenceTabRegistryMaxAgeMs) {
        return;
      }

      nextRegistry[key] = {
        uid: typeof value.uid === "string" && value.uid ? value.uid : null,
        visible: value.visible !== false,
        path: typeof value.path === "string" && value.path ? value.path : null,
        timestamp,
      };
    });

    return nextRegistry;
  };

  const updatePresenceTabRegistry = (uid: string | null, visible: boolean, path: string | null) => {
    const nextRegistry = prunePresenceTabRegistry(readPresenceTabRegistry());

    nextRegistry[currentPresenceTabId] = {
      uid: typeof uid === "string" && uid ? uid : null,
      visible: visible !== false,
      path: typeof path === "string" && path ? path : null,
      timestamp: Date.now(),
    };

    writePresenceTabRegistry(nextRegistry);
    return nextRegistry;
  };

  const clearPresenceTabRegistryEntry = () => {
    const nextRegistry = prunePresenceTabRegistry(readPresenceTabRegistry());

    if (currentPresenceTabId in nextRegistry) {
      delete nextRegistry[currentPresenceTabId];
      writePresenceTabRegistry(nextRegistry);
    }
  };

  const hasFreshVisiblePresenceTabForUid = (uid: string | null) => {
    if (typeof uid !== "string" || !uid) {
      return false;
    }

    const nextRegistry = prunePresenceTabRegistry(readPresenceTabRegistry());

    return Object.values(nextRegistry).some(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        entry.uid === uid &&
        entry.visible === true
    );
  };

  const invalidateSiteOnlineUsersCache = () => {
    siteOnlineUsersRuntimeCache.delete("all");
  };

  const stopPresenceTracking = () => {
    stopPresenceTrackingInternal();
    stopPresenceTrackingInternal = () => {};
  };

  const readCacheEntry = <T,>(key: string) => {
    const cachedEntry = siteOnlineUsersRuntimeCache.get(key);

    if (!cachedEntry || cachedEntry.expiresAt <= Date.now()) {
      siteOnlineUsersRuntimeCache.delete(key);
      return null;
    }

    return cachedEntry.value as T;
  };

  const writeCacheEntry = <T,>(key: string, value: T) => {
    siteOnlineUsersRuntimeCache.set(key, {
      value,
      expiresAt: Date.now() + onlineUsersRuntimeCacheTtlMs,
    });

    return value;
  };

  const runCachedOnlineUsersLookup = async <T,>(loader: () => Promise<T>) => {
    const cachedValue = readCacheEntry<T>("all");

    if (cachedValue) {
      return cachedValue;
    }

    if (pendingOnlineUsersLookups.has("all")) {
      return pendingOnlineUsersLookups.get("all") as Promise<T>;
    }

    const pendingLookup = loader()
      .then((value) => {
        pendingOnlineUsersLookups.delete("all");
        return writeCacheEntry("all", value);
      })
      .catch((error) => {
        pendingOnlineUsersLookups.delete("all");
        throw error;
      });

    pendingOnlineUsersLookups.set("all", pendingLookup);
    return pendingLookup;
  };

  const compareOnlineUsers = (left: any, right: any) => {
    const leftSeenAt =
      left?.presence?.lastSeenAt ? Date.parse(left.presence.lastSeenAt) : Number.NaN;
    const rightSeenAt =
      right?.presence?.lastSeenAt ? Date.parse(right.presence.lastSeenAt) : Number.NaN;

    if (Number.isFinite(leftSeenAt) && Number.isFinite(rightSeenAt) && leftSeenAt !== rightSeenAt) {
      return rightSeenAt - leftSeenAt;
    }

    const leftLabel =
      (typeof left?.displayName === "string" && left.displayName.trim()) ||
      (typeof left?.login === "string" && left.login.trim()) ||
      "";
    const rightLabel =
      (typeof right?.displayName === "string" && right.displayName.trim()) ||
      (typeof right?.login === "string" && right.login.trim()) ||
      "";

    return leftLabel.localeCompare(rightLabel);
  };

  const getFreshOnlineUsers = async () => {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("presence.status", "==", "online"))
      );
      const onlineUsers: any[] = [];
      const countedUserIds = new Set<string>();

      usersSnapshot.forEach((userDoc: any) => {
        const details = userDoc.data();

        if (details?.isBanned === true) {
          return;
        }

        if (isPresenceFreshOnline(details?.presence)) {
          countedUserIds.add(userDoc.id);
          onlineUsers.push(toStoredUserSnapshot(userDoc.id, details));
        }
      });

      const currentUser = auth.currentUser;
      const currentSnapshot = (window as any).sakuraCurrentUserSnapshot;
      const localCurrentUid =
        currentUser && !currentUser.isAnonymous
          ? currentUser.uid
          : currentSnapshot?.uid ?? null;
      const localSessionLooksOnline =
        Boolean(localCurrentUid) &&
        Boolean(navigator.onLine) &&
        hasFreshVisiblePresenceTabForUid(localCurrentUid);
      const localPresenceLooksOnline =
        isPresenceFreshOnline(currentSnapshot?.presence) || localSessionLooksOnline;

      if (
        localCurrentUid &&
        localPresenceLooksOnline &&
        currentSnapshot?.isBanned !== true &&
        !countedUserIds.has(localCurrentUid)
      ) {
        onlineUsers.push({
          uid: currentSnapshot?.uid ?? localCurrentUid,
          isAnonymous: false,
          email: currentSnapshot?.email ?? null,
          emailVerified: currentSnapshot?.emailVerified ?? null,
          login: currentSnapshot?.login ?? null,
          displayName:
            typeof currentSnapshot?.displayName === "string"
              ? currentSnapshot.displayName
              : typeof currentSnapshot?.login === "string"
                ? currentSnapshot.login
                : null,
          profileId:
            typeof currentSnapshot?.profileId === "number"
              ? currentSnapshot.profileId
              : null,
          photoURL: currentSnapshot?.photoURL ?? null,
          roles: Array.isArray(currentSnapshot?.roles) ? currentSnapshot.roles : [],
          isBanned: currentSnapshot?.isBanned === true,
          bannedAt: currentSnapshot?.bannedAt ?? null,
          verificationRequired: currentSnapshot?.verificationRequired ?? false,
          providerIds: Array.isArray(currentSnapshot?.providerIds)
            ? currentSnapshot.providerIds
            : [],
          creationTime: currentSnapshot?.creationTime ?? null,
          lastSignInTime: currentSnapshot?.lastSignInTime ?? null,
          loginHistory: Array.isArray(currentSnapshot?.loginHistory)
            ? currentSnapshot.loginHistory
            : [],
          visitHistory: Array.isArray(currentSnapshot?.visitHistory)
            ? currentSnapshot.visitHistory
            : [],
          presence: normalizePresence(currentSnapshot?.presence, window.location.pathname),
        });
      }

      return onlineUsers.sort(compareOnlineUsers);
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        throw error;
      }

      const presenceRows = await fetchSupabaseRows("public_profile_presence", {
        select: "profile_id,last_seen_at",
        status: "eq.online",
        is_online: "eq.true",
        order: "last_seen_at.desc",
        limit: 100,
      });

      if (Array.isArray(presenceRows) && presenceRows.length) {
        const profileIds = presenceRows
          .map((row) => normalizeSupabaseInteger((row as any)?.profile_id))
          .filter((profileId): profileId is number => typeof profileId === "number" && profileId > 0);

        if (profileIds.length) {
          const profileRows = await fetchSupabaseRows("public_profiles", {
            select: "profile_id,firebase_uid,display_name,login,photo_url,roles,is_banned",
            profile_id: `in.(${profileIds.join(",")})`,
          });

          if (Array.isArray(profileRows)) {
            const profileById = new Map<number, any>();

            profileRows.forEach((row) => {
              const profileId = normalizeSupabaseInteger((row as any)?.profile_id);

              if (typeof profileId === "number" && profileId > 0) {
                profileById.set(profileId, row);
              }
            });

            return presenceRows
              .map((presenceRow) => {
                const profileId = normalizeSupabaseInteger((presenceRow as any)?.profile_id);

                if (typeof profileId !== "number" || profileId <= 0) {
                  return null;
                }

                const profileRow = profileById.get(profileId);

                if (!profileRow || profileRow.is_banned === true) {
                  return null;
                }

                return {
                  uid:
                    typeof profileRow.firebase_uid === "string" ? profileRow.firebase_uid : null,
                  profileId,
                  displayName:
                    typeof profileRow.display_name === "string"
                      ? profileRow.display_name
                      : null,
                  login:
                    typeof profileRow.login === "string" ? profileRow.login : null,
                  photoURL:
                    typeof profileRow.photo_url === "string"
                      ? profileRow.photo_url
                      : null,
                  accentRole: pickCommentAccentRole(
                    Array.isArray(profileRow.roles) ? profileRow.roles : []
                  ) ?? null,
                  presence: {
                    lastSeenAt:
                      typeof (presenceRow as any)?.last_seen_at === "string"
                        ? (presenceRow as any).last_seen_at
                        : null,
                  },
                };
              })
              .filter(Boolean) as any[];
          }
        }
      }

      throw createFirebaseError(
        "presence/read-denied",
        "Online presence could not be loaded. Check Firestore read rules for users."
      );
    }
  };

  const getCachedSiteOnlineUsers = async () =>
    runCachedOnlineUsersLookup(async () => {
      const onlineUsers = await getFreshOnlineUsers();

      return onlineUsers.map((snapshot: any) => ({
        uid: snapshot?.uid ?? null,
        profileId: typeof snapshot?.profileId === "number" ? snapshot.profileId : null,
        displayName: typeof snapshot?.displayName === "string" ? snapshot.displayName : null,
        login: typeof snapshot?.login === "string" ? snapshot.login : null,
        photoURL: typeof snapshot?.photoURL === "string" ? snapshot.photoURL : null,
        accentRole: pickCommentAccentRole(snapshot?.roles ?? []) ?? null,
        presence: snapshot?.presence
          ? {
              lastSeenAt:
                typeof snapshot.presence.lastSeenAt === "string"
                  ? snapshot.presence.lastSeenAt
                  : null,
            }
          : null,
      }));
    });

  const syncPresence = async (user: any, options: Record<string, any> = {}) => {
    try {
      const userRef = userRefFor(user.uid);
      const userSnapshot = await getDoc(userRef);
      const existingData = userSnapshot.exists() ? userSnapshot.data() : {};
      const nowIso = new Date().toISOString();
      const currentPath =
        typeof options.path === "string" && options.path
          ? options.path
          : window.location.pathname;
      const forcedVisibility =
        options.visibility === "hidden"
          ? false
          : options.visibility === "visible"
            ? true
            : typeof document === "undefined" || document.visibilityState !== "hidden";
      const isVisible = forcedVisibility;

      updatePresenceTabRegistry(user.uid, isVisible, currentPath);

      const resolvedOnline =
        Boolean(navigator.onLine) && hasFreshVisiblePresenceTabForUid(user.uid);
      const status = resolvedOnline ? "online" : "offline";
      const source = typeof options.source === "string" ? options.source : "activity";
      const signature = status + "|" + currentPath + "|" + source;
      const previousVisits = normalizeVisitHistory(existingData?.visitHistory);
      const lastVisit = previousVisits[0] ?? null;
      const shouldRecordVisit =
        Boolean(options.forceVisit) ||
        !lastVisit ||
        lastVisit.path !== currentPath ||
        lastVisit.status !== status ||
        Date.now() - lastPresenceAt > presenceVisitRecordCooldownMs ||
        lastPresenceSignature !== signature;
      const presence = {
        status: resolvedOnline ? "online" : "offline",
        isOnline: resolvedOnline,
        currentPath,
        lastSeenAt: nowIso,
      };
      const visitHistory = shouldRecordVisit
        ? buildVisitHistory(previousVisits, {
            timestamp: nowIso,
            path: currentPath,
            source,
            status,
          })
        : previousVisits;

      lastPresenceSignature = signature;
      lastPresenceAt = Date.now();

      await setDoc(
        userRef,
        {
          presence,
          visitHistory,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      invalidateSiteOnlineUsersCache();
      window.dispatchEvent(new CustomEvent("sakura-presence-dirty"));
      return publishUserSnapshot(toUserSnapshot(user, { ...existingData, visitHistory, presence }));
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        throw error;
      }

      const currentSnapshot = (window as any).sakuraCurrentUserSnapshot;
      const fallbackDetails = currentSnapshot
        ? {
            login: currentSnapshot.login,
            displayName: currentSnapshot.displayName,
            profileId: currentSnapshot.profileId,
            photoURL: currentSnapshot.photoURL,
            roles: currentSnapshot.roles,
            providerIds: currentSnapshot.providerIds,
            loginHistory: currentSnapshot.loginHistory,
            visitHistory: currentSnapshot.visitHistory,
            presence: currentSnapshot.presence,
          }
        : buildFallbackUserDetails(user, options);

      return publishUserSnapshot(toUserSnapshot(user, fallbackDetails));
    }
  };

  const startPresenceTracking = (user: any) => {
    stopPresenceTracking();

    const syncCurrentPresence = (source: string, forceVisit = false, visibility?: "visible" | "hidden") =>
      syncPresence(user, {
        path: window.location.pathname,
        source,
        forceVisit,
        visibility,
      }).catch((error) => {
        console.error("Failed to sync presence:", error);
      });

    const handleOnline = () => {
      void syncCurrentPresence("network-online", true);
    };

    const handleOffline = () => {
      void syncCurrentPresence("network-offline", true);
    };

    const handleVisibilityChange = () => {
      void syncCurrentPresence(
        document.visibilityState === "hidden" ? "tab-hidden" : "tab-visible",
        true,
        document.visibilityState === "hidden" ? "hidden" : "visible"
      );
    };

    const handlePageShow = () => {
      void syncCurrentPresence("page-show", true, "visible");
    };

    const handlePageHide = () => {
      void syncCurrentPresence("page-hide", true, "hidden");
    };

    const handleBeforeUnload = () => {
      void syncCurrentPresence("before-unload", true, "hidden");
    };

    const intervalId = window.setInterval(() => {
      void syncCurrentPresence("heartbeat");
    }, presenceHeartbeatIntervalMs);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    stopPresenceTrackingInternal = () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearPresenceTabRegistryEntry();
      invalidateSiteOnlineUsersCache();
      window.dispatchEvent(new CustomEvent("sakura-presence-dirty"));
    };

    void syncCurrentPresence("session-start", true);

    return stopPresenceTrackingInternal;
  };

  const getSiteOnlineCount = async () => {
    const onlineUsers = await getCachedSiteOnlineUsers();
    return onlineUsers.length;
  };

  const getSiteOnlineUsers = async () => getCachedSiteOnlineUsers();

  return {
    invalidateSiteOnlineUsersCache,
    syncPresence,
    startPresenceTracking,
    stopPresenceTracking,
    getSiteOnlineCount,
    getSiteOnlineUsers,
  };
};
