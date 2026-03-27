import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const firebaseModuleScript = `
  import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import {
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    query,
    runTransaction,
    setDoc,
    where
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
  import {
    getDownloadURL,
    getStorage,
    ref as storageRef,
    uploadBytes
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAnZQt5NWXGOWuz3STh_vy-dSENVBM9_ZY",
    authDomain: "sakura-bfa74.firebaseapp.com",
    projectId: "sakura-bfa74",
    storageBucket: "sakura-bfa74.firebasestorage.app",
    messagingSenderId: "145336250722",
    appId: "1:145336250722:web:d31610ae8258c398e47c3b",
    measurementId: "G-1V07L6BRL0"
  };

  const LOGIN_MAX_LENGTH = 24;
  const LOGIN_MIN_LENGTH = 3;
  const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
  const USER_UPDATE_EVENT = "sakura-user-update";
  const AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const LOGIN_PATTERN = /^[A-Za-zА-Яа-яЁё0-9._-]+$/;

  const createFirebaseError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const getErrorCode = (error) =>
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const isPermissionDeniedError = (error) =>
    getErrorCode(error) === "permission-denied" ||
    (error instanceof Error && /Missing or insufficient permissions/i.test(error.message));

  const sanitizeLogin = (value) =>
    value
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^A-Za-zА-Яа-яЁё0-9._-]/g, "")
      .slice(0, LOGIN_MAX_LENGTH);

  const normalizeLogin = (value) => sanitizeLogin(value).toLocaleLowerCase();

  const deriveLoginSeed = (user, preferredDisplayName = null) => {
    const source =
      preferredDisplayName?.trim() ||
      user.displayName?.trim() ||
      user.email?.split("@")[0]?.trim() ||
      "sakurauser";

    const cleaned = sanitizeLogin(source);

    return cleaned || \`user\${user.uid.slice(0, 6)}\`;
  };

  const getProviderIds = (user) =>
    user.providerData.map((providerData) => providerData?.providerId).filter(Boolean);

  const buildLoginHistory = (existingHistory, creationTime, lastSignInTime) => {
    const previousEntries = Array.isArray(existingHistory)
      ? existingHistory.filter((entry) => typeof entry === "string")
      : [];
    const nextEntries = [lastSignInTime ?? null, creationTime ?? null].filter(Boolean);

    return [...new Set([...nextEntries, ...previousEntries])]
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
      .slice(0, 8);
  };

  const normalizePresence = (presence, fallbackPath = null) => ({
    status: presence?.status === "online" ? "online" : "offline",
    isOnline: Boolean(presence?.isOnline),
    currentPath:
      typeof presence?.currentPath === "string" && presence.currentPath
        ? presence.currentPath
        : fallbackPath,
    lastSeenAt: typeof presence?.lastSeenAt === "string" ? presence.lastSeenAt : null,
  });

  const normalizeVisitHistory = (history) =>
    Array.isArray(history)
      ? history.filter(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            typeof entry.timestamp === "string" &&
            typeof entry.path === "string" &&
            typeof entry.source === "string" &&
            typeof entry.status === "string"
        )
      : [];

  const buildVisitHistory = (existingHistory, nextEntry) =>
    [nextEntry, ...normalizeVisitHistory(existingHistory)]
      .filter(
        (entry, index, entries) =>
          index ===
          entries.findIndex(
            (candidate) =>
              candidate.timestamp === entry.timestamp &&
              candidate.path === entry.path &&
              candidate.source === entry.source &&
              candidate.status === entry.status
          )
      )
      .slice(0, 12);

  const buildFallbackUserDetails = (user, options = {}) => {
    const preferredDisplayName =
      typeof options.preferredDisplayName === "string" && options.preferredDisplayName.trim()
        ? options.preferredDisplayName.trim()
        : null;
    const requestedLogin =
      typeof options.requestedLogin === "string" && options.requestedLogin.trim()
        ? options.requestedLogin.trim()
        : preferredDisplayName || deriveLoginSeed(user, preferredDisplayName);
    const fallbackLogin = sanitizeLogin(requestedLogin) || null;

    return {
      login: fallbackLogin,
      loginLower: fallbackLogin ? normalizeLogin(fallbackLogin) : null,
      displayName: preferredDisplayName ?? user.displayName ?? fallbackLogin,
      profileId: null,
      providerIds: getProviderIds(user),
      loginHistory: buildLoginHistory(
        [],
        user.metadata.creationTime ?? null,
        user.metadata.lastSignInTime ?? null
      ),
      visitHistory: [],
      presence: normalizePresence(null, window.location.pathname),
    };
  };

  const buildUserDetailsFromSnapshot = (user, details = {}) => ({
    login: details.login ?? null,
    loginLower: details.loginLower ?? null,
    displayName: details.displayName ?? user.displayName ?? details.login ?? null,
    profileId: typeof details.profileId === "number" ? details.profileId : null,
    photoURL: user.photoURL ?? details.photoURL ?? null,
    providerIds: Array.isArray(details.providerIds) ? details.providerIds : getProviderIds(user),
    loginHistory: Array.isArray(details.loginHistory)
      ? details.loginHistory
      : buildLoginHistory([], user.metadata.creationTime ?? null, user.metadata.lastSignInTime ?? null),
    visitHistory: normalizeVisitHistory(details.visitHistory),
    presence: normalizePresence(details.presence, window.location.pathname),
  });

  const toUserSnapshot = (user, details = {}) =>
    user
      ? {
          uid: user.uid,
          email: user.email ?? null,
          login: details.login ?? null,
          displayName: user.displayName ?? details.displayName ?? details.login ?? null,
          profileId: typeof details.profileId === "number" ? details.profileId : null,
          photoURL: user.photoURL ?? null,
          providerIds:
            user.providerData.map((provider) => provider?.providerId).filter(Boolean) ??
            details.providerIds ??
            [],
          creationTime: user.metadata.creationTime ?? null,
          lastSignInTime: user.metadata.lastSignInTime ?? null,
          loginHistory: Array.isArray(details.loginHistory) ? details.loginHistory : [],
          visitHistory: normalizeVisitHistory(details.visitHistory),
          presence: normalizePresence(details.presence, window.location.pathname)
        }
      : null;

  window.firebaseConfig = firebaseConfig;

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const provider = new GoogleAuthProvider();

    const userRefFor = (uid) => doc(db, "users", uid);
    const countersRef = doc(db, "meta", "counters");
    const usersCollection = collection(db, "users");
    let stopPresenceTracking = () => {};
    let lastPresenceSignature = "";
    let lastPresenceAt = 0;

    const publishUserSnapshot = (snapshot) => {
      window.sakuraCurrentUserSnapshot = snapshot;
      window.dispatchEvent(
        new CustomEvent(USER_UPDATE_EVENT, {
          detail: snapshot,
        })
      );

      return snapshot;
    };

    const findUserByLogin = async (loginLower) => {
      const snapshot = await getDocs(
        query(usersCollection, where("loginLower", "==", loginLower), limit(1))
      );

      return snapshot.empty ? null : snapshot.docs[0];
    };

    const resolveAvailableLogin = async (requestedLogin, currentUid = null, automatic = false) => {
      const normalizedRequestedLogin = String(requestedLogin ?? "")
        .trim()
        .replace(/\s+/g, "");
      const baseLogin = sanitizeLogin(normalizedRequestedLogin);

      if (
        !baseLogin ||
        baseLogin.length < LOGIN_MIN_LENGTH ||
        (!automatic &&
          (normalizedRequestedLogin.length > LOGIN_MAX_LENGTH ||
            !LOGIN_PATTERN.test(normalizedRequestedLogin) ||
            baseLogin !== normalizedRequestedLogin))
      ) {
        throw createFirebaseError(
          "auth/invalid-login",
          "Login must be 3-24 characters and only contain letters, numbers, dots, underscores, or hyphens."
        );
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const suffix = attempt === 0 ? "" : String(attempt + 1);
        const trimmedBase = baseLogin.slice(0, LOGIN_MAX_LENGTH - suffix.length);
        const login = \`\${trimmedBase}\${suffix}\`;
        const loginLower = normalizeLogin(login);
        const existingLoginDoc = await findUserByLogin(loginLower);

        if (!existingLoginDoc || existingLoginDoc.id === currentUid) {
          return {
            login,
            loginLower,
          };
        }

        if (!automatic) {
          throw createFirebaseError(
            "auth/login-already-in-use",
            "This login is already taken."
          );
        }
      }

      throw createFirebaseError(
        "auth/login-already-in-use",
        "This login is already taken."
      );
    };

    const resolveEmailForLogin = async (identifier) => {
      const trimmedIdentifier = identifier.trim();

      if (trimmedIdentifier.includes("@")) {
        return trimmedIdentifier;
      }

      const loginLower = normalizeLogin(trimmedIdentifier);

      if (!loginLower) {
        throw createFirebaseError("auth/invalid-login", "Invalid login.");
      }

      const userDoc = await findUserByLogin(loginLower);

      if (!userDoc) {
        throw createFirebaseError("auth/login-not-found", "Login not found.");
      }

      const userData = userDoc.data();

      if (typeof userData?.email !== "string" || !userData.email) {
        throw createFirebaseError("auth/login-not-found", "Login not found.");
      }

      return userData.email;
    };

    const syncPresence = async (user, options = {}) => {
      try {
        const userRef = userRefFor(user.uid);
        const userSnapshot = await getDoc(userRef);
        const existingData = userSnapshot.exists() ? userSnapshot.data() : {};
        const nowIso = new Date().toISOString();
        const currentPath =
          typeof options.path === "string" && options.path
            ? options.path
            : window.location.pathname;
        const isVisible = typeof document === "undefined" || document.visibilityState !== "hidden";
        const isOnline = Boolean(navigator.onLine) && isVisible;
        const status = isOnline ? "online" : "offline";
        const source = typeof options.source === "string" ? options.source : "activity";
        const signature = status + "|" + currentPath + "|" + source;
        const previousVisits = normalizeVisitHistory(existingData?.visitHistory);
        const lastVisit = previousVisits[0] ?? null;
        const shouldRecordVisit =
          Boolean(options.forceVisit) ||
          !lastVisit ||
          lastVisit.path !== currentPath ||
          lastVisit.status !== status ||
          Date.now() - lastPresenceAt > 5 * 60 * 1000 ||
          lastPresenceSignature !== signature;
        const presence = {
          status,
          isOnline,
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

        return publishUserSnapshot(toUserSnapshot(user, { ...existingData, visitHistory, presence }));
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        const fallbackDetails = window.sakuraCurrentUserSnapshot
          ? {
              login: window.sakuraCurrentUserSnapshot.login,
              displayName: window.sakuraCurrentUserSnapshot.displayName,
              profileId: window.sakuraCurrentUserSnapshot.profileId,
              providerIds: window.sakuraCurrentUserSnapshot.providerIds,
              loginHistory: window.sakuraCurrentUserSnapshot.loginHistory,
              visitHistory: window.sakuraCurrentUserSnapshot.visitHistory,
              presence: window.sakuraCurrentUserSnapshot.presence,
            }
          : buildFallbackUserDetails(user, options);

        return publishUserSnapshot(toUserSnapshot(user, fallbackDetails));
      }
    };

    const ensureProfileRecord = async (user, options = {}) => {
      const userRef = userRefFor(user.uid);
      const userSnapshot = await getDoc(userRef);
      const existingData = userSnapshot.exists() ? userSnapshot.data() : null;
      const existingProfileId =
        typeof existingData?.profileId === "number" ? existingData.profileId : null;
      const providerIds = getProviderIds(user);
      const preferredDisplayName =
        typeof options.preferredDisplayName === "string" && options.preferredDisplayName.trim()
          ? options.preferredDisplayName.trim()
          : null;

      const loginDetails =
        typeof existingData?.login === "string" && typeof existingData?.loginLower === "string"
          ? {
              login: existingData.login,
              loginLower: existingData.loginLower,
            }
          : typeof options.requestedLogin === "string" && options.requestedLogin.trim()
            ? await resolveAvailableLogin(options.requestedLogin, user.uid)
            : await resolveAvailableLogin(deriveLoginSeed(user, preferredDisplayName), user.uid, true);

      const loginHistory = buildLoginHistory(
        existingData?.loginHistory,
        user.metadata.creationTime ?? null,
        user.metadata.lastSignInTime ?? null
      );
      const visitHistory = normalizeVisitHistory(existingData?.visitHistory);
      const presence = normalizePresence(existingData?.presence, window.location.pathname);
      const profilePayload = {
        uid: user.uid,
        email: user.email ?? null,
        login: loginDetails.login,
        loginLower: loginDetails.loginLower,
        displayName:
          preferredDisplayName ??
          user.displayName ??
          existingData?.displayName ??
          loginDetails.login,
        photoURL: user.photoURL ?? null,
        providerIds,
        creationTime: user.metadata.creationTime ?? null,
        lastSignInTime: user.metadata.lastSignInTime ?? null,
        loginHistory,
        visitHistory,
        presence,
        updatedAt: new Date().toISOString(),
      };

      const writeProfileData = async (profileId) => {
        await setDoc(
          userRef,
          { ...profilePayload, profileId },
          { merge: true }
        );

        return {
          ...profilePayload,
          profileId,
        };
      };

      if (existingProfileId !== null) {
        return writeProfileData(existingProfileId);
      }

      const nextProfileId = await runTransaction(db, async (transaction) => {
        const userSnapshotInTransaction = await transaction.get(userRef);
        const existingTransactionData = userSnapshotInTransaction.exists()
          ? userSnapshotInTransaction.data()
          : null;
        const existingTransactionProfileId =
          typeof existingTransactionData?.profileId === "number"
            ? existingTransactionData.profileId
            : null;

        if (existingTransactionProfileId !== null) {
          return existingTransactionProfileId;
        }

        const countersSnapshot = await transaction.get(countersRef);
        const currentCount =
          countersSnapshot.exists() && typeof countersSnapshot.data()?.profileCount === "number"
            ? countersSnapshot.data().profileCount
            : 0;
        const profileId = currentCount + 1;

        transaction.set(countersRef, { profileCount: profileId }, { merge: true });
        transaction.set(
          userRef,
          { ...profilePayload, profileId },
          { merge: true }
        );

        return profileId;
      });

      const finalSnapshot = await getDoc(userRef);
      const finalData = finalSnapshot.exists() ? finalSnapshot.data() : null;

      return {
        ...profilePayload,
        ...(finalData ?? {}),
        login: typeof finalData?.login === "string" ? finalData.login : profilePayload.login,
        loginLower:
          typeof finalData?.loginLower === "string"
            ? finalData.loginLower
            : profilePayload.loginLower,
        displayName:
          typeof finalData?.displayName === "string"
            ? finalData.displayName
            : profilePayload.displayName,
        providerIds: Array.isArray(finalData?.providerIds) ? finalData.providerIds : providerIds,
        loginHistory: Array.isArray(finalData?.loginHistory) ? finalData.loginHistory : loginHistory,
        visitHistory: normalizeVisitHistory(finalData?.visitHistory ?? visitHistory),
        presence: normalizePresence(finalData?.presence, window.location.pathname),
        profileId: typeof finalData?.profileId === "number" ? finalData.profileId : nextProfileId,
      };
    };

    const resolveUserSnapshot = async (user, options = {}) => {
      try {
        const details = await ensureProfileRecord(user, options);

        return publishUserSnapshot(toUserSnapshot(user, details));
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        return publishUserSnapshot(toUserSnapshot(user, buildFallbackUserDetails(user, options)));
      }
    };

    const startPresenceTracking = (user) => {
      stopPresenceTracking();

      const syncCurrentPresence = (source, forceVisit = false) =>
        syncPresence(user, {
          path: window.location.pathname,
          source,
          forceVisit,
        }).catch((error) => {
          console.error("Failed to sync presence:", error);
        });

      const handleOnline = () => {
        syncCurrentPresence("network-online", true);
      };

      const handleOffline = () => {
        syncCurrentPresence("network-offline", true);
      };

      const handleVisibilityChange = () => {
        syncCurrentPresence(
          document.visibilityState === "hidden" ? "tab-hidden" : "tab-visible",
          true
        );
      };

      const handlePageHide = () => {
        syncCurrentPresence("page-hide", true);
      };

      const intervalId = window.setInterval(() => {
        syncCurrentPresence("heartbeat");
      }, 120000);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handlePageHide);

      stopPresenceTracking = () => {
        window.clearInterval(intervalId);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handlePageHide);
      };

      syncCurrentPresence("session-start", true);

      return stopPresenceTracking;
    };

    const loginWithGoogle = async () => {
      const result = await signInWithPopup(auth, provider);
      const snapshot = await resolveUserSnapshot(result.user);
      await syncPresence(result.user, {
        path: window.location.pathname,
        source: "google-login",
        forceVisit: true,
      });
      return snapshot;
    };

    const updateAvatar = async (file) => {
      const user = auth.currentUser;

      if (!user) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your avatar.");
      }

      if (!(file instanceof File)) {
        throw createFirebaseError("storage/invalid-file", "Choose an image before uploading.");
      }

      if (!AVATAR_CONTENT_TYPES.has(file.type)) {
        throw createFirebaseError(
          "storage/unsupported-file-type",
          "Avatar must be PNG, JPG, WEBP, or GIF."
        );
      }

      if (file.size > MAX_AVATAR_BYTES) {
        throw createFirebaseError("storage/file-too-large", "Avatar must be 5 MB or smaller.");
      }

      const rawExtension = file.name.includes(".") ? file.name.split(".").pop() : "";
      const safeExtension = String(rawExtension ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";
      const avatarFileRef = storageRef(
        storage,
        "avatars/" + user.uid + "/avatar-" + Date.now() + "." + safeExtension
      );

      await uploadBytes(avatarFileRef, file, {
        contentType: file.type,
        cacheControl: "public,max-age=31536000",
      });

      const photoURL = await getDownloadURL(avatarFileRef);

      await updateProfile(user, {
        photoURL,
      });

      try {
        await setDoc(
          userRefFor(user.uid),
          {
            photoURL,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }
      }

      const currentDetails = window.sakuraCurrentUserSnapshot
        ? buildUserDetailsFromSnapshot(user, window.sakuraCurrentUserSnapshot)
        : buildFallbackUserDetails(user);

      return publishUserSnapshot(
        toUserSnapshot(user, {
          ...currentDetails,
          photoURL,
        })
      );
    };

    window.sakuraFirebaseAuth = {
      register: async ({ login, email, password }) => {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const preferredLogin = sanitizeLogin(login) || login.trim();

        try {
          const snapshot = await resolveUserSnapshot(credentials.user, {
            requestedLogin: login,
            preferredDisplayName: preferredLogin,
          });

          await updateProfile(credentials.user, {
            displayName: snapshot?.login ?? preferredLogin,
          });

          await syncPresence(credentials.user, {
            path: window.location.pathname,
            source: "register",
            forceVisit: true,
          });

          return snapshot;
        } catch (error) {
          const errorCode = getErrorCode(error);

          if (errorCode === "auth/login-already-in-use" || errorCode === "auth/invalid-login") {
            try {
              await deleteUser(credentials.user);
            } catch (cleanupError) {
              console.error("Failed to rollback registration:", cleanupError);
            }
          }

          throw error;
        }
      },
      login: async (identifier, password) => {
        const email = await resolveEmailForLogin(identifier);
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const snapshot = await resolveUserSnapshot(credentials.user);
        await syncPresence(credentials.user, {
          path: window.location.pathname,
          source: "login",
          forceVisit: true,
        });
        return snapshot;
      },
      loginWithGoogle,
      updateAvatar,
      syncPresence: async (options = {}) => {
        const user = auth.currentUser;

        if (!user) {
          return publishUserSnapshot(null);
        }

        return syncPresence(user, options);
      },
      logout: async () => {
        stopPresenceTracking();
        await signOut(auth);
        publishUserSnapshot(null);
      },
      onAuthStateChanged: (callback) =>
        onAuthStateChanged(auth, async (user) => {
          stopPresenceTracking();

          if (!user) {
            callback(publishUserSnapshot(null));
            return;
          }

          const snapshot = await resolveUserSnapshot(user);

          callback(snapshot);
          startPresenceTracking(user);
        })
    };
    window.loginWithGoogle = loginWithGoogle;

    window.dispatchEvent(new CustomEvent("sakura-auth-ready"));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize Firebase Auth.";

    window.sakuraFirebaseAuthError = message;
    window.dispatchEvent(
      new CustomEvent("sakura-auth-error", {
        detail: { message }
      })
    );
    console.error("Firebase Auth init failed:", error);
  }
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sakura",
  description:
    "Free Dota 2 cheat with camera distance, enemy resource bars, and a clean in-game menu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: firebaseModuleScript,
          }}
        />
      </body>
    </html>
  );
}
