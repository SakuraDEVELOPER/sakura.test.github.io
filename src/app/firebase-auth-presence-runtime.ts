type PresenceStatus = "online" | "offline";
type FirestoreDatabase = unknown;
type FirestoreReference = unknown;
type FirestoreQuery = unknown;
type FirestoreSetOptions = Record<string, unknown>;
type SupabaseRow = Record<string, unknown>;

type FirebaseUserLike = {
  uid: string;
  isAnonymous: boolean;
  getIdToken?: () => Promise<string>;
  stsTokenManager?: {
    accessToken?: string | null;
  } | null;
};

type VisitHistoryEntry = {
  timestamp: string;
  path: string;
  source: string;
  status: PresenceStatus;
  [key: string]: unknown;
};

type PresenceSnapshot = {
  status?: PresenceStatus;
  isOnline?: boolean;
  currentPath?: string | null;
  lastSeenAt?: string | null;
  [key: string]: unknown;
};

type RuntimeUserDetails = Record<string, unknown> & {
  uid?: string | null;
  isAnonymous?: boolean;
  email?: string | null;
  emailVerified?: boolean | null;
  login?: string | null;
  displayName?: string | null;
  profileId?: number | null;
  photoURL?: string | null;
  roles?: unknown[];
  accentRole?: string | null;
  isBanned?: boolean;
  bannedAt?: string | null;
  verificationRequired?: boolean;
  providerIds?: string[];
  creationTime?: string | null;
  lastSignInTime?: string | null;
  loginHistory?: string[];
  visitHistory?: VisitHistoryEntry[];
  presence?: PresenceSnapshot | null;
};

type RuntimeUserSnapshot = RuntimeUserDetails;

type FirestoreDocumentSnapshot<TData extends RuntimeUserDetails = RuntimeUserDetails> = {
  exists: () => boolean;
  data: () => TData;
};

type FirestoreQueryDocumentSnapshot<TData extends RuntimeUserDetails = RuntimeUserDetails> = {
  id: string;
  data: () => TData;
};

type FirestoreQuerySnapshot<TData extends RuntimeUserDetails = RuntimeUserDetails> = {
  forEach: (callback: (doc: FirestoreQueryDocumentSnapshot<TData>) => void) => void;
};

type PresenceTabEntry = {
  uid: string | null;
  visible: boolean;
  path: string | null;
  timestamp: number;
};

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

type PresenceSyncOptions = Record<string, unknown> & {
  path?: string;
  source?: string;
  forceVisit?: boolean;
  visibility?: "visible" | "hidden";
  transport?: "default" | "keepalive-only";
};

type SupabaseAuthSessionLike = {
  access_token?: string | null;
};

type SupabaseAuthBridgeLike = {
  getSession?: () => Promise<SupabaseAuthSessionLike | null>;
};

type PresenceRuntimeWindow = Window & {
  sakuraSupabaseAuth?: SupabaseAuthBridgeLike;
  sakuraStartSupabaseAuth?: () => Promise<unknown> | unknown;
  sakuraSupabaseCurrentSession?: SupabaseAuthSessionLike | null;
  sakuraCurrentUserSnapshot?: RuntimeUserSnapshot | null;
};

type SupabasePresenceRow = SupabaseRow & {
  profile_id?: unknown;
  last_seen_at?: unknown;
};

type SupabaseProfileRow = SupabaseRow & {
  profile_id?: unknown;
  firebase_uid?: unknown;
  display_name?: unknown;
  login?: unknown;
  photo_url?: unknown;
  roles?: unknown;
  is_banned?: unknown;
};

type SupabasePresenceRpcResponse = SupabaseRow & {
  presence?: unknown;
  visitHistory?: unknown;
  firebaseUid?: string;
  authUserId?: string;
};

type FirebasePresenceRuntimeContext = {
  auth: {
    currentUser: FirebaseUserLike | null;
  };
  db: FirestoreDatabase;
  usersCollection: FirestoreReference;
  userRefFor: (uid: string) => FirestoreReference;
  getDoc: (ref: FirestoreReference) => Promise<FirestoreDocumentSnapshot>;
  setDoc: (
    ref: FirestoreReference,
    data: RuntimeUserDetails,
    options?: FirestoreSetOptions,
  ) => Promise<unknown>;
  getDocs: (query: FirestoreQuery) => Promise<FirestoreQuerySnapshot>;
  query: (...args: unknown[]) => FirestoreQuery;
  collection: (...args: unknown[]) => FirestoreReference;
  where: (...args: unknown[]) => unknown;
  createFirebaseError: (code: string, message: string) => Error & { code?: string };
  isPermissionDeniedError: (error: unknown) => boolean;
  buildFallbackUserDetails: (
    user: FirebaseUserLike | null,
    options?: PresenceSyncOptions,
  ) => RuntimeUserDetails;
  normalizeVisitHistory: (value: unknown) => VisitHistoryEntry[];
  buildVisitHistory: (
    previousVisits: VisitHistoryEntry[],
    nextVisit: VisitHistoryEntry,
  ) => VisitHistoryEntry[];
  toUserSnapshot: (user: FirebaseUserLike, details: RuntimeUserDetails) => RuntimeUserSnapshot;
  toStoredUserSnapshot: (uid: string, details: RuntimeUserDetails) => RuntimeUserSnapshot;
  normalizePresence: (value: unknown, fallbackPath?: string | null) => PresenceSnapshot;
  isPresenceFreshOnline: (presence: unknown) => boolean;
  pickCommentAccentRole: (roles: unknown[]) => string | null;
  publishUserSnapshot: (snapshot: RuntimeUserSnapshot | null) => RuntimeUserSnapshot | null;
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
const supabaseLiveSyncEnabled = (process.env.NEXT_PUBLIC_SUPABASE_LIVE_SYNC_ENABLED ?? "") === "true";
const supabaseSyncFunctionUrl = (() => {
  const explicitUrl = process.env.NEXT_PUBLIC_SUPABASE_SYNC_FUNCTION_URL ?? "";

  if (explicitUrl) {
    return explicitUrl;
  }

  if (!supabaseUrl) {
    return "";
  }

  try {
    const baseUrl = new URL(supabaseUrl);
    const baseSuffix = ".supabase.co";
    const nextHost = baseUrl.host.endsWith(baseSuffix)
      ? baseUrl.host.slice(0, baseUrl.host.length - baseSuffix.length) + ".functions.supabase.co"
      : baseUrl.host;

    return `${baseUrl.protocol}//${nextHost}/firebase-sync`;
  } catch {
    return "";
  }
})();
const supabaseLiveSyncActive = Boolean(supabaseLiveSyncEnabled && supabaseSyncFunctionUrl);
const readCurrentLocationPath = () => `${window.location.pathname}${window.location.search}`;
const getRuntimeWindow = () => window as PresenceRuntimeWindow;

export const createFirebasePresenceRuntime = (context: FirebasePresenceRuntimeContext) => {
  const {
    auth,
    db,
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
  const siteOnlineUsersRuntimeCache = new Map<string, CacheEntry<SiteOnlineUser[]>>();
  const pendingOnlineUsersLookups = new Map<string, Promise<SiteOnlineUser[]>>();
  let lastPresenceSignature = "";
  let lastPresenceAt = 0;
  let lastSupabaseAccessToken: string | null = null;
  let lastFirebaseIdToken: string | null = null;
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
  const buildSupabaseRpcUrl = (functionName: string) => supabaseRestUrl + "/rpc/" + functionName;

  const fetchSupabaseRows = async <TRow extends SupabaseRow>(
    table: string,
    query: Record<string, unknown> = {},
  ) => {
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
      return Array.isArray(payload) ? (payload as TRow[]) : null;
    } catch {
      return null;
    }
  };

  const getSupabaseBridgeAccessToken = async () => {
    try {
      const runtimeWindow = getRuntimeWindow();
      const currentSessionAccessToken =
        typeof runtimeWindow.sakuraSupabaseCurrentSession?.access_token === "string" &&
        runtimeWindow.sakuraSupabaseCurrentSession.access_token
          ? runtimeWindow.sakuraSupabaseCurrentSession.access_token
          : null;

      if (currentSessionAccessToken) {
        lastSupabaseAccessToken = currentSessionAccessToken;
        return currentSessionAccessToken;
      }

      if (!runtimeWindow.sakuraSupabaseAuth && typeof runtimeWindow.sakuraStartSupabaseAuth === "function") {
        await runtimeWindow.sakuraStartSupabaseAuth();
      }

      if (
        typeof runtimeWindow.sakuraSupabaseCurrentSession?.access_token === "string" &&
        runtimeWindow.sakuraSupabaseCurrentSession.access_token
      ) {
        lastSupabaseAccessToken = runtimeWindow.sakuraSupabaseCurrentSession.access_token;
        return runtimeWindow.sakuraSupabaseCurrentSession.access_token;
      }

      if (runtimeWindow.sakuraSupabaseAuth?.getSession) {
        const session = await runtimeWindow.sakuraSupabaseAuth.getSession();
        if (typeof session?.access_token === "string" && session.access_token) {
          lastSupabaseAccessToken = session.access_token;
          return session.access_token;
        }

        return null;
      }
    } catch {}

    return null;
  };
  const getCachedSupabaseBridgeAccessToken = () => {
    const runtimeWindow = getRuntimeWindow();
    const currentSessionAccessToken =
      typeof runtimeWindow.sakuraSupabaseCurrentSession?.access_token === "string" &&
      runtimeWindow.sakuraSupabaseCurrentSession.access_token
        ? runtimeWindow.sakuraSupabaseCurrentSession.access_token
        : null;

    if (currentSessionAccessToken) {
      lastSupabaseAccessToken = currentSessionAccessToken;
      return currentSessionAccessToken;
    }

    return lastSupabaseAccessToken;
  };

  const callSupabasePresenceRpc = async <TResponse extends SupabaseRow>(
    functionName: string,
    payload: Record<string, unknown>,
    options: { cachedOnly?: boolean } = {},
  ) => {
    if (!supabaseReadsEnabled) {
      return null;
    }

    const accessToken = options.cachedOnly
      ? getCachedSupabaseBridgeAccessToken()
      : await getSupabaseBridgeAccessToken();

    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch(buildSupabaseRpcUrl(functionName), {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: "Bearer " + accessToken,
          "Accept-Profile": "public",
          "Content-Profile": "public",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json().catch(() => null)) as TResponse | null;
    } catch {
      return null;
    }
  };

  const getSupabaseSyncToken = async (user: FirebaseUserLike | null) => {
    if (!user || typeof user.getIdToken !== "function") {
      return null;
    }

    try {
      const idToken = await user.getIdToken();
      lastFirebaseIdToken = idToken;
      return idToken;
    } catch {
      return null;
    }
  };
  const getCachedSupabaseSyncToken = (user: FirebaseUserLike | null) => {
    const cachedUserToken =
      typeof user?.stsTokenManager?.accessToken === "string" && user.stsTokenManager.accessToken
        ? user.stsTokenManager.accessToken
        : null;

    if (cachedUserToken) {
      lastFirebaseIdToken = cachedUserToken;
      return cachedUserToken;
    }

    return lastFirebaseIdToken;
  };

  const syncSupabasePresenceRecord = async (
    user: FirebaseUserLike | null,
    presencePayload: Record<string, unknown>,
  ) => {
    if (!supabaseLiveSyncActive) {
      return false;
    }

    const idToken = await getSupabaseSyncToken(user);

    if (!idToken) {
      return false;
    }

    try {
      const response = await fetch(supabaseSyncFunctionUrl, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "upsert_presence",
          presence: presencePayload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(
          "Failed to sync presence to Supabase:",
          response.status,
          errorText
        );
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error("Failed to sync presence to Supabase:", error);
      return false;
    }
  };
  const queueSupabasePresenceRpcKeepalive = (payload: Record<string, unknown>) => {
    if (!supabaseReadsEnabled) {
      return false;
    }

    const accessToken = getCachedSupabaseBridgeAccessToken();

    if (!accessToken) {
      return false;
    }

    try {
      void fetch(buildSupabaseRpcUrl("sync_current_profile_presence_rpc"), {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: "Bearer " + accessToken,
          "Accept-Profile": "public",
          "Content-Profile": "public",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(() => null);

      return true;
    } catch {
      return false;
    }
  };
  const queueSupabasePresenceFunctionKeepalive = (
    user: FirebaseUserLike | null,
    presencePayload: Record<string, unknown>,
  ) => {
    if (!supabaseLiveSyncActive) {
      return false;
    }

    const idToken = getCachedSupabaseSyncToken(user);

    if (!idToken) {
      return false;
    }

    try {
      void fetch(supabaseSyncFunctionUrl, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "upsert_presence",
          presence: presencePayload,
        }),
      }).catch(() => null);

      return true;
    } catch {
      return false;
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

  const prunePresenceTabRegistry = (registry: Record<string, unknown>) => {
    const now = Date.now();
    const nextRegistry: Record<string, PresenceTabEntry> = {};

    Object.entries(registry || {}).forEach(([key, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const entry = value as Partial<PresenceTabEntry>;

      const timestamp =
        typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)
          ? entry.timestamp
          : Number.NaN;

      if (!Number.isFinite(timestamp) || now - timestamp > presenceTabRegistryMaxAgeMs) {
        return;
      }

      nextRegistry[key] = {
        uid: typeof entry.uid === "string" && entry.uid ? entry.uid : null,
        visible: entry.visible !== false,
        path: typeof entry.path === "string" && entry.path ? entry.path : null,
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
  const dispatchPresenceDirty = () => {
    invalidateSiteOnlineUsersCache();
    window.dispatchEvent(new CustomEvent("sakura-presence-dirty"));
  };

  const stopPresenceTracking = () => {
    stopPresenceTrackingInternal();
    stopPresenceTrackingInternal = () => {};
  };

  const readCacheEntry = (key: string) => {
    const cachedEntry = siteOnlineUsersRuntimeCache.get(key);

    if (!cachedEntry || cachedEntry.expiresAt <= Date.now()) {
      siteOnlineUsersRuntimeCache.delete(key);
      return null;
    }

    return cachedEntry.value;
  };

  const writeCacheEntry = (key: string, value: SiteOnlineUser[]) => {
    siteOnlineUsersRuntimeCache.set(key, {
      value,
      expiresAt: Date.now() + onlineUsersRuntimeCacheTtlMs,
    });

    return value;
  };

  const runCachedOnlineUsersLookup = async (loader: () => Promise<SiteOnlineUser[]>) => {
    const cachedValue = readCacheEntry("all");

    if (cachedValue) {
      return cachedValue;
    }

    if (pendingOnlineUsersLookups.has("all")) {
      return pendingOnlineUsersLookups.get("all") ?? loader();
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

  const compareOnlineUsers = (
    left: Pick<RuntimeUserSnapshot, "presence" | "displayName" | "login">,
    right: Pick<RuntimeUserSnapshot, "presence" | "displayName" | "login">,
  ) => {
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
    if (supabaseReadsEnabled) {
      const presenceRows = await fetchSupabaseRows<SupabasePresenceRow>("public_profile_presence", {
        select: "profile_id,last_seen_at",
        status: "eq.online",
        is_online: "eq.true",
        order: "last_seen_at.desc",
        limit: 100,
      });

      if (Array.isArray(presenceRows) && presenceRows.length) {
        const profileIds = presenceRows
          .map((row) => normalizeSupabaseInteger(row.profile_id))
          .filter((profileId): profileId is number => typeof profileId === "number" && profileId > 0);

        if (profileIds.length) {
          const profileRows = await fetchSupabaseRows<SupabaseProfileRow>("public_profiles", {
            select: "profile_id,firebase_uid,display_name,login,photo_url,roles,is_banned",
            profile_id: `in.(${profileIds.join(",")})`,
          });

          if (Array.isArray(profileRows)) {
            const profileById = new Map<number, SupabaseProfileRow>();

            profileRows.forEach((row) => {
              const profileId = normalizeSupabaseInteger(row.profile_id);

              if (typeof profileId === "number" && profileId > 0) {
                profileById.set(profileId, row);
              }
            });

            return presenceRows.flatMap((presenceRow) => {
                const profileId = normalizeSupabaseInteger(presenceRow.profile_id);

                if (typeof profileId !== "number" || profileId <= 0) {
                  return [];
                }

                const profileRow = profileById.get(profileId);

                if (!profileRow || profileRow.is_banned === true) {
                  return [];
                }

                return [{
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
                  roles: Array.isArray(profileRow.roles) ? profileRow.roles : [],
                  accentRole: pickCommentAccentRole(
                    Array.isArray(profileRow.roles) ? profileRow.roles : []
                  ) ?? null,
                  presence: {
                    lastSeenAt:
                      typeof presenceRow.last_seen_at === "string"
                        ? presenceRow.last_seen_at
                        : null,
                  },
                }];
              });
          }
        }
      }
    }

    try {
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("presence.status", "==", "online"))
      );
      const onlineUsers: RuntimeUserSnapshot[] = [];
      const countedUserIds = new Set<string>();

      usersSnapshot.forEach((userDoc) => {
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
      const currentSnapshot = getRuntimeWindow().sakuraCurrentUserSnapshot;
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
          isBanned: Boolean(currentSnapshot?.isBanned),
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
          presence: normalizePresence(currentSnapshot?.presence, readCurrentLocationPath()),
        });
      }

      return onlineUsers.sort(compareOnlineUsers);
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        throw error;
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

      return onlineUsers.map((snapshot) => ({
        uid: snapshot?.uid ?? null,
        profileId: typeof snapshot?.profileId === "number" ? snapshot.profileId : null,
        displayName: typeof snapshot?.displayName === "string" ? snapshot.displayName : null,
        login: typeof snapshot?.login === "string" ? snapshot.login : null,
        photoURL: typeof snapshot?.photoURL === "string" ? snapshot.photoURL : null,
        accentRole:
          (typeof snapshot?.accentRole === "string" && snapshot.accentRole) ||
          pickCommentAccentRole(snapshot?.roles ?? []) ||
          null,
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

  const syncPresence = async (user: FirebaseUserLike | null, options: PresenceSyncOptions = {}) => {
    try {
      const currentSnapshot = getRuntimeWindow().sakuraCurrentUserSnapshot;
      const effectiveUid =
        user && !user.isAnonymous
          ? user.uid
          : typeof currentSnapshot?.uid === "string" && currentSnapshot.uid
            ? currentSnapshot.uid
            : null;
      const nowIso = new Date().toISOString();
      const currentPath =
        typeof options.path === "string" && options.path
          ? options.path
          : readCurrentLocationPath();
      const forcedVisibility =
        options.visibility === "hidden"
          ? false
          : options.visibility === "visible"
            ? true
            : typeof document === "undefined" || document.visibilityState !== "hidden";
      const isVisible = forcedVisibility;

      updatePresenceTabRegistry(effectiveUid, isVisible, currentPath);

      const resolvedOnline =
        Boolean(navigator.onLine) && hasFreshVisiblePresenceTabForUid(effectiveUid);
      const status = resolvedOnline ? "online" : "offline";
      const source = typeof options.source === "string" ? options.source : "activity";
      const signature = status + "|" + currentPath + "|" + source;
      const previousVisits = normalizeVisitHistory(currentSnapshot?.visitHistory);
      const lastVisit = previousVisits[0] ?? null;
      const shouldRecordVisit =
        Boolean(options.forceVisit) ||
        !lastVisit ||
        lastVisit.path !== currentPath ||
        lastVisit.status !== status ||
        Date.now() - lastPresenceAt > presenceVisitRecordCooldownMs ||
        lastPresenceSignature !== signature;
      const presence: PresenceSnapshot = {
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
      const nextSnapshotDetails = {
        ...(currentSnapshot ?? {}),
        visitHistory,
        presence,
      };
      const targetProfileId =
        typeof currentSnapshot?.profileId === "number" ? currentSnapshot.profileId : null;

      lastPresenceSignature = signature;
      lastPresenceAt = Date.now();

      if (options.transport === "keepalive-only") {
        queueSupabasePresenceRpcKeepalive({
          target_status: presence.status,
          target_is_online: presence.isOnline,
          target_current_path: presence.currentPath,
          target_last_seen_at: presence.lastSeenAt,
          target_source: source,
          target_force_visit: Boolean(options.forceVisit),
        });

        if (user && !user.isAnonymous) {
          queueSupabasePresenceFunctionKeepalive(user, {
            profileId: targetProfileId,
            status: presence.status,
            isOnline: presence.isOnline,
            currentPath: presence.currentPath,
            lastSeenAt: presence.lastSeenAt,
          });
        }

        dispatchPresenceDirty();

        if (user && !user.isAnonymous) {
          return publishUserSnapshot(toUserSnapshot(user, nextSnapshotDetails));
        }

        if (effectiveUid) {
          return publishUserSnapshot(
            toStoredUserSnapshot(effectiveUid, nextSnapshotDetails)
          );
        }

        return currentSnapshot ?? null;
      }

      const supabaseResponse = await callSupabasePresenceRpc<SupabasePresenceRpcResponse>(
        "sync_current_profile_presence_rpc",
        {
          target_status: presence.status,
          target_is_online: presence.isOnline,
          target_current_path: presence.currentPath,
          target_last_seen_at: presence.lastSeenAt,
          target_source: source,
          target_force_visit: Boolean(options.forceVisit),
        }
      );

      if (supabaseResponse) {
        const responsePresence =
          supabaseResponse.presence && typeof supabaseResponse.presence === "object"
            ? normalizePresence(supabaseResponse.presence, currentPath)
            : presence;
        const responseVisitHistory = normalizeVisitHistory(supabaseResponse.visitHistory);
        const nextSnapshotDetails = {
          ...(currentSnapshot ?? {}),
          visitHistory: responseVisitHistory.length ? responseVisitHistory : visitHistory,
          presence: responsePresence,
        };
        const fallbackUid =
          typeof supabaseResponse.firebaseUid === "string" && supabaseResponse.firebaseUid
            ? supabaseResponse.firebaseUid
            : typeof supabaseResponse.authUserId === "string" && supabaseResponse.authUserId
              ? supabaseResponse.authUserId
              : effectiveUid;

        dispatchPresenceDirty();

        if (user && !user.isAnonymous) {
          return publishUserSnapshot(toUserSnapshot(user, nextSnapshotDetails));
        }

        if (typeof fallbackUid === "string" && fallbackUid) {
          return publishUserSnapshot(toStoredUserSnapshot(fallbackUid, nextSnapshotDetails));
        }
      }

      if (!user || user.isAnonymous) {
        dispatchPresenceDirty();

        if (effectiveUid) {
          return publishUserSnapshot(
            toStoredUserSnapshot(effectiveUid, nextSnapshotDetails)
          );
        }

        return getRuntimeWindow().sakuraCurrentUserSnapshot ?? null;
      }

      const userRef = userRefFor(user.uid);
      const userSnapshot = await getDoc(userRef);
      const existingData: RuntimeUserDetails = userSnapshot.exists() ? userSnapshot.data() : {};

      await setDoc(
        userRef,
        {
          presence,
          visitHistory,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      const profileId =
        typeof existingData?.profileId === "number"
          ? existingData.profileId
          : targetProfileId;

      void syncSupabasePresenceRecord(user, {
        profileId,
        status: presence.status,
        isOnline: presence.isOnline,
        currentPath: presence.currentPath,
        lastSeenAt: presence.lastSeenAt,
      });

      dispatchPresenceDirty();
      return publishUserSnapshot(toUserSnapshot(user, { ...existingData, visitHistory, presence }));
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        throw error;
      }

      const currentSnapshot = getRuntimeWindow().sakuraCurrentUserSnapshot;

      if ((!user || user.isAnonymous) && !currentSnapshot) {
        return null;
      }

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

      if (user && !user.isAnonymous) {
        return publishUserSnapshot(toUserSnapshot(user, fallbackDetails));
      }

      const fallbackUid =
        typeof currentSnapshot?.uid === "string" && currentSnapshot.uid
          ? currentSnapshot.uid
          : null;

      if (fallbackUid) {
        return publishUserSnapshot(toStoredUserSnapshot(fallbackUid, fallbackDetails));
      }

      return null;
    }
  };

  const startPresenceTracking = (user: FirebaseUserLike | null) => {
    stopPresenceTracking();

    const syncCurrentPresence = (
      source: string,
      forceVisit = false,
      visibility?: "visible" | "hidden",
      transport: PresenceSyncOptions["transport"] = "default",
    ) =>
      syncPresence(user, {
        path: readCurrentLocationPath(),
        source,
        forceVisit,
        visibility,
        transport,
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
      void syncCurrentPresence("page-hide", true, "hidden", "keepalive-only");
    };

    const handleBeforeUnload = () => {
      void syncCurrentPresence("before-unload", true, "hidden", "keepalive-only");
    };

    const intervalId = window.setInterval(() => {
      void syncCurrentPresence("heartbeat");
    }, presenceHeartbeatIntervalMs);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    stopPresenceTrackingInternal = () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearPresenceTabRegistryEntry();
      dispatchPresenceDirty();
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
