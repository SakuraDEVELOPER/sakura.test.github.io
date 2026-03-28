const firebaseModuleScript = `
  (() => {
    let loadPromise;
    const startFirebaseAuth = () => {
      if (loadPromise) {
        return loadPromise;
      }

      loadPromise = (async () => {
        try {
      const [
        {
          getApps,
          initializeApp
        },
        {
          createUserWithEmailAndPassword,
          deleteUser,
          GoogleAuthProvider,
          getAuth,
          onAuthStateChanged,
          sendEmailVerification,
          signInAnonymously,
          signInWithPopup,
          signInWithEmailAndPassword,
          signOut,
          updateProfile
        },
        {
          collection,
          deleteDoc,
          doc,
          getDoc,
          getDocs,
          getFirestore,
          limit,
          query,
          runTransaction,
          serverTimestamp,
          setDoc,
          where
        }
      ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
      ]);

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
  const AVATAR_INLINE_SIZE = 160;
  const AVATAR_EXPORT_QUALITY = 0.72;
  const PROFILE_COMMENT_MAX_LENGTH = 280;
  const PROFILE_LOOKUP_TIMEOUT_MS = 5000;
  const DISPLAY_NAME_MAX_LENGTH = 48;
  const USER_UPDATE_EVENT = "sakura-user-update";
  const AUTH_ERROR_EVENT = "sakura-auth-error";
  const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
  const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
  const AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const LOGIN_PATTERN = /^[A-Za-z\u0400-\u04FF0-9._-]+$/;

  const createFirebaseError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const hasOwn = (value, key) =>
    Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);

  const resolvePhotoURL = (details, fallbackPhotoURL = null) =>
    hasOwn(details, "photoURL") ? details.photoURL ?? null : fallbackPhotoURL ?? null;
  const resolveBannedAt = (details, fallbackBannedAt = null) =>
    hasOwn(details, "bannedAt")
      ? typeof details.bannedAt === "string"
        ? details.bannedAt
        : null
      : fallbackBannedAt ?? null;

  const withTimeout = (promise, timeoutMs, createTimeoutError) =>
    new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(createTimeoutError());
      }, timeoutMs);

      promise.then(
        (value) => {
          window.clearTimeout(timeoutId);
          resolve(value);
        },
        (error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        }
      );
    });

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string" && reader.result) {
          resolve(reader.result);
          return;
        }

        reject(createFirebaseError("storage/no-preview", "Could not prepare the selected image."));
      };

      reader.onerror = () => {
        reject(createFirebaseError("storage/file-read-failed", "Could not read the selected image."));
      };

      reader.readAsDataURL(file);
    });

  const loadImageFromDataUrl = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(createFirebaseError("storage/image-load-failed", "Could not decode the selected image."));
      image.src = src;
    });

  const loadAvatarSource = async (file) => {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file);
      } catch (error) {
      }
    }

    const source = await readFileAsDataUrl(file);
    return loadImageFromDataUrl(source);
  };

  const createInlineAvatarDataUrl = async (file) => {
    const image = await loadAvatarSource(file);
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;

    if (!width || !height) {
      throw createFirebaseError("storage/invalid-image-size", "The selected image is empty.");
    }

    const cropSize = Math.min(width, height);
    const offsetX = Math.max(0, Math.floor((width - cropSize) / 2));
    const offsetY = Math.max(0, Math.floor((height - cropSize) / 2));
    const canvas = document.createElement("canvas");

    canvas.width = AVATAR_INLINE_SIZE;
    canvas.height = AVATAR_INLINE_SIZE;

    const context = canvas.getContext("2d");

    if (!context) {
      throw createFirebaseError("storage/no-canvas-context", "Could not prepare the avatar preview.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "medium";

    context.drawImage(
      image,
      offsetX,
      offsetY,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_INLINE_SIZE,
      AVATAR_INLINE_SIZE
    );

    if ("close" in image && typeof image.close === "function") {
      image.close();
    }

    const webpAvatar = canvas.toDataURL("image/webp", AVATAR_EXPORT_QUALITY);

    if (webpAvatar.startsWith("data:image/webp")) {
      return webpAvatar;
    }

    return canvas.toDataURL("image/jpeg", AVATAR_EXPORT_QUALITY);
  };

  const getErrorCode = (error) =>
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const isPermissionDeniedError = (error) =>
    getErrorCode(error) === "permission-denied" ||
    (error instanceof Error && /Missing or insufficient permissions/i.test(error.message));

  const sanitizeLogin = (value) =>
    typeof value === "string"
      ? value
          .trim()
          .replace(/\\s+/g, "")
          .replace(/[^A-Za-z\u0400-\u04FF0-9._-]/g, "")
          .slice(0, LOGIN_MAX_LENGTH)
      : "";
  const sanitizeDisplayName = (value) =>
    typeof value === "string"
      ? value.trim().replace(/\\s+/g, " ").slice(0, DISPLAY_NAME_MAX_LENGTH)
      : "";

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

  const isUserLikeRole = (role) =>
    typeof role === "string" && /^u(?:[\\s_-]*s)?[\\s_-]*e[\\s_-]*r$/i.test(role.trim());
  const toCompactRoleToken = (role) =>
    typeof role === "string"
      ? role
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
        .replace(/[^a-z0-9]+/g, "")
      : "";

  const normalizeRoleName = (role) => {
    const normalizedRole =
      typeof role === "string" ? role.trim().toLowerCase().replace(/\\s+/g, " ") : "";
    const compactRole = toCompactRoleToken(role);

    if (!normalizedRole) {
      return "";
    }

    if (isUserLikeRole(role)) {
      return "user";
    }

    if (/^co[\\s_-]*owner$/i.test(role.trim())) {
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

    if (
      compactRole === "root" ||
      compactRole === "r00t" ||
      compactRole === "owner"
    ) {
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

    if (compactRole === "tester") {
      return "tester";
    }

    if (compactRole === "subscriber") {
      return "subscriber";
    }

    if (compactRole === "user") {
      return "user";
    }

    return normalizedRole;
  };

  const cleanRoleLabel = (role) =>
    typeof role === "string"
      ? isUserLikeRole(role)
        ? "user"
        : role.trim().replace(/\\s+/g, " ")
      : "";
  const canonicalRoleLabel = (role) => {
    const normalizedRole = normalizeRoleName(role);
    return normalizedRole || cleanRoleLabel(role);
  };

  const REMOVED_ROLE_NAMES = new Set([
    "super administrator",
    "administrator",
    "tester",
    "subscriber",
  ]);
  const ROLE_SORT_ORDER = new Map([
    ["root", 0],
    ["co-owner", 1],
    ["sponsor", 2],
    ["moderator", 3],
    ["user", 4],
  ]);
  const COMMENT_ACCENT_ROLE_ORDER = new Map([
    ["root", 0],
    ["co-owner", 1],
    ["super administrator", 2],
    ["administrator", 3],
    ["sponsor", 4],
    ["moderator", 5],
    ["tester", 6],
    ["subscriber", 7],
    ["user", 8],
  ]);
  const sortRoles = (roles) =>
    [...roles].sort((left, right) => {
      const leftOrder = ROLE_SORT_ORDER.get(normalizeRoleName(left)) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = ROLE_SORT_ORDER.get(normalizeRoleName(right)) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return cleanRoleLabel(left).localeCompare(cleanRoleLabel(right), "en");
    });

  const normalizeRoles = (roles) => {
    const nextRoles = Array.isArray(roles)
      ? roles
        .filter((role) => typeof role === "string")
        .map(canonicalRoleLabel)
        .filter(Boolean)
        .filter((role) => !REMOVED_ROLE_NAMES.has(normalizeRoleName(role)))
      : [];

    return nextRoles.length
      ? sortRoles(
        nextRoles.filter(
          (role, index, entries) =>
            index ===
            entries.findIndex(
              (candidate) => normalizeRoleName(candidate) === normalizeRoleName(role)
            )
        )
      )
      : ["user"];
  };
  const pickCommentAccentRole = (roles, fallbackRole = "user") => {
    const normalizedRoles = Array.isArray(roles)
      ? roles
        .filter((role) => typeof role === "string")
        .map((role) => normalizeRoleName(role))
        .filter(Boolean)
      : [];
    const uniqueRoles = normalizedRoles.filter(
      (role, index, entries) => index === entries.findIndex((candidate) => candidate === role)
    );
    const sortedRoles = [...uniqueRoles].sort((left, right) => {
      const leftOrder =
        COMMENT_ACCENT_ROLE_ORDER.get(normalizeRoleName(left)) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        COMMENT_ACCENT_ROLE_ORDER.get(normalizeRoleName(right)) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return cleanRoleLabel(left).localeCompare(cleanRoleLabel(right), "en");
    });

    return (
      sortedRoles[0] ??
      normalizeRoleName(fallbackRole ?? "") ??
      "user"
    );
  };

  const ROLE_MANAGER_NAMES = new Set(["root"]);
  const COMMENT_MODERATOR_ROLE_NAMES = new Set(["root", "co-owner", "moderator"]);
  const canManageRoles = (roles) =>
    normalizeRoles(roles).some((role) => ROLE_MANAGER_NAMES.has(normalizeRoleName(role)));
  const canModerateComments = (roles) =>
    normalizeRoles(roles).some((role) =>
      COMMENT_MODERATOR_ROLE_NAMES.has(normalizeRoleName(role))
    );
  const requiresEmailVerification = (roles) =>
    !normalizeRoles(roles).some((role) => normalizeRoleName(role) === "root");

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
  const normalizeProfileCommentMessage = (value) =>
    typeof value === "string"
      ? value.replace(/\\r\\n/g, "\\n").trim().slice(0, PROFILE_COMMENT_MAX_LENGTH)
      : "";
  const normalizeProfileCommentAuthorName = (value) =>
    typeof value === "string"
      ? value.trim().replace(/\\s+/g, " ").slice(0, 48)
      : "";
  const normalizeProfileCommentAuthorLookupKey = (value) =>
    normalizeProfileCommentAuthorName(value).toLocaleLowerCase();
  const normalizeProfileCommentPhotoURL = (value) =>
    typeof value === "string" && value ? value : null;
  const normalizeProfileCommentCreatedAt = (value) => {
    if (typeof value === "string" && value) {
      return value;
    }

    if (value && typeof value.toDate === "function") {
      try {
        const nextDate = value.toDate();

        return nextDate instanceof Date && !Number.isNaN(nextDate.getTime())
          ? nextDate.toISOString()
          : null;
      } catch (error) {
      }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    return null;
  };
  const stripNullishFields = (value) =>
    Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
    );
  const toStoredProfileComment = (id, details = {}) => ({
    id,
    profileId: typeof details.profileId === "number" ? details.profileId : null,
    authorUid: typeof details.authorUid === "string" ? details.authorUid : null,
    authorProfileId:
      typeof details.authorProfileId === "number" ? details.authorProfileId : null,
    authorName:
      normalizeProfileCommentAuthorName(details.authorName) ||
      (typeof details.authorProfileId === "number"
        ? \`Profile #\${details.authorProfileId}\`
        : "Member"),
    authorPhotoURL: normalizeProfileCommentPhotoURL(details.authorPhotoURL),
    authorAccentRole:
      typeof details.authorAccentRole === "string"
        ? normalizeRoleName(details.authorAccentRole)
        : null,
    message: normalizeProfileCommentMessage(details.message),
    createdAt: normalizeProfileCommentCreatedAt(details.createdAt),
  });
  const sortProfileComments = (comments) =>
    [...comments].sort(
      (left, right) =>
        new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    );
  const enrichProfileCommentsWithAuthors = async (comments) => {
    const commentsWithAuthors = [...comments];
    const authorByUid = new Map();
    const authorByProfileId = new Map();
    const authorByName = new Map();
    const authorUids = [...new Set(
      commentsWithAuthors
        .map((comment) => comment.authorUid)
        .filter((authorUid) => typeof authorUid === "string" && authorUid)
    )];

    await Promise.all(
      authorUids.map(async (authorUid) => {
        try {
          const authorSnapshot = await getDoc(userRefFor(authorUid));

          if (authorSnapshot.exists()) {
            authorByUid.set(authorUid, authorSnapshot.data());
          }
        } catch (error) {
        }
      })
    );

    const profileIds = [...new Set(
      commentsWithAuthors
        .filter(
          (comment) =>
            typeof comment.authorProfileId === "number" &&
            !(
              typeof comment.authorUid === "string" &&
              comment.authorUid &&
              authorByUid.has(comment.authorUid)
            )
        )
        .map((comment) => comment.authorProfileId)
    )];

    await Promise.all(
      profileIds.map(async (authorProfileId) => {
        try {
          const authorDoc = await findUserByProfileId(authorProfileId);

          if (authorDoc) {
            authorByProfileId.set(authorProfileId, authorDoc.data());
          }
        } catch (error) {
        }
      })
    );

    const authorNames = [...new Set(
      commentsWithAuthors
        .filter(
          (comment) =>
            !(
              typeof comment.authorUid === "string" &&
              comment.authorUid &&
              authorByUid.has(comment.authorUid)
            ) &&
            !(
              typeof comment.authorProfileId === "number" &&
              authorByProfileId.has(comment.authorProfileId)
            )
        )
        .map((comment) => normalizeProfileCommentAuthorName(comment.authorName ?? ""))
        .filter(Boolean)
    )];

    await Promise.all(
      authorNames.map(async (authorName) => {
        try {
          const authorDoc = await findUserByAuthorName(authorName);

          if (authorDoc) {
            authorByName.set(normalizeProfileCommentAuthorLookupKey(authorName), authorDoc.data());
          }
        } catch (error) {
        }
      })
    );

    return commentsWithAuthors.map((comment) => {
      const authorNameKey = normalizeProfileCommentAuthorLookupKey(comment.authorName ?? "");
      const authorDetails =
        (typeof comment.authorUid === "string" && comment.authorUid
          ? authorByUid.get(comment.authorUid)
          : null) ??
        (typeof comment.authorProfileId === "number"
          ? authorByProfileId.get(comment.authorProfileId)
          : null) ??
        (authorNameKey ? authorByName.get(authorNameKey) : null) ??
        null;

      if (!authorDetails) {
        return comment;
      }

      return {
        ...comment,
        authorPhotoURL: resolvePhotoURL(authorDetails, comment.authorPhotoURL),
        authorAccentRole: pickCommentAccentRole(
          authorDetails?.roles ?? [],
          comment.authorAccentRole
        ),
      };
    });
  };

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
        : null;
    const fallbackLogin = sanitizeLogin(requestedLogin) || null;

      return {
        login: fallbackLogin,
        loginLower: fallbackLogin ? normalizeLogin(fallbackLogin) : null,
        displayName:
          preferredDisplayName ??
          user.displayName ??
          fallbackLogin ??
          user.email?.split("@")[0] ??
          null,
        emailVerified: Boolean(user.emailVerified),
        profileId: null,
        photoURL: user.photoURL ?? null,
        providerIds: getProviderIds(user),
        roles: ["user"],
        isBanned: false,
        bannedAt: null,
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
    emailVerified:
      typeof details.emailVerified === "boolean" ? details.emailVerified : Boolean(user.emailVerified),
    profileId: typeof details.profileId === "number" ? details.profileId : null,
    photoURL: resolvePhotoURL(details, user.photoURL ?? null),
    providerIds: Array.isArray(details.providerIds) ? details.providerIds : getProviderIds(user),
    roles: normalizeRoles(details.roles),
    isBanned: details.isBanned === true,
    bannedAt: resolveBannedAt(details),
    verificationRequired:
      typeof details.verificationRequired === "boolean"
        ? details.verificationRequired
        : requiresEmailVerification(details.roles),
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
          isAnonymous: Boolean(user.isAnonymous),
          email: user.email ?? null,
          emailVerified:
            typeof details.emailVerified === "boolean" ? details.emailVerified : Boolean(user.emailVerified),
          login: details.login ?? null,
          displayName: details.displayName ?? user.displayName ?? details.login ?? null,
          profileId: typeof details.profileId === "number" ? details.profileId : null,
          photoURL: resolvePhotoURL(details, user.photoURL ?? null),
          roles: normalizeRoles(details.roles),
          isBanned: details.isBanned === true,
          bannedAt: resolveBannedAt(details),
          verificationRequired:
            typeof details.verificationRequired === "boolean"
              ? details.verificationRequired
              : requiresEmailVerification(details.roles),
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

  const toStoredUserSnapshot = (uid, details = {}) => ({
    uid,
    isAnonymous: false,
    email: typeof details.email === "string" ? details.email : null,
    emailVerified: typeof details.emailVerified === "boolean" ? details.emailVerified : null,
    login: typeof details.login === "string" ? details.login : null,
    displayName:
      typeof details.displayName === "string"
        ? details.displayName
        : typeof details.login === "string"
          ? details.login
          : null,
    profileId: typeof details.profileId === "number" ? details.profileId : null,
    photoURL: resolvePhotoURL(details, null),
    roles: normalizeRoles(details.roles),
    isBanned: details.isBanned === true,
    bannedAt: resolveBannedAt(details),
    verificationRequired:
      typeof details.verificationRequired === "boolean"
        ? details.verificationRequired
        : requiresEmailVerification(details.roles),
    providerIds: Array.isArray(details.providerIds)
      ? details.providerIds.filter((providerId) => typeof providerId === "string")
      : [],
    creationTime: typeof details.creationTime === "string" ? details.creationTime : null,
    lastSignInTime: typeof details.lastSignInTime === "string" ? details.lastSignInTime : null,
    loginHistory: Array.isArray(details.loginHistory)
      ? details.loginHistory.filter((entry) => typeof entry === "string")
      : [],
    visitHistory: normalizeVisitHistory(details.visitHistory),
    presence: normalizePresence(details.presence, null),
  });

  window.firebaseConfig = firebaseConfig;
  window.sakuraAuthStateSettled = false;

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    const userRefFor = (uid) => doc(db, "users", uid);
    const countersRef = doc(db, "meta", "counters");
    const usersCollection = collection(db, "users");
    const profileCommentsCollection = collection(db, "profileComments");
    let stopPresenceTracking = () => {};
    let lastPresenceSignature = "";
    let lastPresenceAt = 0;
    let authStateHasSettled = false;

    const markAuthStateSettled = () => {
      if (authStateHasSettled) {
        return;
      }

      authStateHasSettled = true;
      window.sakuraAuthStateSettled = true;
      window.dispatchEvent(new CustomEvent(AUTH_STATE_SETTLED_EVENT));
    };

    const waitForAuthStateSettlement = () =>
      window.sakuraAuthStateSettled
        ? Promise.resolve()
        : new Promise((resolve) => {
            const finish = () => {
              window.clearTimeout(timeoutId);
              window.removeEventListener(AUTH_STATE_SETTLED_EVENT, finish);
              resolve();
            };

            const timeoutId = window.setTimeout(finish, 1500);
            window.addEventListener(AUTH_STATE_SETTLED_EVENT, finish, { once: true });
          });

    const publishUserSnapshot = (snapshot) => {
      window.sakuraCurrentUserSnapshot = snapshot;
      try {
        if (typeof snapshot?.profileId === "number" && snapshot.profileId > 0) {
          window.sessionStorage.setItem(
            CURRENT_PROFILE_ID_STORAGE_KEY,
            String(snapshot.profileId)
          );
        } else {
          window.sessionStorage.removeItem(CURRENT_PROFILE_ID_STORAGE_KEY);
        }
      } catch (error) {}
      window.dispatchEvent(
        new CustomEvent(USER_UPDATE_EVENT, {
          detail: snapshot,
        })
      );

      return snapshot;
    };
    const syncCurrentUserSnapshotFromStoredSnapshot = (snapshot) => {
      if (
        window.sakuraCurrentUserSnapshot &&
        !window.sakuraCurrentUserSnapshot.isAnonymous &&
        window.sakuraCurrentUserSnapshot.uid === snapshot?.uid
      ) {
        return publishUserSnapshot({
          ...window.sakuraCurrentUserSnapshot,
          ...snapshot,
        });
      }

      return snapshot;
    };
    const hasAssignedProfileId = (details) =>
      typeof details?.profileId === "number" && details.profileId > 0;
    const readStoredProfileDetails = async (user, fallbackDetails = {}) => {
      const storedSnapshot = await getDoc(userRefFor(user.uid));

      if (!storedSnapshot.exists()) {
        return null;
      }

      const storedDetails = buildUserDetailsFromSnapshot(user, {
        ...fallbackDetails,
        ...storedSnapshot.data(),
      });

      return hasAssignedProfileId(storedDetails) ? storedDetails : null;
    };
    const emitAuthError = (message) => {
      window.sakuraFirebaseAuthError = message;
      window.dispatchEvent(
        new CustomEvent(AUTH_ERROR_EVENT, {
          detail: { message },
        })
      );
    };
    const clearBrokenProfileSession = async (message) => {
      stopPresenceTracking();

      if (message) {
        emitAuthError(message);
      }

      try {
        await signOut(auth);
      } catch (error) {
      }

      return publishUserSnapshot(null);
    };
    const isProfileRecordError = (error) => {
      const code = getErrorCode(error);
      return code === "profile/record-missing" || code === "permission-denied";
    };
    const ensureRootActorSnapshot = async () => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to open the admin panel.");
      }

      let actorSnapshot = window.sakuraCurrentUserSnapshot;

      if (!actorSnapshot || actorSnapshot.isAnonymous || actorSnapshot.uid !== user.uid) {
        actorSnapshot = await resolveUserSnapshot(user);
      }

      if (!canManageRoles(actorSnapshot?.roles ?? [])) {
        throw createFirebaseError(
          "admin/forbidden",
          "Only root accounts can use the admin panel."
        );
      }

      return {
        user,
        actorSnapshot,
      };
    };
    const refreshStoredUserSnapshot = async (uid, fallbackDetails = {}) => {
      const refreshedSnapshot = await getDoc(userRefFor(uid));
      const snapshot = toStoredUserSnapshot(
        uid,
        refreshedSnapshot.exists() ? refreshedSnapshot.data() : fallbackDetails
      );

      syncCurrentUserSnapshotFromStoredSnapshot(snapshot);

      return snapshot;
    };
    const enforceActiveSessionNotBanned = async (snapshot, options = {}) => {
      if (!snapshot?.isBanned) {
        return snapshot;
      }

      const message = "This account has been banned by an administrator.";

      stopPresenceTracking();
      window.sakuraFirebaseAuthError = message;
      window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT));

      try {
        await signOut(auth);
      } catch (error) {
      }

      publishUserSnapshot(null);

      if (options.throwError !== false) {
        throw createFirebaseError("auth/account-banned", message);
      }

      return null;
    };

    const findUserByLogin = async (loginLower) => {
      const snapshot = await getDocs(
        query(usersCollection, where("loginLower", "==", loginLower), limit(1))
      );

      return snapshot.empty ? null : snapshot.docs[0];
    };
    const findUserByAuthorName = async (authorName) => {
      const normalizedAuthorName = normalizeProfileCommentAuthorName(authorName);

      if (!normalizedAuthorName) {
        return null;
      }

      const loginLower = normalizeLogin(normalizedAuthorName);

      if (loginLower) {
        const userByLoginLower = await findUserByLogin(loginLower);

        if (userByLoginLower) {
          return userByLoginLower;
        }
      }

      const userByLogin = await getDocs(
        query(usersCollection, where("login", "==", normalizedAuthorName), limit(1))
      );

      if (!userByLogin.empty) {
        return userByLogin.docs[0];
      }

      const userByDisplayName = await getDocs(
        query(usersCollection, where("displayName", "==", normalizedAuthorName), limit(1))
      );

      return userByDisplayName.empty ? null : userByDisplayName.docs[0];
    };

    const findUserByProfileId = async (profileId) => {
      const snapshot = await getDocs(
        query(usersCollection, where("profileId", "==", profileId), limit(1))
      );

      return snapshot.empty ? null : snapshot.docs[0];
    };

    const toAnonymousViewerSnapshot = (user) => ({
      uid: user.uid,
      isAnonymous: true,
      email: null,
      login: null,
      displayName: null,
      profileId: null,
      photoURL: null,
      roles: [],
      providerIds: ["anonymous"],
      creationTime: user.metadata.creationTime ?? null,
      lastSignInTime: user.metadata.lastSignInTime ?? null,
      loginHistory: [],
      visitHistory: [],
      presence: null,
    });

    const ensureProfileViewer = async () => {
      if (auth.currentUser) {
        return auth.currentUser;
      }

      try {
        const credentials = await signInAnonymously(auth);
        return credentials.user;
      } catch (error) {
        throw createFirebaseError(
          "profile/public-view-disabled",
          "Public profile viewing is not enabled yet. Turn on Anonymous Auth or allow public read access in Firestore rules."
        );
      }
    };

    const resolveAvailableLogin = async (requestedLogin, currentUid = null, automatic = false) => {
      const normalizedRequestedLogin = String(requestedLogin ?? "")
        .trim()
        .replace(/\\s+/g, "");
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
          "Username must be 3-24 characters and only contain letters, numbers, dots, underscores, or hyphens."
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
            "This username is already taken."
          );
        }
      }

      throw createFirebaseError(
        "auth/login-already-in-use",
        "This username is already taken."
      );
    };

    const resolveEmailForLogin = async (identifier) => {
      const trimmedIdentifier = identifier.trim();

      if (trimmedIdentifier.includes("@")) {
        return trimmedIdentifier;
      }

      const loginLower = normalizeLogin(trimmedIdentifier);

      if (!loginLower) {
        throw createFirebaseError("auth/invalid-login", "Invalid username.");
      }

      const userDoc = await findUserByLogin(loginLower);

      if (!userDoc) {
        throw createFirebaseError("auth/login-not-found", "Username not found.");
      }

      const userData = userDoc.data();

      if (typeof userData?.email !== "string" || !userData.email) {
        throw createFirebaseError("auth/login-not-found", "Username not found.");
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
              photoURL: window.sakuraCurrentUserSnapshot.photoURL,
              roles: window.sakuraCurrentUserSnapshot.roles,
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
            : {
                login: null,
                loginLower: null,
              };

      const loginHistory = buildLoginHistory(
        existingData?.loginHistory,
        user.metadata.creationTime ?? null,
        user.metadata.lastSignInTime ?? null
      );
      const visitHistory = normalizeVisitHistory(existingData?.visitHistory);
      const presence = normalizePresence(existingData?.presence, window.location.pathname);
      const roles = normalizeRoles(existingData?.roles);
      const profilePayload = {
        uid: user.uid,
        email: user.email ?? null,
        login: loginDetails.login,
        loginLower: loginDetails.loginLower,
        displayName:
          preferredDisplayName ??
          existingData?.displayName ??
          user.displayName ??
          loginDetails.login ??
          existingData?.email?.split("@")[0] ??
          user.email?.split("@")[0] ??
          "Sakura User",
        photoURL: resolvePhotoURL(existingData, user.photoURL ?? null),
        roles,
        isBanned: existingData?.isBanned === true,
        bannedAt: resolveBannedAt(existingData),
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
        try {
          return await writeProfileData(existingProfileId);
        } catch (error) {
          if (!isPermissionDeniedError(error)) {
            throw error;
          }

          const storedDetails = buildUserDetailsFromSnapshot(user, {
            ...profilePayload,
            ...existingData,
          });

          if (hasAssignedProfileId(storedDetails)) {
            return storedDetails;
          }

          throw error;
        }
      }

      let nextProfileId;

      try {
        nextProfileId = await runTransaction(db, async (transaction) => {
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
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          const storedDetails = await readStoredProfileDetails(user, profilePayload).catch((readError) => {
            if (!isPermissionDeniedError(readError)) {
              throw readError;
            }

            return null;
          });

          if (storedDetails) {
            return storedDetails;
          }
        }

        throw error;
      }

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
        roles: normalizeRoles(finalData?.roles ?? roles),
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

        const fallbackDetails = buildFallbackUserDetails(user, options);
        const storedDetails = await readStoredProfileDetails(user, fallbackDetails).catch((readError) => {
          if (!isPermissionDeniedError(readError)) {
            throw readError;
          }

          return null;
        });

        if (storedDetails) {
          return publishUserSnapshot(toUserSnapshot(user, storedDetails));
        }

        if (!user.isAnonymous) {
          throw createFirebaseError(
            "profile/record-missing",
            "Profile record could not be created or loaded. Check Firestore rules for users/{uid} and meta/counters."
          );
        }

        return publishUserSnapshot(toUserSnapshot(user, fallbackDetails));
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

    const updateUsername = async (nextUsername) => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your username.");
      }

      const usernameDetails = await resolveAvailableLogin(nextUsername, user.uid);
      const userRef = userRefFor(user.uid);
      const existingSnapshot = await getDoc(userRef);
      const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
      const previousLogin =
        typeof existingData?.login === "string" ? existingData.login.trim() : null;
      const existingDisplayName =
        typeof existingData?.displayName === "string" ? existingData.displayName.trim() : null;
      const authDisplayName =
        typeof user.displayName === "string" ? user.displayName.trim() : null;
      const shouldSyncDisplayName =
        !existingDisplayName ||
        (previousLogin !== null &&
          (existingDisplayName === previousLogin || authDisplayName === previousLogin));
      const nextDisplayName = shouldSyncDisplayName
        ? usernameDetails.login
        : existingDisplayName ?? authDisplayName ?? usernameDetails.login;

      try {
        await setDoc(
          userRef,
          {
            login: usernameDetails.login,
            loginLower: usernameDetails.loginLower,
            ...(shouldSyncDisplayName ? { displayName: nextDisplayName } : {}),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "username/persist-failed",
          "Username could not be saved. Check Firestore rules for users/{uid}."
        );
      }

      if (shouldSyncDisplayName && authDisplayName !== nextDisplayName) {
        try {
          await updateProfile(user, { displayName: nextDisplayName });
        } catch (error) {
          console.error("Failed to sync Firebase Auth displayName after username change:", error);
        }
      }

      const snapshot = publishUserSnapshot(
        toUserSnapshot(user, {
          ...existingData,
          login: usernameDetails.login,
          loginLower: usernameDetails.loginLower,
          displayName: nextDisplayName,
        })
      );

      return snapshot;
    };
    const updateDisplayName = async (nextDisplayName) => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your profile name.");
      }

      const sanitizedDisplayName = sanitizeDisplayName(nextDisplayName);

      if (!sanitizedDisplayName) {
        throw createFirebaseError("display-name/empty", "Enter a profile name.");
      }

      const userRef = userRefFor(user.uid);
      const existingSnapshot = await getDoc(userRef);
      const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};

      try {
        await setDoc(
          userRef,
          {
            displayName: sanitizedDisplayName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "display-name/persist-failed",
          "Profile name could not be saved. Check Firestore rules for users/{uid}."
        );
      }

      if ((typeof user.displayName === "string" ? user.displayName.trim() : null) !== sanitizedDisplayName) {
        try {
          await updateProfile(user, { displayName: sanitizedDisplayName });
        } catch (error) {
          console.error("Failed to sync Firebase Auth displayName after profile name change:", error);
        }
      }

      return publishUserSnapshot(
        toUserSnapshot(user, {
          ...existingData,
          displayName: sanitizedDisplayName,
        })
      );
    };

    const loginWithGoogle = async () => {
      const result = await signInWithPopup(auth, provider);

      try {
        const snapshot = await resolveUserSnapshot(result.user, {
          preferredDisplayName: result.user.displayName?.trim() || null,
        });
        const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);
        await syncPresence(result.user, {
          path: window.location.pathname,
          source: "google-login",
          forceVisit: true,
        });
        return allowedSnapshot;
      } catch (error) {
        if (isProfileRecordError(error)) {
          await clearBrokenProfileSession(
            error instanceof Error
              ? error.message
              : "Profile record could not be created or loaded."
          );
        }

        throw error;
      }
    };

    const getProfileById = async (profileId) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      if (
        window.sakuraCurrentUserSnapshot &&
        !window.sakuraCurrentUserSnapshot.isAnonymous &&
        window.sakuraCurrentUserSnapshot.profileId === profileId
      ) {
        return window.sakuraCurrentUserSnapshot;
      }

      const readProfileDoc = async () =>
        withTimeout(
          findUserByProfileId(profileId),
          PROFILE_LOOKUP_TIMEOUT_MS,
          () =>
            createFirebaseError(
              "profile/load-timeout",
              "Profile loading took too long. Refresh the page and try again."
            )
        );

      let profileDoc = null;
      let publicReadDenied = false;

      try {
        profileDoc = await readProfileDoc();
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        publicReadDenied = true;
      }

      if (!publicReadDenied) {
        return profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null;
      }

      await waitForAuthStateSettlement();

      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        try {
          profileDoc = await readProfileDoc();
          return profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null;
        } catch (error) {
          if (!isPermissionDeniedError(error)) {
            throw error;
          }
        }
      }

      const viewer = await ensureProfileViewer();

      if (viewer.isAnonymous) {
        publishUserSnapshot(toAnonymousViewerSnapshot(viewer));
      }

      try {
        profileDoc = await readProfileDoc();
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          throw createFirebaseError(
            "profile/public-view-denied",
            "Public profile viewing is blocked by Firestore rules. Allow public read access or anonymous users to read users collection."
          );
        }

        throw error;
      }

      if (!profileDoc) {
        return null;
      }

      return toStoredUserSnapshot(profileDoc.id, profileDoc.data());
    };

    const getProfileComments = async (profileId) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const readComments = async () => {
        const snapshot = await getDocs(
          query(profileCommentsCollection, where("profileId", "==", profileId))
        );

        const comments = sortProfileComments(
          snapshot.docs
            .map((commentDoc) => toStoredProfileComment(commentDoc.id, commentDoc.data()))
            .filter(
              (comment) =>
                comment.profileId === profileId &&
                typeof comment.message === "string" &&
                comment.message
            )
        );

        return enrichProfileCommentsWithAuthors(comments);
      };

      try {
        return await readComments();
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }
      }

      await waitForAuthStateSettlement();

      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        try {
          return await readComments();
        } catch (error) {
          if (!isPermissionDeniedError(error)) {
            throw error;
          }
        }
      }

      const viewer = await ensureProfileViewer();

      if (viewer.isAnonymous) {
        publishUserSnapshot(toAnonymousViewerSnapshot(viewer));
      }

      try {
        return await readComments();
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          throw createFirebaseError(
            "comments/read-denied",
            "Profile comments are blocked by Firestore rules. Allow read access to profileComments."
          );
        }

        throw error;
      }
    };

    const addProfileComment = async (profileId, message) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const normalizedMessage = normalizeProfileCommentMessage(message);

      if (!normalizedMessage) {
        throw createFirebaseError(
          "comments/empty-message",
          "Write a comment before sending."
        );
      }

      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to leave a comment on this profile."
        );
      }

      let authorSnapshot = window.sakuraCurrentUserSnapshot;
      if (!authorSnapshot || authorSnapshot.isAnonymous || authorSnapshot.uid !== user.uid) {
        authorSnapshot = await resolveUserSnapshot(user);
      }

      const commentRef = doc(profileCommentsCollection);
      const createdAt = new Date().toISOString();
      const authorName =
        authorSnapshot?.login?.trim() ||
        authorSnapshot?.displayName?.trim() ||
        user.displayName?.trim() ||
        user.email?.split("@")[0]?.trim() ||
        (typeof authorSnapshot?.profileId === "number"
          ? \`Profile #\${authorSnapshot.profileId}\`
          : "Member");
      const persistedCommentPayload = stripNullishFields({
        profileId,
        authorUid: user.uid,
        authorProfileId:
          typeof authorSnapshot?.profileId === "number" ? authorSnapshot.profileId : null,
        authorName,
        message: normalizedMessage,
        createdAt,
      });
      const displayCommentPayload = {
        ...persistedCommentPayload,
        authorPhotoURL: authorSnapshot?.photoURL ?? user.photoURL ?? null,
        authorAccentRole: pickCommentAccentRole(authorSnapshot?.roles ?? [], "user"),
      };
      const photoCommentPayload = {
        ...persistedCommentPayload,
        authorPhotoURL: authorSnapshot?.photoURL ?? user.photoURL ?? null,
      };
      const timestampCommentPayload = {
        ...stripNullishFields({
          profileId,
          authorUid: user.uid,
          authorProfileId:
            typeof authorSnapshot?.profileId === "number" ? authorSnapshot.profileId : null,
          authorName,
          message: normalizedMessage,
        }),
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(commentRef, displayCommentPayload);
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          try {
            await setDoc(commentRef, photoCommentPayload);
          } catch (fallbackError) {
            if (isPermissionDeniedError(fallbackError)) {
              try {
                await setDoc(commentRef, persistedCommentPayload);
              } catch (legacyError) {
                if (isPermissionDeniedError(legacyError)) {
                  try {
                    await setDoc(commentRef, timestampCommentPayload);
                  } catch (timestampError) {
                    if (isPermissionDeniedError(timestampError)) {
                      throw createFirebaseError(
                        "comments/write-denied",
                        "Comments could not be saved. Check Firestore rules for profileComments."
                      );
                    }

                    throw timestampError;
                  }
                }

                throw legacyError;
              }
            }

            throw fallbackError;
          }
        } else {
          throw error;
        }
      }

      return toStoredProfileComment(commentRef.id, displayCommentPayload);
    };

    const deleteProfileComment = async (commentId) => {
      const normalizedCommentId = typeof commentId === "string" ? commentId.trim() : "";

      if (!normalizedCommentId) {
        throw createFirebaseError("comments/invalid-id", "Comment id is required.");
      }

      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to manage comments on this profile."
        );
      }

      const commentRef = doc(profileCommentsCollection, normalizedCommentId);
      const commentSnapshot = await getDoc(commentRef);

      if (!commentSnapshot.exists()) {
        return null;
      }

      const comment = toStoredProfileComment(commentSnapshot.id, commentSnapshot.data());
      let actorSnapshot = window.sakuraCurrentUserSnapshot;

      if (!actorSnapshot || actorSnapshot.isAnonymous || actorSnapshot.uid !== user.uid) {
        actorSnapshot = await resolveUserSnapshot(user);
      }

      const isAuthor = comment.authorUid === user.uid;
      const ownsTargetProfile =
        typeof actorSnapshot?.profileId === "number" &&
        typeof comment.profileId === "number" &&
        actorSnapshot.profileId === comment.profileId;
      const hasCommentModerationAccess = canModerateComments(actorSnapshot?.roles ?? []);

      if (!isAuthor && !ownsTargetProfile && !hasCommentModerationAccess) {
        throw createFirebaseError(
          "comments/delete-forbidden",
          "You can only delete your own comments, comments on your profile, or moderate comments with staff roles."
        );
      }

      try {
        await deleteDoc(commentRef);
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          throw createFirebaseError(
            "comments/delete-denied",
            "Comments could not be deleted. Check Firestore rules for profileComments."
          );
        }

        throw error;
      }

      return comment.id;
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

      const inlinePhotoURL = await createInlineAvatarDataUrl(file);
      const photoURL = inlinePhotoURL;
      let persistedInFirestore = false;

      try {
        await setDoc(
          userRefFor(user.uid),
          {
            photoURL,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        persistedInFirestore = true;
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }
      }

      if (!persistedInFirestore) {
        throw createFirebaseError(
          "avatar/persist-failed",
          "Avatar could not be saved. Check Firestore rules for users/{uid}."
        );
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

    const deleteAvatar = async () => {
      const user = auth.currentUser;

      if (!user) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your avatar.");
      }

      try {
        await setDoc(
          userRefFor(user.uid),
          {
            photoURL: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "avatar/delete-failed",
          "Avatar could not be deleted. Check Firestore rules for users/{uid}."
        );
      }

      const currentDetails = window.sakuraCurrentUserSnapshot
        ? buildUserDetailsFromSnapshot(user, window.sakuraCurrentUserSnapshot)
        : buildFallbackUserDetails(user);

      return publishUserSnapshot(
        toUserSnapshot(user, {
          ...currentDetails,
          photoURL: null,
        })
      );
    };
    const adminUpdateProfileDisplayName = async (profileId, nextDisplayName) => {
      const { user } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const sanitizedDisplayName = sanitizeDisplayName(nextDisplayName);

      if (!sanitizedDisplayName) {
        throw createFirebaseError("display-name/empty", "Enter a profile name.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            displayName: sanitizedDisplayName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "display-name/persist-failed",
          "Profile name could not be saved. Check Firestore rules for privileged users."
        );
      }

      if (targetDoc.id === user.uid) {
        try {
          await updateProfile(user, { displayName: sanitizedDisplayName });
        } catch (error) {
          console.error("Failed to sync Firebase Auth displayName from admin panel:", error);
        }
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        displayName: sanitizedDisplayName,
      });
    };
    const adminUpdateProfileLogin = async (profileId, nextLogin) => {
      await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const normalizedRequestedLogin = String(nextLogin ?? "").trim().replace(/\s+/g, "");

      if (!normalizedRequestedLogin) {
        throw createFirebaseError("auth/invalid-login", "Enter a login.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      const targetDetails = targetDoc.data();
      const usernameDetails = await resolveAvailableLogin(normalizedRequestedLogin, targetDoc.id);

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            login: usernameDetails.login,
            loginLower: usernameDetails.loginLower,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "username/persist-failed",
          "Login could not be saved. Check Firestore rules for privileged users."
        );
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDetails,
        login: usernameDetails.login,
        loginLower: usernameDetails.loginLower,
      });
    };
    const adminUpdateProfileAvatar = async (profileId, file) => {
      await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
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

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      const photoURL = await createInlineAvatarDataUrl(file);

      try {
        await setDoc(
          userRefFor(targetDoc.id),
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

        throw createFirebaseError(
          "avatar/persist-failed",
          "Avatar could not be saved. Check Firestore rules for privileged users."
        );
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        photoURL,
      });
    };
    const adminDeleteProfileAvatar = async (profileId) => {
      await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            photoURL: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "avatar/delete-failed",
          "Avatar could not be deleted. Check Firestore rules for privileged users."
        );
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        photoURL: null,
      });
    };
    const adminSetProfileBan = async (profileId, nextIsBanned) => {
      const { user } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      const isBanned = Boolean(nextIsBanned);
      const bannedAt = isBanned ? new Date().toISOString() : null;

      if (targetDoc.id === user.uid && isBanned) {
        throw createFirebaseError(
          "ban/self-forbidden",
          "You cannot ban your own account."
        );
      }

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            isBanned,
            bannedAt,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "ban/persist-failed",
          "Ban status could not be saved. Check Firestore rules for privileged users."
        );
      }

      const snapshot = await refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        isBanned,
        bannedAt,
      });

      if (targetDoc.id === user.uid && isBanned) {
        await enforceActiveSessionNotBanned(
          {
            ...(window.sakuraCurrentUserSnapshot ?? snapshot),
            ...snapshot,
            isBanned: true,
            bannedAt,
          },
          { throwError: true }
        );
      }

      return snapshot;
    };

    const updateProfileRoles = async (profileId, nextRoles) => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to manage roles.");
      }

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      if (!canManageRoles(window.sakuraCurrentUserSnapshot?.roles ?? [])) {
        throw createFirebaseError(
          "roles/forbidden",
          "Only root can manage user roles."
        );
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      const roles = normalizeRoles(nextRoles);

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            roles,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "roles/persist-failed",
          "Roles could not be updated. Check Firestore rules for privileged users."
        );
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        roles,
      });
    };

    const resendVerificationEmail = async () => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to verify your email.");
      }

      const currentRoles = normalizeRoles(window.sakuraCurrentUserSnapshot?.roles ?? []);

      if (!requiresEmailVerification(currentRoles)) {
        const snapshot = publishUserSnapshot(
          toUserSnapshot(user, {
            ...(window.sakuraCurrentUserSnapshot ?? {}),
            roles: currentRoles,
            verificationRequired: false,
            verificationEmailSent: false,
          })
        );

        return {
          ...snapshot,
          verificationEmailSent: false,
        };
      }

      if (user.emailVerified) {
        const snapshot = publishUserSnapshot(
          toUserSnapshot(user, {
            ...(window.sakuraCurrentUserSnapshot ?? {}),
            emailVerified: true,
            verificationEmailSent: false,
          })
        );

        return {
          ...snapshot,
          verificationEmailSent: false,
        };
      }

      await sendEmailVerification(user);

      const snapshot = publishUserSnapshot(
        toUserSnapshot(user, {
          ...(window.sakuraCurrentUserSnapshot ?? {}),
          emailVerified: false,
          verificationEmailSent: true,
        })
      );

      return {
        ...snapshot,
        verificationEmailSent: true,
      };
    };

    window.sakuraFirebaseAuth = {
      register: async ({ login, displayName, email, password }) => {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const preferredLogin =
          sanitizeLogin(login) ||
          (typeof login === "string" ? login.trim() : "") ||
          ("user" + credentials.user.uid.slice(0, 6));
        const preferredDisplayName = sanitizeDisplayName(displayName);
        let verificationEmailSent = false;

        try {
          const snapshot = await resolveUserSnapshot(credentials.user, {
            requestedLogin: login,
            preferredDisplayName: preferredDisplayName || preferredLogin,
          });

          const registrationDisplayName =
            snapshot?.displayName ?? preferredDisplayName ?? snapshot?.login ?? preferredLogin;

          await updateProfile(credentials.user, {
            displayName: registrationDisplayName,
          });

          try {
            await sendEmailVerification(credentials.user);
            verificationEmailSent = true;
          } catch (error) {
            console.error("Failed to send verification email:", error);
          }

          await syncPresence(credentials.user, {
            path: window.location.pathname,
            source: "register",
            forceVisit: true,
          });

          const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);

          return {
            ...allowedSnapshot,
            emailVerified: Boolean(credentials.user.emailVerified),
            verificationEmailSent,
          };
        } catch (error) {
          const errorCode = getErrorCode(error);

          if (
            errorCode === "auth/login-already-in-use" ||
            errorCode === "auth/invalid-login" ||
            errorCode === "profile/record-missing" ||
            errorCode === "permission-denied"
          ) {
            try {
              await deleteUser(credentials.user);
            } catch (cleanupError) {
              console.error("Failed to rollback registration:", cleanupError);
              await clearBrokenProfileSession(
                error instanceof Error
                  ? error.message
                  : "Profile record could not be created or loaded."
              );
            }
          }

          throw error;
        }
      },
      login: async (identifier, password) => {
        const email = await resolveEmailForLogin(identifier);
        const credentials = await signInWithEmailAndPassword(auth, email, password);

        try {
          const snapshot = await resolveUserSnapshot(credentials.user);
          const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);
          await syncPresence(credentials.user, {
            path: window.location.pathname,
            source: "login",
            forceVisit: true,
          });
          return allowedSnapshot;
        } catch (error) {
          if (isProfileRecordError(error)) {
            await clearBrokenProfileSession(
              error instanceof Error
                ? error.message
                : "Profile record could not be created or loaded."
            );
          }

          throw error;
        }
      },
      loginWithGoogle,
      updateDisplayName,
      updateUsername,
      adminUpdateProfileDisplayName,
      adminUpdateProfileLogin,
      adminSetProfileBan,
      getProfileById,
      getProfileComments,
      addProfileComment,
      deleteProfileComment,
      resendVerificationEmail,
      updateProfileRoles,
      updateAvatar,
      deleteAvatar,
      adminUpdateProfileAvatar,
      adminDeleteProfileAvatar,
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
          markAuthStateSettled();

          if (!user) {
            callback(publishUserSnapshot(null));
            return;
          }

          if (user.isAnonymous) {
            callback(publishUserSnapshot(toAnonymousViewerSnapshot(user)));
            return;
          }

          try {
            const snapshot = await resolveUserSnapshot(user);
            const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot, {
              throwError: false,
            });

            if (!allowedSnapshot) {
              callback(publishUserSnapshot(null));
              return;
            }

            callback(allowedSnapshot);
            startPresenceTracking(user);
          } catch (error) {
            await clearBrokenProfileSession(
              error instanceof Error
                ? error.message
                : "Profile record could not be created or loaded."
            );
            callback(window.sakuraCurrentUserSnapshot ?? null);
          }
        })
    };
    window.loginWithGoogle = loginWithGoogle;

      window.dispatchEvent(new CustomEvent("sakura-auth-ready"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to initialize Firebase Auth.";

      window.sakuraFirebaseAuthError = message;
      window.sakuraAuthStateSettled = true;
      window.dispatchEvent(new CustomEvent(AUTH_STATE_SETTLED_EVENT));
      window.dispatchEvent(
        new CustomEvent("sakura-auth-error", {
          detail: { message }
        })
      );
      console.error("Firebase Auth init failed:", error);
    }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load Firebase Auth modules.";

      window.sakuraFirebaseAuthError = message;
      window.sakuraAuthStateSettled = true;
      window.dispatchEvent(new CustomEvent("sakura-auth-state-settled"));
      window.dispatchEvent(
        new CustomEvent("sakura-auth-error", {
          detail: { message }
        })
      );
      console.error("Firebase Auth module load failed:", error);
    }
      })();

      return loadPromise;
    };

    window.sakuraStartFirebaseAuth = startFirebaseAuth;
    startFirebaseAuth();
  })();
`;

export default firebaseModuleScript;
