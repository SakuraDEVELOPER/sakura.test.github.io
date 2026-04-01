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
          EmailAuthProvider,
          GoogleAuthProvider,
          getAuth,
          getRedirectResult,
          linkWithCredential,
          onAuthStateChanged,
          reauthenticateWithCredential,
          reload,
          sendEmailVerification,
          signInAnonymously,
          signInWithCredential,
          signInWithCustomToken,
          signInWithPopup,
          signInWithRedirect,
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
  const MAX_PASSTHROUGH_AVATAR_BYTES = 700 * 1024;
  const AVATAR_STORAGE_UPLOAD_TIMEOUT_MS = 2500;
  const STORAGE_AVATAR_UPLOADS_ENABLED = false;
  const AVATAR_INLINE_SIZE = 160;
  const AVATAR_EXPORT_QUALITY = 0.72;
  const PASSTHROUGH_AVATAR_CONTENT_TYPES = new Set(["image/gif", "image/webp", "video/mp4", "video/webm"]);
  const STORAGE_AVATAR_CONTENT_TYPES = new Set(["image/gif", "image/webp", "video/mp4", "video/webm"]);
  const PREMIUM_AVATAR_CONTENT_TYPES = new Set(["image/gif", "video/mp4", "video/webm"]);
  const PROFILE_COMMENT_MAX_LENGTH = 280;
  const PROFILE_COMMENT_MEDIA_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
  ]);
  const PROFILE_COMMENT_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
  const PROFILE_COMMENT_GIF_MAX_BYTES = 700 * 1024;
  const PROFILE_COMMENT_MEDIA_MAX_DIMENSION = 820;
  const PROFILE_COMMENT_MEDIA_EXPORT_QUALITY = 0.72;
  const PROFILE_COMMENT_MEDIA_MIN_EXPORT_QUALITY = 0.48;
  const PROFILE_COMMENT_MEDIA_EXPORT_QUALITY_STEP = 0.08;
  const PROFILE_COMMENT_MEDIA_MAX_DATA_URL_LENGTH = 760000;
  const PROFILE_LOOKUP_TIMEOUT_MS = 5000;
  const SUPABASE_SYNC_REQUEST_TIMEOUT_MS = 12000;
  const AUTH_SIGN_OUT_TIMEOUT_MS = 4000;
  const ACCOUNT_DELETE_TIMEOUT_MS = 15000;
  const PROFILE_RUNTIME_CACHE_TTL_MS = 2 * 60 * 1000;
  const PROFILE_FORCE_FRESH_WINDOW_MS = 45 * 1000;
  const PROFILE_SEARCH_RUNTIME_CACHE_TTL_MS = 45 * 1000;
  const ONLINE_USERS_RUNTIME_CACHE_TTL_MS = 8 * 1000;
  const PRESENCE_ONLINE_WINDOW_MS = 90 * 1000;
  const PRESENCE_HEARTBEAT_INTERVAL_MS = 45 * 1000;
  const PRESENCE_VISIT_RECORD_COOLDOWN_MS = 5 * 60 * 1000;
  const PRESENCE_TAB_REGISTRY_STORAGE_KEY = "sakura-presence-tabs-v1";
  const PRESENCE_TAB_REGISTRY_MAX_AGE_MS =
    PRESENCE_ONLINE_WINDOW_MS + PRESENCE_HEARTBEAT_INTERVAL_MS;
  const DISPLAY_NAME_MAX_LENGTH = 48;
  const USER_UPDATE_EVENT = "sakura-user-update";
  const AUTH_ERROR_EVENT = "sakura-auth-error";
  const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
  const PRESENCE_DIRTY_EVENT = "sakura-presence-dirty";
  const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
  const AUTH_SNAPSHOT_CACHE_STORAGE_KEY = "sakura-auth-snapshot-v1";
  const SUPABASE_PROVIDER_TOKEN_STORAGE_KEY = "sakura-supabase-provider-token";
  const SUPABASE_PROVIDER_REFRESH_TOKEN_STORAGE_KEY =
    "sakura-supabase-provider-refresh-token";
  const SUPABASE_PROVIDER_ID_STORAGE_KEY = "sakura-supabase-provider-id";
  const PROFILE_CACHE_KEY_PREFIX = "sakura-profile-cache-v1:";
  const AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);
  const LOGIN_PATTERN = /^[A-Za-z\u0400-\u04FF0-9._-]+$/;
  const profileByIdRuntimeCache = new Map();
  const profileByAuthorRuntimeCache = new Map();
  const profilesByPrefixRuntimeCache = new Map();
  const runtimePendingLookupCache = new Map();
  const profileForceFreshUntil = new Map();

  const createFirebaseError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const hasOwn = (value, key) =>
    Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);

  const resolvePhotoURL = (details, fallbackPhotoURL = null) =>
    hasOwn(details, "photoURL") ? details.photoURL ?? null : fallbackPhotoURL ?? null;
  const resolveAvatarPath = (details, fallbackAvatarPath = null) =>
    hasOwn(details, "avatarPath") ? details.avatarPath ?? null : fallbackAvatarPath ?? null;
  const resolveAvatarType = (details, fallbackAvatarType = null) =>
    hasOwn(details, "avatarType") ? details.avatarType ?? null : fallbackAvatarType ?? null;
  const resolveAvatarSize = (details, fallbackAvatarSize = null) =>
    hasOwn(details, "avatarSize") ? details.avatarSize ?? null : fallbackAvatarSize ?? null;
  const resolveBannedAt = (details, fallbackBannedAt = null) =>
    hasOwn(details, "bannedAt")
      ? typeof details.bannedAt === "string"
        ? details.bannedAt
        : null
      : fallbackBannedAt ?? null;

  const readCachedAuthSnapshot = () => {
    try {
      const rawSnapshot = window.localStorage?.getItem(AUTH_SNAPSHOT_CACHE_STORAGE_KEY);

      if (!rawSnapshot) {
        return null;
      }

      const parsedSnapshot = JSON.parse(rawSnapshot);

      if (!parsedSnapshot || typeof parsedSnapshot.uid !== "string") {
        window.localStorage?.removeItem(AUTH_SNAPSHOT_CACHE_STORAGE_KEY);
        return null;
      }

      return parsedSnapshot;
    } catch (error) {
      return null;
    }
  };

  const persistCachedAuthSnapshot = (snapshot) => {
    try {
      if (snapshot && !snapshot.isAnonymous && typeof snapshot.uid === "string") {
        window.localStorage?.setItem(
          AUTH_SNAPSHOT_CACHE_STORAGE_KEY,
          JSON.stringify(snapshot)
        );
        return;
      }

      window.localStorage?.removeItem(AUTH_SNAPSHOT_CACHE_STORAGE_KEY);
    } catch (error) {}
  };

  if (!window.sakuraCurrentUserSnapshot) {
    window.sakuraCurrentUserSnapshot = readCachedAuthSnapshot();
  }

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
  const waitForDelay = (delayMs) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
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
    if (PASSTHROUGH_AVATAR_CONTENT_TYPES.has(file.type)) {
      return readFileAsDataUrl(file);
    }

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

  const normalizeAvatarUploadPath = (value) =>
    typeof value === "string" && value ? value : null;
  const normalizeAvatarUploadType = (value) =>
    typeof value === "string" && AVATAR_CONTENT_TYPES.has(value)
      ? value
      : null;
  const normalizeAvatarUploadSize = (value) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.round(value)
      : null;
  const toPreparedAvatarUpload = (value) => {
    if (!value || typeof value !== "object" || value instanceof File) {
      return null;
    }

    const photoURL = typeof value.photoURL === "string" && value.photoURL ? value.photoURL : null;

    if (!photoURL) {
      return null;
    }

    return {
      photoURL,
      avatarPath: normalizeAvatarUploadPath(value.avatarPath),
      avatarType: normalizeAvatarUploadType(value.avatarType),
      avatarSize: normalizeAvatarUploadSize(value.avatarSize),
    };
  };
  const prepareAvatarUpload = async (value, uid) => {
    if (value instanceof File) {
      return {
        photoURL: await resolvePersistedAvatarUrl(uid, value),
        avatarPath: null,
        avatarType: null,
        avatarSize: null,
      };
    }

    return toPreparedAvatarUpload(value);
  };

  const createInlineCommentMedia = async (file) => {
    if (!(file instanceof File)) {
      return null;
    }

    if (!PROFILE_COMMENT_MEDIA_CONTENT_TYPES.has(file.type)) {
      throw createFirebaseError(
        "comments/media-unsupported",
        "Only PNG, JPG, WEBP, GIF, MP4, and WEBM files are supported in comments."
      );
    }

    if (file.type === "video/mp4" || file.type === "video/webm") {
      throw createFirebaseError(
        "comments/media-upload-required",
        "Video attachments require Supabase media upload."
      );
    }

    if (file.type === "image/gif") {
      if (file.size > PROFILE_COMMENT_GIF_MAX_BYTES) {
        throw createFirebaseError(
          "comments/media-too-large",
          "GIF attachments for comments must stay under 700 KB."
        );
      }

      const mediaURL = await readFileAsDataUrl(file);

      if (mediaURL.length > PROFILE_COMMENT_MEDIA_MAX_DATA_URL_LENGTH) {
        throw createFirebaseError(
          "comments/media-too-large",
          "The selected GIF is too large to save in a Firestore comment."
        );
      }

      return {
        mediaURL,
        mediaType: file.type,
      };
    }

    if (file.size > PROFILE_COMMENT_MEDIA_MAX_BYTES) {
      throw createFirebaseError(
        "comments/media-too-large",
        "Comment images must stay under 5 MB before compression."
      );
    }

    const image = await loadAvatarSource(file);
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;

    if (!width || !height) {
      throw createFirebaseError(
        "comments/media-invalid",
        "The selected image is empty."
      );
    }

    const scale = Math.min(
      1,
      PROFILE_COMMENT_MEDIA_MAX_DIMENSION / Math.max(width, height)
    );
    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw createFirebaseError(
        "comments/media-invalid",
        "Could not prepare the selected image."
      );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    if ("close" in image && typeof image.close === "function") {
      image.close();
    }

    let mediaURL = "";
    let mediaType = "";
    let exportQuality = PROFILE_COMMENT_MEDIA_EXPORT_QUALITY;

    while (exportQuality >= PROFILE_COMMENT_MEDIA_MIN_EXPORT_QUALITY) {
      const webpMediaURL = canvas.toDataURL("image/webp", exportQuality);

      if (
        webpMediaURL.startsWith("data:image/webp") &&
        webpMediaURL.length <= PROFILE_COMMENT_MEDIA_MAX_DATA_URL_LENGTH
      ) {
        mediaURL = webpMediaURL;
        mediaType = "image/webp";
        break;
      }

      const jpegMediaURL = canvas.toDataURL("image/jpeg", exportQuality);

      if (jpegMediaURL.length <= PROFILE_COMMENT_MEDIA_MAX_DATA_URL_LENGTH) {
        mediaURL = jpegMediaURL;
        mediaType = "image/jpeg";
        break;
      }

      exportQuality -= PROFILE_COMMENT_MEDIA_EXPORT_QUALITY_STEP;
    }

    if (!mediaURL || mediaURL.length > PROFILE_COMMENT_MEDIA_MAX_DATA_URL_LENGTH) {
      throw createFirebaseError(
        "comments/media-too-large",
        "The selected image is too large to save in a Firestore comment."
      );
    }

    return {
      mediaURL,
      mediaType,
    };
  };

  const normalizeProfileCommentMediaPath = (value) =>
    typeof value === "string" && value ? value : null;
  const normalizeProfileCommentMediaSize = (value) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? Math.round(value)
      : null;
  const toPreparedProfileCommentMedia = (value) => {
    if (!value || typeof value !== "object" || value instanceof File) {
      return null;
    }

    const mediaURL = typeof value.mediaURL === "string" && value.mediaURL ? value.mediaURL : null;
    const mediaType =
      typeof value.mediaType === "string" && PROFILE_COMMENT_MEDIA_CONTENT_TYPES.has(value.mediaType)
        ? value.mediaType
        : null;

    if (!mediaURL || !mediaType) {
      return null;
    }

    return {
      mediaURL,
      mediaType,
      mediaPath: normalizeProfileCommentMediaPath(value.mediaPath),
      mediaSize: normalizeProfileCommentMediaSize(value.mediaSize),
    };
  };
  const prepareProfileCommentMedia = async (value) => {
    if (value instanceof File) {
      const inlineMedia = await createInlineCommentMedia(value);

      return inlineMedia
        ? {
            ...inlineMedia,
            mediaPath: null,
            mediaSize: null,
          }
        : null;
    }

    return toPreparedProfileCommentMedia(value);
  };

  const getAvatarStorageExtension = (file) => {
    switch (file?.type) {
      case "image/gif":
        return "gif";
      case "image/webp":
        return "webp";
      case "video/mp4":
        return "mp4";
      case "video/webm":
        return "webm";
      default:
        return null;
    }
  };

  const getErrorCode = (error) =>
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const shouldFallbackGooglePopupToRedirect = (error) => {
    const code = getErrorCode(error);

    return (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    );
  };

  const isPermissionDeniedError = (error) =>
    getErrorCode(error) === "permission-denied" ||
    (error instanceof Error && /Missing or insufficient permissions/i.test(error.message));

  const isFirestoreDocumentTooLargeError = (error) =>
    error instanceof Error &&
    /cannot be written because its size .* exceeds the maximum allowed size/i.test(error.message);

  const sanitizeLogin = (value) =>
    typeof value === "string"
      ? value
          .normalize("NFKC")
          .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
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

  const normalizeRuntimeProviderId = (providerId) => {
    if (typeof providerId !== "string") {
      return null;
    }

    const normalizedProviderId = providerId.trim();

    if (!normalizedProviderId) {
      return null;
    }

    if (normalizedProviderId === "google") {
      return "google.com";
    }

    if (normalizedProviderId === "email") {
      return "password";
    }

    return normalizedProviderId;
  };
  const getProviderIds = (user) => {
    const firebaseProviderIds = Array.isArray(user?.providerData)
      ? user.providerData
          .map((providerData) => normalizeRuntimeProviderId(providerData?.providerId))
          .filter(Boolean)
      : [];
    const nonCustomFirebaseProviderIds = firebaseProviderIds.filter(
      (providerId) => providerId !== "custom"
    );

    if (nonCustomFirebaseProviderIds.length) {
      return [...new Set(nonCustomFirebaseProviderIds)];
    }

    const supabaseProviderIds = normalizeProviderIdsList(
      window.sakuraSupabaseCurrentUserSnapshot?.providerIds ?? []
    )
      .map((providerId) => normalizeRuntimeProviderId(providerId))
      .filter(Boolean);

    if (supabaseProviderIds.length) {
      return [...new Set(supabaseProviderIds)];
    }

    return [...new Set(firebaseProviderIds)];
  };

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

    if (compactRole === "support" || compactRole === "supp0rt") {
      return "support";
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
    "subscriber",
  ]);
  const ROLE_SORT_ORDER = new Map([
    ["root", 0],
    ["co-owner", 1],
    ["super administrator", 2],
    ["administrator", 3],
    ["moderator", 4],
    ["support", 5],
    ["sponsor", 6],
    ["tester", 7],
    ["user", 8],
  ]);
  const COMMENT_ACCENT_ROLE_ORDER = new Map([
    ["root", 0],
    ["co-owner", 1],
    ["super administrator", 2],
    ["administrator", 3],
    ["moderator", 4],
    ["support", 5],
    ["sponsor", 6],
    ["tester", 7],
    ["subscriber", 8],
    ["user", 9],
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
        .filter((role) => !REMOVED_ROLE_NAMES.has(role))
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

  const ROLE_MANAGER_NAMES = new Set(["root", "co-owner"]);
  const COMMENT_MODERATOR_ROLE_NAMES = new Set([
    "root",
    "co-owner",
    "super administrator",
    "administrator",
    "support",
    "moderator",
  ]);
  const canManageRoles = (roles) =>
    normalizeRoles(roles).some((role) => ROLE_MANAGER_NAMES.has(normalizeRoleName(role)));
  const hasRole = (roles, expectedRole) =>
    normalizeRoles(roles).some(
      (role) => normalizeRoleName(role) === normalizeRoleName(expectedRole)
    );
  const isRootRoleHolder = (roles) => hasRole(roles, "root");
  const isCoOwnerRoleHolder = (roles) => hasRole(roles, "co-owner");
  const ensureActorCanManageTargetProfile = (actorRoles, targetRoles) => {
    if (isRootRoleHolder(actorRoles)) {
      return;
    }

    if (isCoOwnerRoleHolder(actorRoles) && isRootRoleHolder(targetRoles)) {
      throw createFirebaseError(
        "admin/root-target-forbidden",
        "Co-owner cannot manage root accounts."
      );
    }
  };
  const ensureActorCanAssignRoles = (actorRoles, targetRoles, nextRoles) => {
    ensureActorCanManageTargetProfile(actorRoles, targetRoles);

    if (!isRootRoleHolder(actorRoles) && isRootRoleHolder(nextRoles)) {
      throw createFirebaseError(
        "roles/root-assignment-forbidden",
        "Only root can assign the root role."
      );
    }
  };
  const canModerateComments = (roles) =>
    normalizeRoles(roles).some((role) =>
      COMMENT_MODERATOR_ROLE_NAMES.has(normalizeRoleName(role))
    );
  const canDeleteCommentAsModerator = async (actorSnapshot, comment) => {
    const actorRoles = normalizeRoles(actorSnapshot?.roles);

    if (!canModerateComments(actorRoles)) {
      return false;
    }

    if (isRootRoleHolder(actorRoles)) {
      return true;
    }

    const ownsTargetProfile =
      typeof actorSnapshot?.profileId === "number" &&
      typeof comment?.profileId === "number" &&
      actorSnapshot.profileId === comment.profileId;

    if (
      isCoOwnerRoleHolder(actorRoles) &&
      !ownsTargetProfile
    ) {
      const fallbackAuthorRole = normalizeRoleName(comment?.authorAccentRole ?? "");

      if (fallbackAuthorRole === "root") {
        return false;
      }

      if (typeof comment?.authorUid === "string" && comment.authorUid) {
        try {
          const authorSnapshot = await getDoc(userRefFor(comment.authorUid));

          if (authorSnapshot.exists()) {
            const authorRoles = normalizeRoles(authorSnapshot.data()?.roles);

            if (isRootRoleHolder(authorRoles)) {
              return false;
            }
          }
        } catch (error) {
        }
      }
    }

    return true;
  };
  const canUseEnhancedAvatarMedia = (roles) =>
    normalizeRoles(roles).some((role) => {
      const normalizedRole = normalizeRoleName(role);
      return normalizedRole && normalizedRole !== "user";
    });
  const normalizeProviderIdsList = (providerIds) =>
    Array.isArray(providerIds)
      ? providerIds
          .filter((providerId) => typeof providerId === "string")
          .map((providerId) => providerId.trim())
          .filter(Boolean)
      : [];
  const isGoogleProviderId = (providerId) =>
    typeof providerId === "string" &&
    (providerId.trim() === "google.com" || providerId.trim() === "google");
  const hasTrustedEmailProvider = (providerIds) =>
    normalizeProviderIdsList(providerIds).some((providerId) => isGoogleProviderId(providerId));
  const resolveEmailVerifiedState = (user, details = {}) => {
    const providerIds =
      Array.isArray(details.providerIds) && details.providerIds.length
        ? details.providerIds
        : getProviderIds(user);
    const baseEmailVerified =
      typeof details.emailVerified === "boolean"
        ? details.emailVerified
        : Boolean(user?.emailVerified);

    return baseEmailVerified || hasTrustedEmailProvider(providerIds);
  };
  const resolveVerificationRequired = (roles, providerIds, explicitValue) => {
    if (hasTrustedEmailProvider(providerIds)) {
      return false;
    }

    if (typeof explicitValue === "boolean") {
      return explicitValue;
    }

    return requiresEmailVerification(roles);
  };
  const ensureAvatarUploadAllowedForRoles = (avatarType, roles) => {
    if (!PREMIUM_AVATAR_CONTENT_TYPES.has(avatarType ?? "")) {
      return;
    }

    if (!canUseEnhancedAvatarMedia(roles)) {
      throw createFirebaseError(
        "avatar/upgrade-required",
        "Вам нужно повышение профиля, чтобы использовать GIF и видео в аватаре. Для роли user доступны только статичные картинки."
      );
    }
  };
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
  const isPresenceFreshOnline = (presence) => {
    const normalizedPresence = normalizePresence(presence, null);
    const lastSeenAt = normalizedPresence.lastSeenAt ? Date.parse(normalizedPresence.lastSeenAt) : Number.NaN;

    return (
      normalizedPresence.status === "online" &&
      normalizedPresence.isOnline &&
      Number.isFinite(lastSeenAt) &&
      Date.now() - lastSeenAt <= PRESENCE_ONLINE_WINDOW_MS
    );
  };

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
  const normalizeProfileCommentMediaURL = (value) =>
    typeof value === "string" && value ? value : null;
  const normalizeProfileCommentMediaType = (value) =>
    typeof value === "string" && PROFILE_COMMENT_MEDIA_CONTENT_TYPES.has(value)
      ? value
      : null;
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
  const readRuntimeCacheEntry = (cache, key) => {
    if (!cache.has(key)) {
      return { hit: false, value: null };
    }

    const cachedEntry = cache.get(key);

    if (!cachedEntry || cachedEntry.expiresAt <= Date.now()) {
      cache.delete(key);
      return { hit: false, value: null };
    }

    return { hit: true, value: cachedEntry.value };
  };
  const writeRuntimeCacheEntry = (cache, key, value, ttlMs) => {
    cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    return value;
  };
  const markProfileForFreshFetch = (profileId, ttlMs = PROFILE_FORCE_FRESH_WINDOW_MS) => {
    const normalizedProfileId = normalizeSupabaseInteger(profileId);

    if (normalizedProfileId === null || normalizedProfileId <= 0) {
      return;
    }

    profileForceFreshUntil.set(normalizedProfileId, Date.now() + ttlMs);
    profileByIdRuntimeCache.delete(String(normalizedProfileId));
    runtimePendingLookupCache.delete("profile-by-id:" + normalizedProfileId);
  };
  const shouldForceFreshProfileFetch = (profileId) => {
    const normalizedProfileId = normalizeSupabaseInteger(profileId);

    if (normalizedProfileId === null || normalizedProfileId <= 0) {
      return false;
    }

    const freshUntil = profileForceFreshUntil.get(normalizedProfileId);

    if (typeof freshUntil !== "number") {
      return false;
    }

    if (freshUntil <= Date.now()) {
      profileForceFreshUntil.delete(normalizedProfileId);
      return false;
    }

    return true;
  };
  const runCachedLookup = async (cache, key, ttlMs, pendingKey, loader) => {
    const cachedEntry = readRuntimeCacheEntry(cache, key);

    if (cachedEntry.hit) {
      return cachedEntry.value;
    }

    if (runtimePendingLookupCache.has(pendingKey)) {
      return runtimePendingLookupCache.get(pendingKey);
    }

    const pendingLookup = Promise.resolve()
      .then(loader)
      .then((value) => {
        writeRuntimeCacheEntry(cache, key, value, ttlMs);
        runtimePendingLookupCache.delete(pendingKey);
        return value;
      })
      .catch((error) => {
        runtimePendingLookupCache.delete(pendingKey);
        throw error;
      });

    runtimePendingLookupCache.set(pendingKey, pendingLookup);
    return pendingLookup;
  };
  const cacheResolvedProfileSnapshot = (snapshot) => {
    if (!snapshot || snapshot.isAnonymous) {
      return snapshot;
    }

    if (typeof snapshot.profileId === "number" && snapshot.profileId > 0) {
      writeRuntimeCacheEntry(
        profileByIdRuntimeCache,
        String(snapshot.profileId),
        snapshot,
        PROFILE_RUNTIME_CACHE_TTL_MS
      );
    }

    const normalizedLogin = normalizeLogin(snapshot.login);
    const normalizedDisplayName = normalizeProfileCommentAuthorName(snapshot.displayName);

    if (normalizedLogin) {
      writeRuntimeCacheEntry(
        profileByAuthorRuntimeCache,
        normalizedLogin,
        snapshot,
        PROFILE_RUNTIME_CACHE_TTL_MS
      );
    }

    if (normalizedDisplayName) {
      writeRuntimeCacheEntry(
        profileByAuthorRuntimeCache,
        normalizedDisplayName,
        snapshot,
        PROFILE_RUNTIME_CACHE_TTL_MS
      );
    }

    return snapshot;
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
    mediaURL: normalizeProfileCommentMediaURL(details.mediaURL),
    mediaType: normalizeProfileCommentMediaType(details.mediaType),
    mediaPath: normalizeProfileCommentMediaPath(details.mediaPath),
    mediaSize: normalizeProfileCommentMediaSize(details.mediaSize),
    createdAt: normalizeProfileCommentCreatedAt(details.createdAt),
    updatedAt: normalizeProfileCommentCreatedAt(details.updatedAt),
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
        authorUid:
          typeof authorDetails?.uid === "string" && authorDetails.uid
            ? authorDetails.uid
            : comment.authorUid,
        authorProfileId:
          typeof authorDetails?.profileId === "number"
            ? authorDetails.profileId
            : comment.authorProfileId,
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

    const providerIds = getProviderIds(user);

      return {
        login: fallbackLogin,
        loginLower: fallbackLogin ? normalizeLogin(fallbackLogin) : null,
        displayName:
          preferredDisplayName ??
          user.displayName ??
          fallbackLogin ??
          user.email?.split("@")[0] ??
          null,
        emailVerified: resolveEmailVerifiedState(user, { providerIds }),
        profileId: null,
        photoURL: null,
        providerIds,
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
    emailVerified: resolveEmailVerifiedState(user, details),
    profileId: typeof details.profileId === "number" ? details.profileId : null,
    photoURL: resolvePhotoURL(details, null),
    avatarPath: resolveAvatarPath(details, null),
    avatarType: resolveAvatarType(details, null),
    avatarSize: resolveAvatarSize(details, null),
    providerIds: normalizeProviderIdsList(
      Array.isArray(details.providerIds) ? details.providerIds : getProviderIds(user)
    ),
    roles: normalizeRoles(details.roles),
    isBanned: details.isBanned === true,
    bannedAt: resolveBannedAt(details),
    verificationRequired: resolveVerificationRequired(
      details.roles,
      Array.isArray(details.providerIds) ? details.providerIds : getProviderIds(user),
      details.verificationRequired
    ),
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
          emailVerified: resolveEmailVerifiedState(user, details),
          login: details.login ?? null,
          displayName: details.displayName ?? user.displayName ?? details.login ?? null,
          profileId: typeof details.profileId === "number" ? details.profileId : null,
          photoURL: resolvePhotoURL(details, null),
          avatarPath: resolveAvatarPath(details, null),
          avatarType: resolveAvatarType(details, null),
          avatarSize: resolveAvatarSize(details, null),
          roles: normalizeRoles(details.roles),
          isBanned: details.isBanned === true,
          bannedAt: resolveBannedAt(details),
          verificationRequired: resolveVerificationRequired(
            details.roles,
            Array.isArray(details.providerIds) ? details.providerIds : getProviderIds(user),
            details.verificationRequired
          ),
          providerIds: normalizeProviderIdsList(
            Array.isArray(details.providerIds) ? details.providerIds : getProviderIds(user)
          ),
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
    avatarPath: resolveAvatarPath(details, null),
    avatarType: resolveAvatarType(details, null),
    avatarSize: resolveAvatarSize(details, null),
    roles: normalizeRoles(details.roles),
    isBanned: details.isBanned === true,
    bannedAt: resolveBannedAt(details),
    verificationRequired: resolveVerificationRequired(
      details.roles,
      Array.isArray(details.providerIds) ? details.providerIds : [],
      details.verificationRequired
    ),
    providerIds: normalizeProviderIdsList(details.providerIds),
    creationTime: typeof details.creationTime === "string" ? details.creationTime : null,
    lastSignInTime: typeof details.lastSignInTime === "string" ? details.lastSignInTime : null,
    loginHistory: Array.isArray(details.loginHistory)
      ? details.loginHistory.filter((entry) => typeof entry === "string")
      : [],
    visitHistory: normalizeVisitHistory(details.visitHistory),
    presence: normalizePresence(details.presence, null),
  });

  const SUPABASE_PUBLIC_URL = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")};
  const SUPABASE_PUBLIC_ANON_KEY = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "")};
  const SUPABASE_REST_URL = SUPABASE_PUBLIC_URL
    ? SUPABASE_PUBLIC_URL.replace(/\\/+$/, "") + "/rest/v1"
    : "";
  const SUPABASE_PUBLIC_READS_ENABLED = Boolean(
    SUPABASE_REST_URL && SUPABASE_PUBLIC_ANON_KEY
  );
  const SUPABASE_LIVE_SYNC_ENABLED =
    ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_LIVE_SYNC_ENABLED ?? "")} === "true";
  const resolveSupabaseFunctionUrl = (functionName, explicitUrl) => {
    if (explicitUrl) {
      return explicitUrl;
    }

    if (!SUPABASE_PUBLIC_URL) {
      return "";
    }

    try {
      const baseUrl = new URL(SUPABASE_PUBLIC_URL);
      const baseSuffix = ".supabase.co";
      const nextHost = baseUrl.host.endsWith(baseSuffix)
        ? baseUrl.host.slice(0, baseUrl.host.length - baseSuffix.length) + ".functions.supabase.co"
        : baseUrl.host;

      return baseUrl.protocol + "//" + nextHost + "/" + functionName;
    } catch (error) {
      return "";
    }
  };
  const SUPABASE_SYNC_FUNCTION_URL = (() => {
    const explicitUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_SYNC_FUNCTION_URL ?? "")};
    return resolveSupabaseFunctionUrl("firebase-sync", explicitUrl);
  })();
  const SUPABASE_AUTH_BRIDGE_FUNCTION_URL = (() => {
    const explicitUrl = ${JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_AUTH_BRIDGE_FUNCTION_URL ?? ""
    )};
    return resolveSupabaseFunctionUrl("firebase-auth-bridge", explicitUrl);
  })();
  const SUPABASE_LIVE_SYNC_ACTIVE = Boolean(
    SUPABASE_LIVE_SYNC_ENABLED && SUPABASE_SYNC_FUNCTION_URL
  );
  const SUPABASE_PROFILE_SELECT = [
    "auth_user_id",
    "firebase_uid",
    "profile_id",
    "email",
    "email_verified",
    "verification_required",
    "login",
    "display_name",
    "photo_url",
    "avatar_path",
    "avatar_type",
    "avatar_size",
    "roles",
    "is_banned",
    "banned_at",
    "provider_ids",
    "login_history",
    "visit_history",
    "created_at",
    "last_sign_in_at"
  ].join(",");
  const SUPABASE_PROFILE_PRESENCE_SELECT = [
    "profile_id",
    "status",
    "is_online",
    "current_path",
    "last_seen_at"
  ].join(",");
  const SUPABASE_PROFILE_COMMENT_SELECT = [
    "id",
    "profile_id",
    "author_profile_id",
    "auth_user_id",
    "firebase_author_uid",
    "author_name",
    "author_photo_url",
    "author_accent_role",
    "message",
    "media_url",
    "media_type",
    "media_path",
    "media_size",
    "created_at",
    "updated_at"
  ].join(",");

  const normalizeSupabaseInteger = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string" && /^-?\\d+$/.test(value.trim())) {
      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : null;
    }

    return null;
  };
  const isUuidLike = (value) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    );

  const buildSupabaseRestUrl = (table, query = {}) => {
    const url = new URL(SUPABASE_REST_URL + "/" + table);

    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });

    return url.toString();
  };
  const buildSupabaseRpcUrl = (functionName) => SUPABASE_REST_URL + "/rpc/" + functionName;

  const fetchSupabaseRows = async (table, query = {}, options = {}) => {
    if (!SUPABASE_PUBLIC_READS_ENABLED) {
      return null;
    }

    try {
      const response = await fetch(buildSupabaseRestUrl(table, query), {
        cache: options.forceFresh ? "no-store" : "default",
        headers: {
          apikey: SUPABASE_PUBLIC_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_PUBLIC_ANON_KEY,
          "Accept-Profile": "public",
          Accept: "application/json",
          ...(options.forceFresh
            ? {
                "Cache-Control": "no-cache, no-store, max-age=0",
                Pragma: "no-cache",
              }
            : {}),
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return Array.isArray(payload) ? payload : null;
    } catch (error) {
      return null;
    }
  };

  const normalizeSupabaseTextArray = (value) =>
    Array.isArray(value)
      ? value.filter((entry) => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
      : [];
  const getSupabaseBridgeAccessTokenEarly = async () => {
    try {
      if (!window.sakuraSupabaseAuth && typeof window.sakuraStartSupabaseAuth === "function") {
        await window.sakuraStartSupabaseAuth();
      }
    } catch (error) {
    }

    if (
      typeof window.sakuraSupabaseCurrentSession?.access_token === "string" &&
      window.sakuraSupabaseCurrentSession.access_token
    ) {
      return window.sakuraSupabaseCurrentSession.access_token;
    }

    try {
      if (window.sakuraSupabaseAuth?.getSession) {
        const session = await window.sakuraSupabaseAuth.getSession();
        return typeof session?.access_token === "string" && session.access_token
          ? session.access_token
          : null;
      }
    } catch (error) {
    }

    return null;
  };

  const getSupabaseSyncToken = async (user) => {
    if (!user || typeof user.getIdToken !== "function") {
      return null;
    }

    try {
      return await user.getIdToken();
    } catch (error) {
      return null;
    }
  };

  const postSupabaseSyncAction = async (user, action, payload) => {
    if (!SUPABASE_LIVE_SYNC_ACTIVE) {
      return false;
    }

    const idToken = await getSupabaseSyncToken(user);

    if (!idToken) {
      return false;
    }

    try {
      const response = await fetch(SUPABASE_SYNC_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Supabase live sync rejected action:", action, response.status, errorText);
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error("Supabase live sync failed:", error);
      return false;
    }
  };

  const requestSupabaseSyncAction = async (user, action, payload = {}) => {
    if (!SUPABASE_LIVE_SYNC_ACTIVE || !SUPABASE_SYNC_FUNCTION_URL) {
      throw createFirebaseError(
        "supabase-sync/unavailable",
        "Supabase live sync is not configured for this build."
      );
    }

    const idToken = await getSupabaseSyncToken(user);
    const supabaseAccessToken = await getSupabaseBridgeAccessTokenEarly();
    const actorToken = idToken || supabaseAccessToken;

    if (!actorToken) {
      throw createFirebaseError(
        "auth/no-current-user",
        "Sign in again before syncing with Supabase."
      );
    }

    const response = await withTimeout(
      fetch(SUPABASE_SYNC_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + actorToken,
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      }),
      SUPABASE_SYNC_REQUEST_TIMEOUT_MS,
      () =>
        createFirebaseError(
          "supabase-sync/timeout",
          "Supabase live sync request timed out. Try again."
        )
    );

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof responseBody?.error === "string" && responseBody.error
          ? responseBody.error
          : "Supabase live sync request failed.";
      throw createFirebaseError("supabase-sync/request-failed", message);
    }

    return responseBody;
  };
  const requestSupabaseSyncActionOrThrow = async (
    user,
    action,
    payload = {},
    errorCode = "supabase-sync/request-failed",
    fallbackMessage = "Supabase live sync request failed."
  ) => {
    try {
      return await requestSupabaseSyncAction(user, action, payload);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : fallbackMessage;
      throw createFirebaseError(errorCode, message);
    }
  };
  const loadPrivateProfileFieldsFromSupabaseSync = async (user, profileId) => {
    if (!user || user.isAnonymous || !Number.isInteger(profileId) || profileId <= 0) {
      return null;
    }

    const response = await requestSupabaseSyncActionOrThrow(
      user,
      "get_private_profile_fields",
      { profileId },
      "profile/private-fields-unavailable",
      "Private profile fields could not be loaded."
    );
    const fields =
      response && typeof response.fields === "object" && response.fields ? response.fields : null;

    if (!fields) {
      return null;
    }

    return {
      email: typeof fields.email === "string" && fields.email.trim() ? fields.email.trim() : null,
      emailVerified:
        typeof fields.emailVerified === "boolean" ? fields.emailVerified : null,
      verificationRequired:
        typeof fields.verificationRequired === "boolean"
          ? fields.verificationRequired
          : null,
      providerIds: normalizeProviderIdsList(fields.providerIds),
    };
  };
  const loadPrivateProfileFieldsFromSupabaseRpc = async (profileId) => {
    if (!SUPABASE_PUBLIC_READS_ENABLED || !Number.isInteger(profileId) || profileId <= 0) {
      return null;
    }

    const accessToken = await getSupabaseBridgeAccessTokenEarly();

    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch(buildSupabaseRpcUrl("get_private_profile_fields_rpc"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLIC_ANON_KEY,
          Authorization: "Bearer " + accessToken,
          "Accept-Profile": "public",
          "Content-Profile": "public",
          Accept: "application/json",
        },
        body: JSON.stringify({
          target_profile_id: profileId,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json().catch(() => null);

      if (!payload || typeof payload !== "object") {
        return null;
      }

      return {
        email:
          typeof payload.email === "string" && payload.email.trim()
            ? payload.email.trim()
            : null,
        emailVerified:
          typeof payload.emailVerified === "boolean" ? payload.emailVerified : null,
        verificationRequired:
          typeof payload.verificationRequired === "boolean"
            ? payload.verificationRequired
            : null,
        providerIds: normalizeProviderIdsList(payload.providerIds),
      };
    } catch (error) {
      return null;
    }
  };
  const resolveSupabaseEmailForLogin = async (loginLower) => {
    if (!SUPABASE_PUBLIC_READS_ENABLED || typeof loginLower !== "string" || !loginLower) {
      return null;
    }

    try {
      const response = await fetch(buildSupabaseRpcUrl("resolve_signin_email_for_login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLIC_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_PUBLIC_ANON_KEY,
          "Accept-Profile": "public",
          "Content-Profile": "public",
          Accept: "application/json",
        },
        body: JSON.stringify({
          target_login: loginLower,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json().catch(() => null);

      return typeof payload === "string" && payload.trim() ? payload.trim() : null;
    } catch (error) {
      return null;
    }
  };
  const loadCurrentAuthProfileFromSupabaseRpc = async () => {
    if (!SUPABASE_PUBLIC_READS_ENABLED) {
      return null;
    }

    const accessToken = await getSupabaseBridgeAccessTokenEarly();

    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch(buildSupabaseRpcUrl("get_current_auth_profile_rpc"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLIC_ANON_KEY,
          Authorization: "Bearer " + accessToken,
          "Accept-Profile": "public",
          "Content-Profile": "public",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json().catch(() => null);

      if (!payload || typeof payload !== "object") {
        return null;
      }

      const login =
        typeof payload.login === "string" && payload.login.trim() ? payload.login.trim() : null;
      const providerIds = normalizeProviderIdsList(payload.providerIds);

      return {
        authUserId:
          typeof payload.authUserId === "string" && payload.authUserId
            ? payload.authUserId
            : null,
        firebaseUid:
          typeof payload.firebaseUid === "string" && payload.firebaseUid
            ? payload.firebaseUid
            : null,
        email:
          typeof payload.email === "string" && payload.email.trim() ? payload.email.trim() : null,
        emailVerified:
          typeof payload.emailVerified === "boolean" ? payload.emailVerified : null,
        login,
        loginLower: login ? normalizeLogin(login) : null,
        displayName:
          typeof payload.displayName === "string" && payload.displayName.trim()
            ? payload.displayName.trim()
            : null,
        profileId: normalizeSupabaseInteger(payload.profileId),
        photoURL:
          typeof payload.photoURL === "string" && payload.photoURL ? payload.photoURL : null,
        avatarPath:
          typeof payload.avatarPath === "string" && payload.avatarPath ? payload.avatarPath : null,
        avatarType:
          typeof payload.avatarType === "string" && payload.avatarType ? payload.avatarType : null,
        avatarSize: normalizeSupabaseInteger(payload.avatarSize),
        roles: normalizeSupabaseTextArray(payload.roles),
        isBanned: payload.isBanned === true,
        bannedAt:
          typeof payload.bannedAt === "string" && payload.bannedAt ? payload.bannedAt : null,
        verificationRequired:
          typeof payload.verificationRequired === "boolean"
            ? payload.verificationRequired
            : null,
        verificationEmailSent:
          typeof payload.verificationEmailSent === "boolean"
            ? payload.verificationEmailSent
            : false,
        providerIds,
        creationTime:
          typeof payload.creationTime === "string" && payload.creationTime
            ? payload.creationTime
            : null,
        lastSignInTime:
          typeof payload.lastSignInTime === "string" && payload.lastSignInTime
            ? payload.lastSignInTime
            : null,
        loginHistory: Array.isArray(payload.loginHistory) ? payload.loginHistory : [],
        visitHistory: normalizeVisitHistory(payload.visitHistory),
        presence:
          payload.presence && typeof payload.presence === "object"
            ? normalizePresence(payload.presence, window.location.pathname)
            : normalizePresence(null, window.location.pathname),
      };
    } catch (error) {
      return null;
    }
  };
  const loadCurrentAuthProfileFromSupabaseRpcWithRetry = async ({
    attempts = 4,
    delayMs = 250,
  } = {}) => {
    const retryCount =
      Number.isFinite(attempts) && Number(attempts) > 0 ? Math.trunc(Number(attempts)) : 1;

    for (let attemptIndex = 0; attemptIndex < retryCount; attemptIndex += 1) {
      const profileDetails = await loadCurrentAuthProfileFromSupabaseRpc();

      if (typeof profileDetails?.profileId === "number" && profileDetails.profileId > 0) {
        return profileDetails;
      }

      if (attemptIndex < retryCount - 1) {
        await waitForDelay(delayMs);
      }
    }

    return null;
  };
  const createSupabaseProfileRpcError = (payload, fallbackMessage) => {
    const message =
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : typeof payload?.error === "string" && payload.error.trim()
          ? payload.error.trim()
          : fallbackMessage;

    if (message === "Login already in use.") {
      return createFirebaseError("auth/login-already-in-use", "This username is already taken.");
    }

    if (
      message === "Enter a login." ||
      message ===
        "Login must be 3-24 characters long and only contain letters, numbers, dots, underscores, or hyphens."
    ) {
      return createFirebaseError(
        "auth/invalid-login",
        "Username must be 3-24 characters and only contain letters, numbers, dots, underscores, or hyphens."
      );
    }

    if (message === "Display name is required.") {
      return createFirebaseError("display-name/empty", "Enter a profile name.");
    }

    if (message === "Comment id is invalid.") {
      return createFirebaseError("comments/invalid-id", "Comment id is required.");
    }

    if (
      message === "Write a comment or attach media before sending." ||
      message === "Write a comment or attach media before saving."
    ) {
      return createFirebaseError("comments/empty-message", message);
    }

    if (message === "Only the author, root, or co-owner can edit this comment.") {
      return createFirebaseError("comments/update-forbidden", message);
    }

    if (
      message ===
      "Only the author, profile owner, or comment moderator can delete this comment."
    ) {
      return createFirebaseError("comments/delete-forbidden", message);
    }

    if (message === "Only root can assign the root role.") {
      return createFirebaseError("roles/root-assignment-forbidden", message);
    }

    if (message === "Co-owner cannot manage root accounts.") {
      return createFirebaseError("admin/root-target-forbidden", message);
    }

    if (message === "You cannot ban your own account.") {
      return createFirebaseError("ban/self-forbidden", message);
    }

    if (message === "Target profile id is required.") {
      return createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
    }

    if (message === "Authentication required." || message === "Actor profile not found.") {
      return createFirebaseError("auth/no-current-user", "Sign in again to update your profile.");
    }

    return createFirebaseError("supabase/rpc-failed", message);
  };
  const callSupabaseAuthenticatedRpc = async (
    functionName,
    payload = {},
    fallbackMessage = "Supabase RPC request failed."
  ) => {
    if (!SUPABASE_PUBLIC_READS_ENABLED) {
      return null;
    }

    const accessToken = await getSupabaseBridgeAccessTokenEarly();

    if (!accessToken) {
      return null;
    }

    let response;

    try {
      response = await fetch(buildSupabaseRpcUrl(functionName), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLIC_ANON_KEY,
          Authorization: "Bearer " + accessToken,
          "Accept-Profile": "public",
          "Content-Profile": "public",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return null;
    }

    const responsePayload = await response.json().catch(() => null);

    if (!response.ok) {
      throw createSupabaseProfileRpcError(responsePayload, fallbackMessage);
    }

    return responsePayload;
  };
  const loadPrivateProfileFields = async (user, profileId) => {
    const rpcFields = await loadPrivateProfileFieldsFromSupabaseRpc(profileId);

    if (rpcFields) {
      return rpcFields;
    }

    return await loadPrivateProfileFieldsFromSupabaseSync(user, profileId);
  };

  const syncSupabaseProfileRecord = async (user, snapshot) => {
    if (
      !snapshot ||
      snapshot.isAnonymous ||
      typeof snapshot.uid !== "string" ||
      !snapshot.uid ||
      typeof snapshot.profileId !== "number" ||
      snapshot.profileId <= 0
    ) {
      return false;
    }

    return postSupabaseSyncAction(user, "upsert_profile", {
      profile: {
        firebaseUid: snapshot.uid,
        profileId: snapshot.profileId,
        login: typeof snapshot.login === "string" ? snapshot.login : null,
        displayName: typeof snapshot.displayName === "string" ? snapshot.displayName : null,
        photoURL: typeof snapshot.photoURL === "string" ? snapshot.photoURL : null,
        avatarPath: typeof snapshot.avatarPath === "string" ? snapshot.avatarPath : null,
        avatarType: typeof snapshot.avatarType === "string" ? snapshot.avatarType : null,
        avatarSize: normalizeSupabaseInteger(snapshot.avatarSize),
        roles: normalizeSupabaseTextArray(snapshot.roles),
        isBanned: snapshot.isBanned === true,
        bannedAt: typeof snapshot.bannedAt === "string" ? snapshot.bannedAt : null,
        emailVerified: snapshot.emailVerified === true,
        verificationRequired: snapshot.verificationRequired === true,
        createdAt: typeof snapshot.creationTime === "string" ? snapshot.creationTime : null,
        lastSignInTime:
          typeof snapshot.lastSignInTime === "string" ? snapshot.lastSignInTime : null,
      },
    });
  };

  const syncSupabasePasswordAccount = async (user, snapshot, email, password) => {
    if (
      !user ||
      user.isAnonymous ||
      !snapshot ||
      snapshot.isAnonymous ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return false;
    }

    const normalizedEmail = email.trim();
    const synced = await postSupabaseSyncAction(user, "ensure_supabase_password_user", {
      auth: {
        email: normalizedEmail,
        password,
        displayName:
          typeof snapshot.displayName === "string" && snapshot.displayName
            ? snapshot.displayName
            : user.displayName ?? null,
      },
    });

    if (!synced || snapshot.emailVerified !== true) {
      return synced;
    }

    try {
      if (!window.sakuraSupabaseAuth && typeof window.sakuraStartSupabaseAuth === "function") {
        await window.sakuraStartSupabaseAuth();
      }

      if (window.sakuraSupabaseAuth?.loginWithPassword) {
        await window.sakuraSupabaseAuth.loginWithPassword(normalizedEmail, password);
      }
    } catch (error) {
      console.error("Supabase password session sync failed:", error);
    }

    return synced;
  };

  const syncSupabaseCommentRecord = async (user, comment) => {
    if (
      !comment ||
      typeof comment.id !== "string" ||
      !comment.id ||
      typeof comment.profileId !== "number" ||
      comment.profileId <= 0 ||
      typeof comment.authorUid !== "string" ||
      !comment.authorUid
    ) {
      return false;
    }

    return postSupabaseSyncAction(user, "upsert_comment", {
      comment: {
        id: comment.id,
        profileId: comment.profileId,
        authorProfileId:
          typeof comment.authorProfileId === "number" ? comment.authorProfileId : null,
        authorUid: comment.authorUid,
        authorName: typeof comment.authorName === "string" ? comment.authorName : null,
        authorPhotoURL:
          typeof comment.authorPhotoURL === "string" ? comment.authorPhotoURL : null,
        authorAccentRole:
          typeof comment.authorAccentRole === "string" ? comment.authorAccentRole : null,
        message: typeof comment.message === "string" ? comment.message : "",
        mediaURL: typeof comment.mediaURL === "string" ? comment.mediaURL : null,
        mediaType: typeof comment.mediaType === "string" ? comment.mediaType : null,
        mediaPath: typeof comment.mediaPath === "string" ? comment.mediaPath : null,
        mediaSize: normalizeSupabaseInteger(comment.mediaSize),
        createdAt: typeof comment.createdAt === "string" ? comment.createdAt : null,
        updatedAt: typeof comment.updatedAt === "string" ? comment.updatedAt : null,
      },
    });
  };

  const syncSupabaseCommentRemoval = async (user, commentId) => {
    if (typeof commentId !== "string" || !commentId.trim()) {
      return false;
    }

    return postSupabaseSyncAction(user, "delete_comment", {
      commentId: commentId.trim(),
    });
  };

  const mapSupabasePresenceRow = (row) =>
    row
      ? {
          status: row.status === "online" ? "online" : "offline",
          isOnline: row.is_online === true,
          currentPath:
            typeof row.current_path === "string" && row.current_path
              ? row.current_path
              : null,
          lastSeenAt:
            typeof row.last_seen_at === "string" && row.last_seen_at
              ? row.last_seen_at
              : null,
        }
      : null;

  const mapSupabaseCommentRowToStoredComment = (row) =>
    toStoredProfileComment(typeof row?.id === "string" ? row.id : "", {
      profileId: normalizeSupabaseInteger(row?.profile_id),
      authorUid:
        typeof row?.firebase_author_uid === "string" && row.firebase_author_uid
          ? row.firebase_author_uid
          : typeof row?.auth_user_id === "string" && row.auth_user_id
            ? row.auth_user_id
          : null,
      authorProfileId: normalizeSupabaseInteger(row?.author_profile_id),
      authorName:
        typeof row?.author_name === "string" ? row.author_name : null,
      authorPhotoURL:
        typeof row?.author_photo_url === "string" ? row.author_photo_url : null,
      authorAccentRole:
        typeof row?.author_accent_role === "string" ? row.author_accent_role : null,
      message: typeof row?.message === "string" ? row.message : "",
      mediaURL: typeof row?.media_url === "string" ? row.media_url : null,
      mediaType: typeof row?.media_type === "string" ? row.media_type : null,
      mediaPath: typeof row?.media_path === "string" ? row.media_path : null,
      mediaSize: normalizeSupabaseInteger(row?.media_size),
      createdAt: typeof row?.created_at === "string" ? row.created_at : null,
      updatedAt: typeof row?.updated_at === "string" ? row.updated_at : null,
    });
  const mapSupabaseRpcCommentPayloadToStoredComment = (payload) => {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const commentId = typeof payload.id === "string" ? payload.id : "";

    if (!commentId) {
      return null;
    }

    return toStoredProfileComment(commentId, {
      profileId: normalizeSupabaseInteger(payload.profileId),
      authorUid:
        typeof payload.authorUid === "string" && payload.authorUid
          ? payload.authorUid
          : null,
      authorProfileId: normalizeSupabaseInteger(payload.authorProfileId),
      authorName: typeof payload.authorName === "string" ? payload.authorName : null,
      authorPhotoURL:
        typeof payload.authorPhotoURL === "string" ? payload.authorPhotoURL : null,
      authorAccentRole:
        typeof payload.authorAccentRole === "string" ? payload.authorAccentRole : null,
      message: typeof payload.message === "string" ? payload.message : "",
      mediaURL: typeof payload.mediaURL === "string" ? payload.mediaURL : null,
      mediaType: typeof payload.mediaType === "string" ? payload.mediaType : null,
      mediaPath: typeof payload.mediaPath === "string" ? payload.mediaPath : null,
      mediaSize: normalizeSupabaseInteger(payload.mediaSize),
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : null,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    });
  };

  const mapSupabaseProfileRowToSnapshot = (row, presenceRow = null) => {
    const uid =
      typeof row?.firebase_uid === "string" && row.firebase_uid
        ? row.firebase_uid
        : typeof row?.auth_user_id === "string" && row.auth_user_id
          ? row.auth_user_id
          : null;

    if (!uid) {
      return null;
    }

    return cacheResolvedProfileSnapshot(
      toStoredUserSnapshot(uid, {
        email: typeof row?.email === "string" ? row.email : null,
        emailVerified: row?.email_verified === true,
        login: typeof row?.login === "string" ? row.login : null,
        displayName:
          typeof row?.display_name === "string" ? row.display_name : null,
        profileId: normalizeSupabaseInteger(row?.profile_id),
        photoURL:
          typeof row?.photo_url === "string" && row.photo_url ? row.photo_url : null,
        avatarPath:
          typeof row?.avatar_path === "string" && row.avatar_path
            ? row.avatar_path
            : null,
        avatarType:
          typeof row?.avatar_type === "string" && row.avatar_type
            ? row.avatar_type
            : null,
        avatarSize: normalizeSupabaseInteger(row?.avatar_size),
        roles: Array.isArray(row?.roles) ? row.roles : [],
        isBanned: row?.is_banned === true,
        bannedAt:
          typeof row?.banned_at === "string" && row.banned_at ? row.banned_at : null,
        verificationRequired: row?.verification_required === true,
        providerIds: Array.isArray(row?.provider_ids) ? row.provider_ids : [],
        creationTime:
          typeof row?.created_at === "string" && row.created_at ? row.created_at : null,
        lastSignInTime:
          typeof row?.last_sign_in_at === "string" && row.last_sign_in_at
            ? row.last_sign_in_at
            : null,
        loginHistory: Array.isArray(row?.login_history) ? row.login_history : [],
        visitHistory: Array.isArray(row?.visit_history) ? row.visit_history : [],
        presence: mapSupabasePresenceRow(presenceRow),
      })
    );
  };
  const getCachedProfileSnapshotById = (profileId) => {
    const normalizedProfileId = normalizeSupabaseInteger(profileId);

    if (normalizedProfileId === null || normalizedProfileId <= 0) {
      return null;
    }

    if (
      window.sakuraCurrentUserSnapshot &&
      !window.sakuraCurrentUserSnapshot.isAnonymous &&
      window.sakuraCurrentUserSnapshot.profileId === normalizedProfileId
    ) {
      return window.sakuraCurrentUserSnapshot;
    }

    const cachedProfile = readRuntimeCacheEntry(
      profileByIdRuntimeCache,
      String(normalizedProfileId)
    );

    if (cachedProfile.hit) {
      return cachedProfile.value;
    }

    try {
      const persistedRawProfile = window.localStorage.getItem(
        PROFILE_CACHE_KEY_PREFIX + normalizedProfileId
      );

      if (!persistedRawProfile) {
        return null;
      }

      const persistedProfile = JSON.parse(persistedRawProfile);

      if (
        !persistedProfile ||
        typeof persistedProfile !== "object" ||
        typeof persistedProfile.uid !== "string" ||
        !persistedProfile.uid ||
        normalizeSupabaseInteger(persistedProfile.profileId) !== normalizedProfileId
      ) {
        return null;
      }

      return persistedProfile;
    } catch (_error) {
      return null;
    }
  };
  const mapSupabaseRpcProfilePayloadToSnapshot = (payload, options = {}) => {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const fallbackProfileId = normalizeSupabaseInteger(options.profileId);
    const fallbackSnapshot =
      fallbackProfileId !== null ? getCachedProfileSnapshotById(fallbackProfileId) : null;
    const uid =
      typeof payload.firebaseUid === "string" && payload.firebaseUid
        ? payload.firebaseUid
        : typeof payload.authUserId === "string" && payload.authUserId
          ? payload.authUserId
          : typeof fallbackSnapshot?.uid === "string" && fallbackSnapshot.uid
            ? fallbackSnapshot.uid
          : null;

    if (!uid) {
      return null;
    }

    const payloadProfileId = normalizeSupabaseInteger(payload.profileId);
    const resolvedProfileId =
      payloadProfileId !== null && payloadProfileId > 0
        ? payloadProfileId
        : fallbackProfileId !== null && fallbackProfileId > 0
          ? fallbackProfileId
          : typeof fallbackSnapshot?.profileId === "number" && fallbackSnapshot.profileId > 0
            ? fallbackSnapshot.profileId
            : null;

    return cacheResolvedProfileSnapshot(
      toStoredUserSnapshot(uid, {
        email:
          typeof payload.email === "string" && payload.email.trim()
            ? payload.email.trim()
            : fallbackSnapshot?.email ?? null,
        emailVerified:
          typeof payload.emailVerified === "boolean"
            ? payload.emailVerified
            : fallbackSnapshot?.emailVerified ?? null,
        login:
          typeof payload.login === "string" && payload.login.trim()
            ? payload.login.trim()
            : fallbackSnapshot?.login ?? null,
        displayName:
          typeof payload.displayName === "string" && payload.displayName.trim()
            ? payload.displayName.trim()
            : fallbackSnapshot?.displayName ?? null,
        profileId: resolvedProfileId,
        photoURL:
          typeof payload.photoURL === "string" && payload.photoURL
            ? payload.photoURL
            : fallbackSnapshot?.photoURL ?? null,
        avatarPath:
          typeof payload.avatarPath === "string" && payload.avatarPath
            ? payload.avatarPath
            : fallbackSnapshot?.avatarPath ?? null,
        avatarType:
          typeof payload.avatarType === "string" && payload.avatarType
            ? payload.avatarType
            : fallbackSnapshot?.avatarType ?? null,
        avatarSize:
          normalizeSupabaseInteger(payload.avatarSize) ??
          normalizeSupabaseInteger(fallbackSnapshot?.avatarSize),
        roles:
          Array.isArray(payload.roles) && payload.roles.length
            ? normalizeSupabaseTextArray(payload.roles)
            : normalizeSupabaseTextArray(fallbackSnapshot?.roles),
        isBanned: hasOwn(payload, "isBanned")
          ? payload.isBanned === true
          : fallbackSnapshot?.isBanned === true,
        bannedAt:
          hasOwn(payload, "bannedAt") && typeof payload.bannedAt === "string" && payload.bannedAt
            ? payload.bannedAt
            : fallbackSnapshot?.bannedAt ?? null,
        verificationRequired:
          typeof payload.verificationRequired === "boolean"
            ? payload.verificationRequired
            : fallbackSnapshot?.verificationRequired ?? null,
        providerIds:
          Array.isArray(payload.providerIds) && payload.providerIds.length
            ? normalizeProviderIdsList(payload.providerIds)
            : normalizeProviderIdsList(fallbackSnapshot?.providerIds),
        creationTime:
          typeof payload.creationTime === "string" && payload.creationTime
            ? payload.creationTime
            : fallbackSnapshot?.creationTime ?? null,
        lastSignInTime:
          typeof payload.lastSignInTime === "string" && payload.lastSignInTime
            ? payload.lastSignInTime
            : fallbackSnapshot?.lastSignInTime ?? null,
        loginHistory:
          Array.isArray(payload.loginHistory) ? payload.loginHistory : fallbackSnapshot?.loginHistory ?? [],
        visitHistory:
          Array.isArray(payload.visitHistory)
            ? normalizeVisitHistory(payload.visitHistory)
            : normalizeVisitHistory(fallbackSnapshot?.visitHistory),
        presence:
          payload.presence && typeof payload.presence === "object"
            ? normalizePresence(payload.presence, window.location.pathname)
            : normalizePresence(fallbackSnapshot?.presence, window.location.pathname),
      })
    );
  };

  const fetchSupabaseProfileRowsByLoginPrefix = async (loginPrefix) => {
    const rows = await fetchSupabaseRows("public_profiles", {
      select: SUPABASE_PROFILE_SELECT,
      login: "ilike." + loginPrefix + "*",
      order: "profile_id.asc",
      limit: 8,
    });

    return Array.isArray(rows)
      ? rows
          .map((row) => mapSupabaseProfileRowToSnapshot(row, null))
          .filter(Boolean)
          .filter(
            (profile, index, profiles) =>
              typeof profile.login === "string" &&
              normalizeLogin(profile.login)?.startsWith(loginPrefix) &&
              index === profiles.findIndex((candidate) => candidate.uid === profile.uid)
          )
      : [];
  };

  const fetchSupabaseProfileByAuthorName = async (authorName) => {
    const normalizedAuthorName = normalizeProfileCommentAuthorName(authorName);

    if (!normalizedAuthorName) {
      return null;
    }

    const profileIdMatch = normalizedAuthorName.match(/^profile\\s*#\\s*(\\d+)$/i);

    if (profileIdMatch) {
      const byProfileIdRows = await fetchSupabaseRows("public_profiles", {
        select: SUPABASE_PROFILE_SELECT,
        profile_id: "eq." + profileIdMatch[1],
        limit: 1,
      });
      const byProfileId = Array.isArray(byProfileIdRows) && byProfileIdRows[0]
        ? mapSupabaseProfileRowToSnapshot(byProfileIdRows[0], null)
        : null;

      if (byProfileId) {
        return byProfileId;
      }
    }

    const byLoginRows = await fetchSupabaseRows("public_profiles", {
      select: SUPABASE_PROFILE_SELECT,
      login: "ilike." + normalizedAuthorName,
      limit: 1,
    });
    const byLogin =
      Array.isArray(byLoginRows) && byLoginRows[0]
        ? mapSupabaseProfileRowToSnapshot(byLoginRows[0], null)
        : null;

    if (byLogin) {
      return byLogin;
    }

    const byDisplayNameRows = await fetchSupabaseRows("public_profiles", {
      select: SUPABASE_PROFILE_SELECT,
      display_name: "ilike." + normalizedAuthorName,
      limit: 1,
    });

    return Array.isArray(byDisplayNameRows) && byDisplayNameRows[0]
      ? mapSupabaseProfileRowToSnapshot(byDisplayNameRows[0], null)
      : null;
  };

  const fetchSupabaseProfileById = async (profileId, options = {}) => {
    const profileRows = await fetchSupabaseRows("public_profiles", {
      select: SUPABASE_PROFILE_SELECT,
      profile_id: "eq." + profileId,
      limit: 1,
    }, options);

    if (!Array.isArray(profileRows) || !profileRows[0]) {
      return null;
    }

    const presenceRows = await fetchSupabaseRows("public_profile_presence", {
      select: SUPABASE_PROFILE_PRESENCE_SELECT,
      profile_id: "eq." + profileId,
      limit: 1,
    }, options);

    return mapSupabaseProfileRowToSnapshot(
      profileRows[0],
      Array.isArray(presenceRows) ? presenceRows[0] ?? null : null
    );
  };

  const fetchSupabaseCommentsByProfileId = async (profileId) => {
    const rows = await fetchSupabaseRows("public_profile_comments", {
      select: SUPABASE_PROFILE_COMMENT_SELECT,
      profile_id: "eq." + profileId,
      order: "created_at.desc",
      limit: 200,
    });

    if (!Array.isArray(rows)) {
      return null;
    }

    const comments = sortProfileComments(
      rows
        .map((row) => mapSupabaseCommentRowToStoredComment(row))
        .filter(
          (comment) =>
            comment &&
            comment.profileId === profileId &&
            (
              (typeof comment.message === "string" && comment.message) ||
              (typeof comment.mediaURL === "string" && comment.mediaURL)
            )
        )
    );

    return enrichProfileCommentsWithAuthors(comments);
  };
  const fetchSupabaseCommentById = async (commentId) => {
    if (!isUuidLike(commentId)) {
      return null;
    }

    const rows = await fetchSupabaseRows("public_profile_comments", {
      select: SUPABASE_PROFILE_COMMENT_SELECT,
      id: "eq." + commentId,
      limit: 1,
    });

    return Array.isArray(rows) && rows[0]
      ? mapSupabaseCommentRowToStoredComment(rows[0])
      : null;
  };

  window.firebaseConfig = firebaseConfig;
  window.sakuraAuthStateSettled = false;

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    let storageModulePromise = null;

    const ensureStorageSdk = async () => {
      if (!storageModulePromise) {
        storageModulePromise = import("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js").then(
          ({
            deleteObject,
            getDownloadURL,
            getStorage,
            ref: storageRef,
            uploadBytes,
          }) => ({
            deleteObject,
            getDownloadURL,
            storage: getStorage(app),
            storageRef,
            uploadBytes,
          })
        );
      }

      return storageModulePromise;
    };

    const userRefFor = (uid) => doc(db, "users", uid);
    const countersRef = doc(db, "meta", "counters");
    const usersCollection = collection(db, "users");
    const profileCommentsCollection = collection(db, "profileComments");
    let stopPresenceTracking = () => {};
    let presenceRuntimePromise = null;
    let authStateHasSettled = false;
    const broadcastPresenceDirty = () => {
      presenceRuntimePromise
        ?.then((presenceRuntime) => {
          presenceRuntime?.invalidateSiteOnlineUsersCache?.();
        })
        .catch(() => {});
      window.dispatchEvent(new CustomEvent(PRESENCE_DIRTY_EVENT));
    };

    const ensurePresenceRuntime = async () => {
      if (!presenceRuntimePromise) {
        presenceRuntimePromise = Promise.resolve()
          .then(() => {
            if (typeof window.sakuraLoadFirebasePresenceRuntime !== "function") {
              throw createFirebaseError(
                "presence/runtime-loader-missing",
                "Firebase presence runtime is not available."
              );
            }

            return window.sakuraLoadFirebasePresenceRuntime();
          })
          .then(({ createFirebasePresenceRuntime }) =>
            createFirebasePresenceRuntime({
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
              constants: {
                onlineUsersRuntimeCacheTtlMs: ONLINE_USERS_RUNTIME_CACHE_TTL_MS,
                presenceHeartbeatIntervalMs: PRESENCE_HEARTBEAT_INTERVAL_MS,
                presenceVisitRecordCooldownMs: PRESENCE_VISIT_RECORD_COOLDOWN_MS,
                presenceTabRegistryStorageKey: PRESENCE_TAB_REGISTRY_STORAGE_KEY,
                presenceTabRegistryMaxAgeMs: PRESENCE_TAB_REGISTRY_MAX_AGE_MS,
              },
            })
          )
          .catch((error) => {
            presenceRuntimePromise = null;
            throw error;
          });
      }

      return presenceRuntimePromise;
    };

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
      cacheResolvedProfileSnapshot(snapshot);
      persistCachedAuthSnapshot(snapshot);
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
    let supabaseGoogleBridgePromise = null;
    let supabaseSessionBridgePromise = null;
    const readStoredSupabaseValue = (key) => {
      try {
        const value = window.localStorage?.getItem(key);
        return typeof value === "string" && value ? value : null;
      } catch (error) {
        return null;
      }
    };
    const clearStoredSupabaseProviderArtifacts = () => {
      try {
        window.localStorage?.removeItem(SUPABASE_PROVIDER_TOKEN_STORAGE_KEY);
        window.localStorage?.removeItem(SUPABASE_PROVIDER_REFRESH_TOKEN_STORAGE_KEY);
        window.localStorage?.removeItem(SUPABASE_PROVIDER_ID_STORAGE_KEY);
      } catch (error) {}
    };
    const clearSupabaseBridgeRuntimeState = () => {
      try {
        window.sakuraSupabaseCurrentSession = null;
        window.sakuraSupabaseCurrentUserSnapshot = null;
      } catch (error) {}
    };
    const signOutSupabaseBridge = async () => {
      clearStoredSupabaseProviderArtifacts();
      clearSupabaseBridgeRuntimeState();

      try {
        if (!window.sakuraSupabaseAuth && typeof window.sakuraStartSupabaseAuth === "function") {
          await withTimeout(
            Promise.resolve(window.sakuraStartSupabaseAuth()),
            AUTH_SIGN_OUT_TIMEOUT_MS,
            () =>
              createFirebaseError(
                "auth/signout-timeout",
                "Supabase Auth startup timed out during sign out."
              )
          );
        }

        if (window.sakuraSupabaseAuth?.logout) {
          await withTimeout(
            Promise.resolve(window.sakuraSupabaseAuth.logout()),
            AUTH_SIGN_OUT_TIMEOUT_MS,
            () =>
              createFirebaseError(
                "auth/signout-timeout",
                "Supabase sign out timed out."
              )
          );
          clearStoredSupabaseProviderArtifacts();
          clearSupabaseBridgeRuntimeState();
          return;
        }
      } catch (error) {
      }

      clearStoredSupabaseProviderArtifacts();
      clearSupabaseBridgeRuntimeState();
    };
    const hasSupabaseGoogleProvider = () => {
      const runtimeSession = window.sakuraSupabaseCurrentSession;
      const runtimeProviderId =
        typeof runtimeSession?.user?.app_metadata?.provider === "string"
          ? runtimeSession.user.app_metadata.provider
          : Array.isArray(window.sakuraSupabaseCurrentUserSnapshot?.providerIds)
            ? window.sakuraSupabaseCurrentUserSnapshot.providerIds[0] ?? null
            : null;
      const storedProviderId = readStoredSupabaseValue(SUPABASE_PROVIDER_ID_STORAGE_KEY);
      const providerId = typeof runtimeProviderId === "string" && runtimeProviderId
        ? runtimeProviderId
        : storedProviderId;

      return providerId === "google";
    };
    const getSupabaseBridgeSession = async () => {
      try {
        if (!window.sakuraSupabaseAuth && typeof window.sakuraStartSupabaseAuth === "function") {
          await window.sakuraStartSupabaseAuth();
        }
      } catch (error) {
      }

      if (
        window.sakuraSupabaseCurrentSession &&
        typeof window.sakuraSupabaseCurrentSession.access_token === "string" &&
        window.sakuraSupabaseCurrentSession.access_token
      ) {
        return window.sakuraSupabaseCurrentSession;
      }

      try {
        if (window.sakuraSupabaseAuth?.getSession) {
          return await window.sakuraSupabaseAuth.getSession();
        }
      } catch (error) {
      }

      return window.sakuraSupabaseCurrentSession ?? null;
    };
    const getSupabaseBridgeCurrentUser = async () => {
      const bridge = await ensureSupabasePasswordBridge();

      if (bridge?.getCurrentUser) {
        try {
          return await bridge.getCurrentUser();
        } catch (error) {
        }
      }

      const session = await getSupabaseBridgeSession();
      const sessionUser = session?.user ?? null;
      const sessionProviderIds = normalizeProviderIdsList(
        Array.isArray(window.sakuraSupabaseCurrentUserSnapshot?.providerIds)
          ? window.sakuraSupabaseCurrentUserSnapshot.providerIds
          : []
      );

      if (!sessionUser?.id) {
        return null;
      }

      return {
        id: sessionUser.id,
        email: typeof sessionUser.email === "string" ? sessionUser.email : null,
        providerIds: sessionProviderIds,
        createdAt: typeof sessionUser.created_at === "string" ? sessionUser.created_at : null,
        lastSignInAt:
          typeof sessionUser.last_sign_in_at === "string" ? sessionUser.last_sign_in_at : null,
        hasSession: Boolean(session?.access_token),
        emailVerified: Boolean(sessionUser.email_confirmed_at || sessionUser.confirmed_at),
        emailConfirmedAt:
          typeof sessionUser.email_confirmed_at === "string" && sessionUser.email_confirmed_at
            ? sessionUser.email_confirmed_at
            : typeof sessionUser.confirmed_at === "string" && sessionUser.confirmed_at
              ? sessionUser.confirmed_at
              : null,
      };
    };
    const fetchFirebaseCustomTokenFromSupabase = async () => {
      if (!SUPABASE_AUTH_BRIDGE_FUNCTION_URL) {
        return null;
      }

      const accessToken = await getSupabaseBridgeAccessTokenEarly();

      if (!accessToken) {
        return null;
      }

      try {
        const response = await fetch(SUPABASE_AUTH_BRIDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + accessToken,
          },
          body: JSON.stringify({
            action: "mint_firebase_custom_token",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");

          if (response.status >= 500) {
            console.error(
              "Supabase auth bridge rejected Firebase custom token request:",
              response.status,
              errorText
            );
          }

          return null;
        }

        const payload = await response.json().catch(() => null);

        return typeof payload?.customToken === "string" && payload.customToken
          ? payload.customToken
          : null;
      } catch (error) {
        console.error("Supabase auth bridge failed:", error);
        return null;
      }
    };
    const getSupabaseGoogleAccessToken = async () => {
      try {
        if (typeof window.sakuraStartSupabaseAuth === "function") {
          await window.sakuraStartSupabaseAuth();
        }
      } catch (error) {
      }

      if (!hasSupabaseGoogleProvider()) {
        return null;
      }

      const runtimeToken =
        typeof window.sakuraSupabaseCurrentSession?.provider_token === "string" &&
        window.sakuraSupabaseCurrentSession.provider_token
          ? window.sakuraSupabaseCurrentSession.provider_token
          : null;

      return runtimeToken || readStoredSupabaseValue(SUPABASE_PROVIDER_TOKEN_STORAGE_KEY);
    };
    const bridgeSupabaseSessionToFirebase = async () => {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        return auth.currentUser;
      }

      if (supabaseSessionBridgePromise) {
        return supabaseSessionBridgePromise;
      }

      supabaseSessionBridgePromise = (async () => {
        const customToken = await fetchFirebaseCustomTokenFromSupabase();

        if (!customToken) {
          return null;
        }

        const credentials = await signInWithCustomToken(auth, customToken);
        return credentials.user ?? null;
      })().finally(() => {
        supabaseSessionBridgePromise = null;
      });

      return supabaseSessionBridgePromise;
    };
    const bridgeSupabaseGoogleSessionToFirebase = async () => {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        return auth.currentUser;
      }

      if (supabaseGoogleBridgePromise) {
        return supabaseGoogleBridgePromise;
      }

      supabaseGoogleBridgePromise = (async () => {
        const accessToken = await getSupabaseGoogleAccessToken();

        if (!accessToken) {
          return null;
        }

        const credential = GoogleAuthProvider.credential(null, accessToken);
        const credentials = await signInWithCredential(auth, credential);

        clearStoredSupabaseProviderArtifacts();
        return credentials.user ?? null;
      })().finally(() => {
        supabaseGoogleBridgePromise = null;
      });

      return supabaseGoogleBridgePromise;
    };
    const ensureSupabasePasswordBridge = async () => {
      try {
        if (!window.sakuraSupabaseAuth && typeof window.sakuraStartSupabaseAuth === "function") {
          await window.sakuraStartSupabaseAuth();
        }
      } catch (error) {
      }

      return window.sakuraSupabaseAuth ?? null;
    };
    const shouldFallbackToFirebasePasswordRegister = (error) => {
      const code = getErrorCode(error);

      return (
        !code ||
        code === "auth/internal-error" ||
        code === "auth/network-request-failed"
      );
    };
    const shouldFallbackToFirebasePasswordLogin = (error) => {
      const code = getErrorCode(error);

      if (
        code === "auth/email-not-verified" ||
        code === "auth/too-many-requests" ||
        code === "auth/invalid-email"
      ) {
        return false;
      }

      return true;
    };
    const resolveSupabaseSessionSnapshotFallback = async ({
      requestedLogin = null,
      preferredDisplayName = null,
    } = {}) => {
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry();

      if (!hasAssignedProfileId(currentSupabaseDetails)) {
        return null;
      }

      const session = await getSupabaseBridgeSession();
      const sessionUser = session?.user ?? null;
      const currentProviderIds = normalizeProviderIdsList(
        currentSupabaseDetails.providerIds?.length
          ? currentSupabaseDetails.providerIds
          : window.sakuraSupabaseCurrentUserSnapshot?.providerIds ?? []
      );

      const fallbackUid =
        typeof currentSupabaseDetails.firebaseUid === "string" && currentSupabaseDetails.firebaseUid
          ? currentSupabaseDetails.firebaseUid
          : typeof currentSupabaseDetails.authUserId === "string" &&
              currentSupabaseDetails.authUserId
            ? currentSupabaseDetails.authUserId
            : typeof sessionUser?.id === "string" && sessionUser.id
              ? sessionUser.id
              : null;

      if (!fallbackUid) {
        return null;
      }

      return publishUserSnapshot(
        toStoredUserSnapshot(fallbackUid, {
          ...currentSupabaseDetails,
          email:
            currentSupabaseDetails.email ??
            (typeof sessionUser?.email === "string" ? sessionUser.email : null),
          login: requestedLogin ?? currentSupabaseDetails.login ?? null,
          displayName:
            preferredDisplayName ??
            currentSupabaseDetails.displayName ??
            requestedLogin ??
            currentSupabaseDetails.login ??
            (typeof sessionUser?.email === "string" ? sessionUser.email.split("@")[0] : null),
          providerIds: currentProviderIds,
          creationTime:
            currentSupabaseDetails.creationTime ??
            (typeof sessionUser?.created_at === "string" ? sessionUser.created_at : null),
          lastSignInTime:
            currentSupabaseDetails.lastSignInTime ??
            (typeof sessionUser?.last_sign_in_at === "string"
              ? sessionUser.last_sign_in_at
              : null),
        })
      );
    };
    const resolveSupabasePasswordSessionSnapshot = async ({
      source,
      requestedLogin = null,
      preferredDisplayName = null,
      skipPresence = false,
    } = {}) => {
      const fallbackSnapshot = await resolveSupabaseSessionSnapshotFallback({
        requestedLogin,
        preferredDisplayName,
      });

      if (fallbackSnapshot) {
        if (!skipPresence) {
          void (async () => {
            try {
              const bridgedUser =
                (await bridgeSupabaseSessionToFirebase()) ??
                (await bridgeSupabaseGoogleSessionToFirebase());

              if (bridgedUser && !bridgedUser.isAnonymous) {
                await syncPresence(bridgedUser, {
                  path: window.location.pathname,
                  source: source ?? "login",
                  forceVisit: true,
                });
              }
            } catch (error) {}
          })();
        }

        return await enforceActiveSessionNotBanned(fallbackSnapshot);
      }

      const bridgedUser =
        (await bridgeSupabaseSessionToFirebase()) ??
        (await bridgeSupabaseGoogleSessionToFirebase());

      if (!bridgedUser || bridgedUser.isAnonymous) {
        throw createFirebaseError(
          "auth/firebase-bridge-failed",
          "Supabase session is ready, but Firebase profile bridge is not ready yet."
        );
      }

      const snapshot = await resolveUserSnapshot(bridgedUser, {
        requestedLogin: requestedLogin ?? undefined,
        preferredDisplayName: preferredDisplayName ?? undefined,
      });
      const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);

      if (!skipPresence) {
        await syncPresence(bridgedUser, {
          path: window.location.pathname,
          source: source ?? "login",
          forceVisit: true,
        });
      }

      return allowedSnapshot;
    };
    const applyCurrentVerificationSnapshot = async ({
      emailVerified,
      verificationRequired,
      verificationEmailSent,
      providerIds = null,
    }) => {
      const normalizedProviderIds = normalizeProviderIdsList(providerIds);
      const fallbackSnapshot = await resolveSupabaseSessionSnapshotFallback();

      if (fallbackSnapshot) {
        return publishUserSnapshot({
          ...fallbackSnapshot,
          emailVerified,
          verificationRequired,
          verificationEmailSent,
          providerIds: normalizedProviderIds.length
            ? normalizedProviderIds
            : fallbackSnapshot.providerIds,
        });
      }

      const firebaseUser = auth.currentUser;

      if (firebaseUser && !firebaseUser.isAnonymous) {
        return publishUserSnapshot(
          toUserSnapshot(firebaseUser, {
            ...(window.sakuraCurrentUserSnapshot ?? {}),
            emailVerified,
            verificationRequired,
            verificationEmailSent,
            providerIds:
              normalizedProviderIds.length > 0
                ? normalizedProviderIds
                : window.sakuraCurrentUserSnapshot?.providerIds ?? getProviderIds(firebaseUser),
          })
        );
      }

      if (window.sakuraCurrentUserSnapshot?.uid) {
        return publishUserSnapshot({
          ...window.sakuraCurrentUserSnapshot,
          emailVerified,
          verificationRequired,
          verificationEmailSent,
          providerIds: normalizedProviderIds.length
            ? normalizedProviderIds
            : window.sakuraCurrentUserSnapshot.providerIds,
        });
      }

      return null;
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

      await signOutSupabaseBridge();

      return publishUserSnapshot(null);
    };
    const isProfileRecordError = (error) => {
      const code = getErrorCode(error);
      return code === "profile/record-missing" || code === "permission-denied";
    };
    const ensureRootActorSnapshot = async () => {
      const user = auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null;

      let actorSnapshot = window.sakuraCurrentUserSnapshot;

      if (
        !actorSnapshot ||
        actorSnapshot.isAnonymous ||
        (user && actorSnapshot.uid !== user.uid)
      ) {
        actorSnapshot = user
          ? await resolveUserSnapshot(user)
          : await resolveSupabaseSessionSnapshotFallback();
      }

      if (!actorSnapshot || actorSnapshot.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to open the admin panel.");
      }

      if (!canManageRoles(actorSnapshot?.roles ?? [])) {
        throw createFirebaseError(
          "admin/forbidden",
          "Only root and co-owner accounts can use the admin panel."
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

      await signOutSupabaseBridge();

      publishUserSnapshot(null);

      if (options.throwError !== false) {
        throw createFirebaseError("auth/account-banned", message);
      }

      return null;
    };
    const isEmailVerificationLocked = (snapshot) =>
      Boolean(
        snapshot &&
          !snapshot.isAnonymous &&
          snapshot.email &&
          !hasTrustedEmailProvider(snapshot.providerIds) &&
          snapshot.emailVerified === false &&
          snapshot.verificationRequired !== false
      );
    const ensureVerifiedSessionAccess = async (user, message) => {
      let actorSnapshot = window.sakuraCurrentUserSnapshot;

      if (!actorSnapshot || actorSnapshot.isAnonymous || actorSnapshot.uid !== user.uid) {
        actorSnapshot = await resolveUserSnapshot(user);
      }

      if (isEmailVerificationLocked(actorSnapshot)) {
        try {
          await reload(user);
        } catch (error) {}

        actorSnapshot = await resolveUserSnapshot(user);
      }

      if (isEmailVerificationLocked(actorSnapshot)) {
        throw createFirebaseError(
          "auth/email-not-verified",
          message || "Verify your email before using profile actions."
        );
      }

      return actorSnapshot;
    };

    const findUserByLogin = async (loginLower) => {
      const snapshot = await getDocs(
        query(usersCollection, where("loginLower", "==", loginLower), limit(1))
      );

      return snapshot.empty ? null : snapshot.docs[0];
    };
    const findUsersByLoginPrefix = async (loginPrefix) => {
      const normalizedPrefix = normalizeLogin(loginPrefix);

      if (!normalizedPrefix || normalizedPrefix.length < 2) {
        return [];
      }

      const snapshot = await getDocs(
        query(
          usersCollection,
          where("loginLower", ">=", normalizedPrefix),
          where("loginLower", "<=", normalizedPrefix + "\uf8ff"),
          limit(8)
        )
      );

      return snapshot.docs.filter((userDoc) => {
        const userDetails = userDoc.data();
        const userLoginLower =
          typeof userDetails?.loginLower === "string"
            ? userDetails.loginLower
            : normalizeLogin(typeof userDetails?.login === "string" ? userDetails.login : "");

        return Boolean(userLoginLower) && userLoginLower.startsWith(normalizedPrefix);
      });
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

      if (!userByDisplayName.empty) {
        return userByDisplayName.docs[0];
      }

      const authorLookupKey = normalizeProfileCommentAuthorLookupKey(normalizedAuthorName);
      const userCandidates = await getDocs(query(usersCollection, limit(200)));

      for (const userDoc of userCandidates.docs) {
        const userDetails = userDoc.data();
        const candidateKeys = [
          normalizeProfileCommentAuthorLookupKey(typeof userDetails?.login === "string" ? userDetails.login : ""),
          normalizeProfileCommentAuthorLookupKey(typeof userDetails?.displayName === "string" ? userDetails.displayName : ""),
          typeof userDetails?.profileId === "number"
            ? normalizeProfileCommentAuthorLookupKey("Profile #" + userDetails.profileId)
            : "",
        ].filter(Boolean);

        if (candidateKeys.includes(authorLookupKey)) {
          return userDoc;
        }
      }

      return null;
    };

    const findUserByProfileId = async (profileId) => {
      const snapshot = await getDocs(
        query(usersCollection, where("profileId", "==", profileId), limit(1))
      );

      return snapshot.empty ? null : snapshot.docs[0];
    };
    const canViewPrivateProfileFields = (actorSnapshot, targetProfileId) =>
      Boolean(
        actorSnapshot &&
          !actorSnapshot.isAnonymous &&
          (
            actorSnapshot.profileId === targetProfileId ||
            canManageRoles(actorSnapshot.roles ?? [])
          )
      );
    const mergePrivateProfileFieldsIntoSnapshot = (snapshot, privateFields) => {
      if (!snapshot || !privateFields || typeof privateFields !== "object") {
        return snapshot;
      }

      return toStoredUserSnapshot(snapshot.uid, {
        ...stripNullishFields(snapshot),
        email:
          snapshot.email ??
          (typeof privateFields.email === "string" ? privateFields.email : null),
        emailVerified:
          typeof snapshot.emailVerified === "boolean"
            ? snapshot.emailVerified
            : typeof privateFields.emailVerified === "boolean"
              ? privateFields.emailVerified
              : null,
        verificationRequired:
          typeof snapshot.verificationRequired === "boolean"
            ? snapshot.verificationRequired
            : typeof privateFields.verificationRequired === "boolean"
              ? privateFields.verificationRequired
              : null,
        providerIds:
          Array.isArray(snapshot.providerIds) && snapshot.providerIds.length
            ? snapshot.providerIds
            : normalizeProviderIdsList(privateFields.providerIds),
      });
    };
    const enrichProfileSnapshotWithPrivateFields = async (profileId, snapshot) => {
      if (!snapshot || snapshot.isAnonymous || !Number.isInteger(profileId) || profileId <= 0) {
        return snapshot;
      }

      await waitForAuthStateSettlement();

      let actorSnapshot = window.sakuraCurrentUserSnapshot;

      if (
        auth.currentUser &&
        !auth.currentUser.isAnonymous &&
        (!actorSnapshot || actorSnapshot.isAnonymous || actorSnapshot.uid !== auth.currentUser.uid)
      ) {
        try {
          actorSnapshot = await resolveUserSnapshot(auth.currentUser);
        } catch (error) {
        }
      }

      if (!canViewPrivateProfileFields(actorSnapshot, profileId)) {
        return snapshot;
      }

      let enrichedSnapshot = snapshot;

      try {
        const privateProfileDoc = await findUserByProfileId(profileId);

        if (privateProfileDoc) {
          const privateProfileData = privateProfileDoc.data() ?? {};

          enrichedSnapshot = toStoredUserSnapshot(privateProfileDoc.id, {
            ...privateProfileData,
            ...stripNullishFields(snapshot),
            email:
              snapshot.email ??
              (typeof privateProfileData.email === "string" ? privateProfileData.email : null),
            emailVerified:
              typeof snapshot.emailVerified === "boolean"
                ? snapshot.emailVerified
                : privateProfileData.emailVerified,
            verificationRequired:
              typeof snapshot.verificationRequired === "boolean"
                ? snapshot.verificationRequired
                : privateProfileData.verificationRequired,
            providerIds:
              Array.isArray(snapshot.providerIds) && snapshot.providerIds.length
                ? snapshot.providerIds
                : privateProfileData.providerIds,
            loginHistory:
              Array.isArray(snapshot.loginHistory) && snapshot.loginHistory.length
                ? snapshot.loginHistory
                : privateProfileData.loginHistory,
            visitHistory:
              Array.isArray(snapshot.visitHistory) && snapshot.visitHistory.length
                ? snapshot.visitHistory
                : privateProfileData.visitHistory,
            presence: snapshot.presence ?? privateProfileData.presence ?? null,
          });
        }
      } catch (error) {
      }

      const needsSupabasePrivateFields =
        !enrichedSnapshot.email ||
        !normalizeProviderIdsList(enrichedSnapshot.providerIds).length ||
        typeof enrichedSnapshot.emailVerified !== "boolean" ||
        typeof enrichedSnapshot.verificationRequired !== "boolean";

      if (!needsSupabasePrivateFields || !auth.currentUser || auth.currentUser.isAnonymous) {
        return enrichedSnapshot;
      }

      try {
        const privateFields = await loadPrivateProfileFields(
          auth.currentUser,
          profileId
        );

        if (privateFields) {
          enrichedSnapshot = mergePrivateProfileFieldsIntoSnapshot(
            enrichedSnapshot,
            privateFields
          );
        }
      } catch (error) {
      }

      return enrichedSnapshot;
    };
    const uploadAvatarToStorage = async (uid, file) => {
      const extension = getAvatarStorageExtension(file);

      if (!extension) {
        return null;
      }

      const { getDownloadURL, storage, storageRef, uploadBytes } = await ensureStorageSdk();
      const avatarRef = storageRef(storage, \`avatars/\${uid}/avatar.\${extension}\`);

      await uploadBytes(avatarRef, file, {
        contentType: file.type,
        cacheControl: "public,max-age=3600",
      });

      const downloadURL = await getDownloadURL(avatarRef);
      return \`\${downloadURL}\${downloadURL.includes("?") ? "&" : "?"}v=\${Date.now()}\`;
    };
    const resolvePersistedAvatarUrl = async (uid, file) => {
      if (STORAGE_AVATAR_UPLOADS_ENABLED && STORAGE_AVATAR_CONTENT_TYPES.has(file.type)) {
        try {
          const storageUploadPromise = uploadAvatarToStorage(uid, file);
          const storagePhotoURL = await Promise.race([
            storageUploadPromise,
            new Promise((_, reject) => {
              window.setTimeout(() => {
                reject(
                  createFirebaseError(
                    "storage/upload-timeout",
                    "Avatar storage upload timed out."
                  )
                );
              }, AVATAR_STORAGE_UPLOAD_TIMEOUT_MS);
            }),
          ]).catch((error) => {
            storageUploadPromise.catch(() => {});
            throw error;
          });

          if (storagePhotoURL) {
            return storagePhotoURL;
          }
        } catch (error) {
          console.error("Failed to upload avatar to storage, falling back to inline data URL:", error);
        }
      }

      return createInlineAvatarDataUrl(file);
    };
    const deleteAvatarFromStorage = async (uid) => {
      const extensions = ["gif", "webp", "mp4", "webm"];
      const { deleteObject, storage, storageRef } = await ensureStorageSdk();

      await Promise.all(
        extensions.map(async (extension) => {
          try {
            await deleteObject(storageRef(storage, \`avatars/\${uid}/avatar.\${extension}\`));
          } catch (error) {
            const errorCode = getErrorCode(error);

            if (
              errorCode === "storage/object-not-found" ||
              errorCode === "storage/unknown" ||
              errorCode === "object-not-found"
            ) {
              return;
            }

            throw error;
          }
        })
      );
    };
    const deleteProfileCommentDocumentsForAccount = async (targetUid, snapshot) => {
      const commentRefsById = new Map();
      const commentLookups = [];

      if (typeof snapshot?.profileId === "number" && snapshot.profileId > 0) {
        commentLookups.push(
          getDocs(query(profileCommentsCollection, where("profileId", "==", snapshot.profileId)))
        );
      }

      if (typeof targetUid === "string" && targetUid) {
        commentLookups.push(
          getDocs(query(profileCommentsCollection, where("authorUid", "==", targetUid)))
        );
      }

      const commentSnapshots = await Promise.all(commentLookups);

      commentSnapshots.forEach((commentSnapshot) => {
        commentSnapshot.forEach((commentDoc) => {
          if (!commentRefsById.has(commentDoc.id)) {
            commentRefsById.set(commentDoc.id, commentDoc.ref);
          }
        });
      });

      await Promise.all(
        [...commentRefsById.values()].map((commentRef) => deleteDoc(commentRef))
      );

      return commentRefsById.size;
    };
    const deleteFirestoreProfileAccountData = async (targetUid, snapshot) => {
      await deleteProfileCommentDocumentsForAccount(targetUid, snapshot);
      await deleteAvatarFromStorage(targetUid).catch((error) => {
        console.error("Failed to delete account avatar from Firebase Storage:", error);
      });
      await deleteDoc(userRefFor(targetUid));
      await resetProfileCountAfterDeletion();
    };
    const resetProfileCountAfterDeletion = async () => {
      const usersSnapshot = await getDocs(usersCollection);
      let maxProfileId = 0;

      usersSnapshot.forEach((userDoc) => {
        const candidateProfileId = normalizeSupabaseInteger(userDoc.data()?.profileId);

        if (candidateProfileId && candidateProfileId > maxProfileId) {
          maxProfileId = candidateProfileId;
        }
      });

      await setDoc(
        countersRef,
        {
          profileCount: maxProfileId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return maxProfileId;
    };
    const clearProfileLookupCaches = () => {
      profileByIdRuntimeCache.clear();
      profileByAuthorRuntimeCache.clear();
      profilesByPrefixRuntimeCache.clear();
      runtimePendingLookupCache.clear();
    };
    const deleteCurrentAccount = async () => {
      const user = auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null;

      const snapshot =
        window.sakuraCurrentUserSnapshot &&
        !window.sakuraCurrentUserSnapshot.isAnonymous &&
        (!user || window.sakuraCurrentUserSnapshot.uid === user.uid)
          ? window.sakuraCurrentUserSnapshot
          : user
            ? await resolveUserSnapshot(user)
            : await resolveSupabaseSessionSnapshotFallback();

      if (!snapshot || snapshot.isAnonymous) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in again before deleting the account."
        );
      }

      stopPresenceTracking();

      await withTimeout(
        requestSupabaseSyncActionOrThrow(
          user,
          "delete_profile_account_data",
          {},
          "account/delete-sync-failed",
          "Account data could not be deleted from Supabase."
        ),
        ACCOUNT_DELETE_TIMEOUT_MS,
        () =>
          createFirebaseError(
            "account/delete-timeout",
            "Account deletion timed out while syncing with Supabase. Try again."
          )
      );

      clearProfileLookupCaches();

      try {
        await withTimeout(
          signOutSupabaseBridge(),
          AUTH_SIGN_OUT_TIMEOUT_MS,
          () =>
            createFirebaseError(
              "auth/signout-timeout",
              "Supabase sign out timed out."
            )
        );
      } catch (error) {
      }

      try {
        if (user) {
          await withTimeout(
            signOut(auth),
            AUTH_SIGN_OUT_TIMEOUT_MS,
            () =>
              createFirebaseError(
                "auth/signout-timeout",
                "Firebase sign out timed out."
              )
          );
        }
      } catch (error) {
      }

      publishUserSnapshot(null);
      return null;
    };
    const adminDeleteProfileAccount = async (profileId) => {
      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

      if (user && targetDoc.id === user.uid) {
        throw createFirebaseError(
          "admin/self-delete-forbidden",
          "Use the profile delete button for your own account."
        );
      }

      await requestSupabaseSyncActionOrThrow(
        user,
        "admin_delete_profile_account_data",
        {
          profileId,
        },
        "account/delete-sync-failed",
        "Account data could not be deleted from Supabase."
      );

      clearProfileLookupCaches();
      return null;
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

      const supabaseResolvedEmail = await resolveSupabaseEmailForLogin(loginLower);

      if (supabaseResolvedEmail) {
        return supabaseResolvedEmail;
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
      const presenceRuntime = await ensurePresenceRuntime();
      return presenceRuntime.syncPresence(user ?? null, options);
    };

    const ensureProfileRecord = async (user, options = {}) => {
      const preferredDisplayName =
        typeof options.preferredDisplayName === "string" && options.preferredDisplayName.trim()
          ? options.preferredDisplayName.trim()
          : null;
      const currentSupabaseDetails = user?.isAnonymous
        ? null
        : await loadCurrentAuthProfileFromSupabaseRpc();

      if (hasAssignedProfileId(currentSupabaseDetails)) {
        const providerIds =
          currentSupabaseDetails.providerIds?.length
            ? currentSupabaseDetails.providerIds
            : getProviderIds(user);
        const roles = normalizeRoles(currentSupabaseDetails.roles);

        return {
          ...currentSupabaseDetails,
          email: currentSupabaseDetails.email ?? user.email ?? null,
          emailVerified: resolveEmailVerifiedState(user, {
            ...currentSupabaseDetails,
            providerIds,
          }),
          displayName:
            preferredDisplayName ??
            currentSupabaseDetails.displayName ??
            user.displayName ??
            currentSupabaseDetails.login ??
            currentSupabaseDetails.email?.split("@")[0] ??
            user.email?.split("@")[0] ??
            "Sakura User",
          roles,
          verificationRequired: resolveVerificationRequired(
            roles,
            providerIds,
            currentSupabaseDetails.verificationRequired
          ),
          verificationEmailSent: currentSupabaseDetails.verificationEmailSent === true,
          providerIds,
          creationTime:
            currentSupabaseDetails.creationTime ?? user.metadata.creationTime ?? null,
          lastSignInTime:
            currentSupabaseDetails.lastSignInTime ?? user.metadata.lastSignInTime ?? null,
          loginHistory: Array.isArray(currentSupabaseDetails.loginHistory)
            ? currentSupabaseDetails.loginHistory
            : buildLoginHistory([], user.metadata.creationTime ?? null, user.metadata.lastSignInTime ?? null),
          visitHistory: normalizeVisitHistory(currentSupabaseDetails.visitHistory),
          presence: normalizePresence(currentSupabaseDetails.presence, window.location.pathname),
        };
      }

      const userRef = userRefFor(user.uid);
      const userSnapshot = await getDoc(userRef);
      const existingData = userSnapshot.exists() ? userSnapshot.data() : null;
      const existingProfileId =
        typeof existingData?.profileId === "number" ? existingData.profileId : null;
      const providerIds = getProviderIds(user);

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
      const storedEmailVerified =
        typeof existingData?.emailVerified === "boolean" ? existingData.emailVerified : null;
      const storedVerificationRequired =
        typeof existingData?.verificationRequired === "boolean"
          ? existingData.verificationRequired
          : null;
      const storedVerificationEmailSent =
        typeof existingData?.verificationEmailSent === "boolean"
          ? existingData.verificationEmailSent
          : null;
      const resolvedEmailVerified =
        storedEmailVerified !== null
          ? storedEmailVerified || hasTrustedEmailProvider(providerIds)
          : resolveEmailVerifiedState(user, { providerIds });
      const profilePayload = {
        uid: user.uid,
        email: user.email ?? null,
        emailVerified: resolvedEmailVerified,
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
        photoURL: resolvePhotoURL(existingData, null),
        roles,
        isBanned: existingData?.isBanned === true,
        bannedAt: resolveBannedAt(existingData),
        verificationRequired: resolveVerificationRequired(
          roles,
          providerIds,
          storedVerificationRequired
        ),
        verificationEmailSent:
          storedVerificationEmailSent !== null ? storedVerificationEmailSent : false,
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
        const snapshot = publishUserSnapshot(toUserSnapshot(user, details));
        void syncSupabaseProfileRecord(user, snapshot);
        return snapshot;
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
          const storedSnapshot = publishUserSnapshot(toUserSnapshot(user, storedDetails));
          void syncSupabaseProfileRecord(user, storedSnapshot);
          return storedSnapshot;
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

    const startPresenceTracking = async (user) => {
      stopPresenceTracking();
      const presenceRuntime = await ensurePresenceRuntime();
      stopPresenceTracking = presenceRuntime.startPresenceTracking(user);
      return stopPresenceTracking;
    };
    const reauthenticateSupabasePasswordProfile = async (email, currentPassword) => {
      const supabaseAuthBridge = await ensureSupabasePasswordBridge();

      if (!supabaseAuthBridge?.loginWithPassword) {
        throw createFirebaseError(
          "auth/current-password-required",
          "This account cannot verify the current password right now."
        );
      }

      try {
        await supabaseAuthBridge.loginWithPassword(email, currentPassword);
      } catch (error) {
        const errorCode = getErrorCode(error);

        if (
          errorCode === "auth/wrong-password" ||
          errorCode === "auth/invalid-credential" ||
          errorCode === "auth/user-mismatch"
        ) {
          throw createFirebaseError(
            "auth/current-password-invalid",
            "Current password is incorrect."
          );
        }

        throw error;
      }
    };

    const updateUsername = async (nextUsername, currentPassword = "") => {
      const currentSupabaseSession = await getSupabaseBridgeSession();
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });
      const currentSupabaseProviderIds = normalizeProviderIdsList(
        currentSupabaseDetails?.providerIds?.length
          ? currentSupabaseDetails.providerIds
          : window.sakuraSupabaseCurrentUserSnapshot?.providerIds ?? []
      );
      const currentSupabaseEmail =
        currentSupabaseDetails?.email ??
        (typeof currentSupabaseSession?.user?.email === "string"
          ? currentSupabaseSession.user.email
          : null);

      if (hasAssignedProfileId(currentSupabaseDetails) && currentSupabaseDetails?.authUserId) {
        if (currentSupabaseProviderIds.includes("password")) {
          if (!currentPassword) {
            throw createFirebaseError(
              "auth/current-password-required",
              "Enter your current password to change the login."
            );
          }

          if (!currentSupabaseEmail) {
            throw createFirebaseError(
              "auth/current-password-required",
              "This account cannot verify the current password right now."
            );
          }

          await reauthenticateSupabasePasswordProfile(currentSupabaseEmail, currentPassword);
        }

        await callSupabaseAuthenticatedRpc(
          "update_current_profile_identity_rpc",
          {
            target_login: nextUsername,
          },
          "Login could not be saved."
        );

        const snapshot = await resolveSupabaseSessionSnapshotFallback({
          requestedLogin: nextUsername,
        });

        if (snapshot) {
          return snapshot;
        }
      }

      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your username.");
      }

      await ensureVerifiedSessionAccess(user, "Verify your email before changing the login.");

      const providerIds = getProviderIds(user);

      if (providerIds.includes("password")) {
        const email = typeof user.email === "string" ? user.email.trim() : "";

        if (!currentPassword) {
          throw createFirebaseError(
            "auth/current-password-required",
            "Enter your current password to change the login."
          );
        }

        if (!email) {
          throw createFirebaseError(
            "auth/current-password-required",
            "This account cannot verify the current password right now."
          );
        }

        try {
          await reauthenticateWithCredential(
            user,
            EmailAuthProvider.credential(email, currentPassword)
          );
        } catch (error) {
          const errorCode = getErrorCode(error);

          if (
            errorCode === "auth/wrong-password" ||
            errorCode === "auth/invalid-credential" ||
            errorCode === "auth/user-mismatch"
          ) {
            throw createFirebaseError(
              "auth/current-password-invalid",
              "Current password is incorrect."
            );
          }

          throw error;
        }
      }

      const usernameDetails = await resolveAvailableLogin(nextUsername, user.uid);
      const userRef = userRefFor(user.uid);
      const existingSnapshot = await getDoc(userRef);
      const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
      const hasStoredProfileRecord =
        existingSnapshot.exists() && typeof existingData?.profileId === "number";
      if (!hasStoredProfileRecord) {
        return resolveUserSnapshot(user, {
          requestedLogin: usernameDetails.login,
        });
      }

      try {
        await setDoc(
          userRef,
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

        if (!hasStoredProfileRecord) {
          return resolveUserSnapshot(user, {
            requestedLogin: usernameDetails.login,
          });
        }

        throw createFirebaseError(
          "username/persist-failed",
          "Username could not be saved. Check Firestore rules for users/{uid}."
        );
      }

      const snapshot = publishUserSnapshot(
        toUserSnapshot(user, {
          ...existingData,
          login: usernameDetails.login,
          loginLower: usernameDetails.loginLower,
        })
      );
      void syncSupabaseProfileRecord(user, snapshot);

      return snapshot;
    };
    const updateDisplayName = async (nextDisplayName) => {
      const sanitizedDisplayName = sanitizeDisplayName(nextDisplayName);
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });

      if (hasAssignedProfileId(currentSupabaseDetails) && currentSupabaseDetails?.authUserId) {
        if (!sanitizedDisplayName) {
          throw createFirebaseError("display-name/empty", "Enter a profile name.");
        }

        await callSupabaseAuthenticatedRpc(
          "update_current_profile_identity_rpc",
          {
            target_display_name: sanitizedDisplayName,
          },
          "Profile name could not be saved."
        );

        if (auth.currentUser && !auth.currentUser.isAnonymous) {
          try {
            await updateProfile(auth.currentUser, { displayName: sanitizedDisplayName });
          } catch (error) {
            console.error("Failed to sync Firebase Auth displayName after profile name change:", error);
          }
        }

        const snapshot = await resolveSupabaseSessionSnapshotFallback({
          preferredDisplayName: sanitizedDisplayName,
        });

        if (snapshot) {
          return snapshot;
        }
      }

      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your profile name.");
      }

      await ensureVerifiedSessionAccess(user, "Verify your email before changing the profile name.");

      if (!sanitizedDisplayName) {
        throw createFirebaseError("display-name/empty", "Enter a profile name.");
      }

      const userRef = userRefFor(user.uid);
      const existingSnapshot = await getDoc(userRef);
      const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
      const hasStoredProfileRecord =
        existingSnapshot.exists() && typeof existingData?.profileId === "number";
      const syncAuthDisplayNameIfNeeded = async () => {
        if ((typeof user.displayName === "string" ? user.displayName.trim() : null) !== sanitizedDisplayName) {
          try {
            await updateProfile(user, { displayName: sanitizedDisplayName });
          } catch (error) {
            console.error("Failed to sync Firebase Auth displayName after profile name change:", error);
          }
        }
      };

      if (!hasStoredProfileRecord) {
        const recoveredSnapshot = await resolveUserSnapshot(user, {
          preferredDisplayName: sanitizedDisplayName,
        });

        await syncAuthDisplayNameIfNeeded();
        return recoveredSnapshot;
      }

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

        if (!hasStoredProfileRecord) {
          const recoveredSnapshot = await resolveUserSnapshot(user, {
            preferredDisplayName: sanitizedDisplayName,
          });

          await syncAuthDisplayNameIfNeeded();
          return recoveredSnapshot;
        }

        throw createFirebaseError(
          "display-name/persist-failed",
          "Profile name could not be saved. Check Firestore rules for users/{uid}."
        );
      }

      await syncAuthDisplayNameIfNeeded();

      const snapshot = publishUserSnapshot(
        toUserSnapshot(user, {
          ...existingData,
          displayName: sanitizedDisplayName,
        })
      );
      void syncSupabaseProfileRecord(user, snapshot);
      return snapshot;
    };

    const completeGoogleAccount = async ({ login, displayName, password }) => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in with Google again to finish the account setup."
        );
      }

      if (!user.email) {
        throw createFirebaseError(
          "auth/missing-email",
          "This Google account does not provide an email for password sign-in."
        );
      }

      const providerIdsBeforeLink = getProviderIds(user);
      const loginDetails = await resolveAvailableLogin(login, user.uid);
      const sanitizedDisplayName = sanitizeDisplayName(displayName);

      if (!password || String(password).length < 6) {
        throw createFirebaseError(
          "auth/weak-password",
          "Password should be at least 6 characters."
        );
      }

      if (!providerIdsBeforeLink.includes("password")) {
        try {
          await linkWithCredential(
            user,
            EmailAuthProvider.credential(user.email, password)
          );
        } catch (error) {
          const errorCode = getErrorCode(error);

          if (errorCode !== "auth/provider-already-linked") {
            throw error;
          }
        }
      }

      if (sanitizedDisplayName) {
        try {
          await updateProfile(user, { displayName: sanitizedDisplayName });
        } catch (error) {
          console.error("Failed to sync Firebase Auth displayName after Google completion:", error);
        }
      }

      await setDoc(
        userRefFor(user.uid),
        stripNullishFields({
          login: loginDetails.login,
          loginLower: loginDetails.loginLower,
          displayName: sanitizedDisplayName || user.displayName || loginDetails.login,
          providerIds: getProviderIds(user),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );

      const snapshot = await resolveUserSnapshot(user, {
        requestedLogin: loginDetails.login,
        preferredDisplayName:
          sanitizedDisplayName || user.displayName || loginDetails.login,
      });
      const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);

      await syncPresence(user, {
        path: window.location.pathname,
        source: "google-complete",
        forceVisit: true,
      });

      return allowedSnapshot;
    };

    const finalizeGoogleSignIn = async (user) => {
      try {
        const snapshot = await resolveUserSnapshot(user, {
          preferredDisplayName: user.displayName?.trim() || null,
        });
        const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);
        await syncPresence(user, {
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

    const loginWithGoogle = async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        return await finalizeGoogleSignIn(result.user);
      } catch (error) {
        if (shouldFallbackGooglePopupToRedirect(error)) {
          await signInWithRedirect(auth, provider);
          return null;
        }

        throw error;
      }
    };

    const getProfileById = async (profileId) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const forceFreshProfileFetch = shouldForceFreshProfileFetch(profileId);

      if (
        window.sakuraCurrentUserSnapshot &&
        !window.sakuraCurrentUserSnapshot.isAnonymous &&
        window.sakuraCurrentUserSnapshot.profileId === profileId
      ) {
        return window.sakuraCurrentUserSnapshot;
      }

      const cachedProfileSnapshot = readRuntimeCacheEntry(
        profileByIdRuntimeCache,
        String(profileId)
      );

      if (!forceFreshProfileFetch && cachedProfileSnapshot.hit) {
        return await enrichProfileSnapshotWithPrivateFields(profileId, cachedProfileSnapshot.value);
      }

      const loadProfileById = async () => {
          const supabaseProfile = await fetchSupabaseProfileById(profileId, {
            forceFresh: forceFreshProfileFetch,
          });

          if (supabaseProfile) {
            return supabaseProfile;
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
            return cacheResolvedProfileSnapshot(
              profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null
            );
          }

          await waitForAuthStateSettlement();

          if (auth.currentUser && !auth.currentUser.isAnonymous) {
            try {
              profileDoc = await readProfileDoc();
              return cacheResolvedProfileSnapshot(
                profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null
              );
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

          return cacheResolvedProfileSnapshot(
            profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null
          );
        };

      const resolvedProfileSnapshot = forceFreshProfileFetch
        ? await loadProfileById()
        : await runCachedLookup(
            profileByIdRuntimeCache,
            String(profileId),
            PROFILE_RUNTIME_CACHE_TTL_MS,
            "profile-by-id:" + profileId,
            loadProfileById
          );

      return await enrichProfileSnapshotWithPrivateFields(profileId, resolvedProfileSnapshot);
    };
    const refreshProfileById = async (profileId) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      markProfileForFreshFetch(profileId);
      return await getProfileById(profileId);
    };

    const getProfileByAuthorName = async (authorName) => {
      const normalizedAuthorName = normalizeProfileCommentAuthorName(authorName);

      if (!normalizedAuthorName) {
        return null;
      }

      const cachedProfileSnapshot = readRuntimeCacheEntry(
        profileByAuthorRuntimeCache,
        normalizedAuthorName
      );

      if (cachedProfileSnapshot.hit) {
        return cachedProfileSnapshot.value;
      }

      return runCachedLookup(
        profileByAuthorRuntimeCache,
        normalizedAuthorName,
        PROFILE_RUNTIME_CACHE_TTL_MS,
        "profile-by-author:" + normalizedAuthorName,
        async () => {
          const supabaseProfile = await fetchSupabaseProfileByAuthorName(normalizedAuthorName);

          if (supabaseProfile) {
            return supabaseProfile;
          }

          const readProfileDoc = async () =>
            withTimeout(
              findUserByAuthorName(normalizedAuthorName),
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
            return cacheResolvedProfileSnapshot(
              profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null
            );
          }

          await waitForAuthStateSettlement();

          if (auth.currentUser && !auth.currentUser.isAnonymous) {
            try {
              profileDoc = await readProfileDoc();
              return cacheResolvedProfileSnapshot(
                profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null
              );
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

          return cacheResolvedProfileSnapshot(
            profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null
          );
        }
      );
    };
    const getProfilesByLoginPrefix = async (loginPrefix) => {
      const normalizedPrefix = normalizeLogin(loginPrefix);

      if (!normalizedPrefix || normalizedPrefix.length < 2) {
        return [];
      }

      return runCachedLookup(
        profilesByPrefixRuntimeCache,
        normalizedPrefix,
        PROFILE_SEARCH_RUNTIME_CACHE_TTL_MS,
        "profiles-by-prefix:" + normalizedPrefix,
        async () => {
          const supabaseProfiles = await fetchSupabaseProfileRowsByLoginPrefix(normalizedPrefix);

          try {
            const snapshot = await withTimeout(
              findUsersByLoginPrefix(normalizedPrefix),
              PROFILE_LOOKUP_TIMEOUT_MS,
              () =>
                createFirebaseError(
                  "profile/load-timeout",
                  "Profile search took too long. Refresh the page and try again."
                )
            );

            const firebaseProfiles = snapshot
              .map((profileDoc) => cacheResolvedProfileSnapshot(toStoredUserSnapshot(profileDoc.id, profileDoc.data())))
              .filter(Boolean)
              .filter(
                (profile, index, profiles) =>
                  typeof profile.login === "string" &&
                  normalizeLogin(profile.login)?.startsWith(normalizedPrefix) &&
                  index === profiles.findIndex((candidate) => candidate.uid === profile.uid)
              );

            return [...supabaseProfiles, ...firebaseProfiles]
              .filter(Boolean)
              .filter(
                (profile, index, profiles) =>
                  index === profiles.findIndex((candidate) => candidate.uid === profile.uid)
              )
              .slice(0, 8);
          } catch (error) {
            if (supabaseProfiles.length) {
              return supabaseProfiles.slice(0, 8);
            }

            throw error;
          }
        }
      );
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
                (
                  (typeof comment.message === "string" && comment.message) ||
                  (typeof comment.mediaURL === "string" && comment.mediaURL)
                )
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

      const supabaseComments = await fetchSupabaseCommentsByProfileId(profileId);

      if (supabaseComments) {
        return supabaseComments;
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
          const fallbackSupabaseComments = await fetchSupabaseCommentsByProfileId(profileId);

          if (fallbackSupabaseComments) {
            return fallbackSupabaseComments;
          }

          throw createFirebaseError(
            "comments/read-denied",
            "Profile comments are blocked by Firestore rules. Allow read access to profileComments."
          );
        }

        throw error;
      }
    };

    const isCommentMediaPathReferenced = async (mediaPath) => {
      const normalizedMediaPath =
        typeof mediaPath === "string" ? mediaPath.trim() : "";

      if (!normalizedMediaPath) {
        return false;
      }

      const supabaseRows = await fetchSupabaseRows("public_profile_comments", {
        select: "id",
        media_path: "eq." + normalizedMediaPath,
        limit: 1,
      });

      if (Array.isArray(supabaseRows) && supabaseRows.length > 0) {
        return true;
      }

      const snapshot = await getDocs(
        query(profileCommentsCollection, where("mediaPath", "==", normalizedMediaPath), limit(1))
      );

      return !snapshot.empty;
    };

    const addProfileComment = async (profileId, message, mediaFile = null) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const normalizedMessage = normalizeProfileCommentMessage(message);
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });
      const user = auth.currentUser;

      if ((!user || user.isAnonymous) && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to leave a comment on this profile."
        );
      }

      if (user && !user.isAnonymous) {
        await ensureVerifiedSessionAccess(
          user,
          "Verify your email before posting comments."
        );
      } else if (isEmailVerificationLocked(currentSupabaseDetails)) {
        throw createFirebaseError(
          "auth/email-not-verified",
          "Verify your email before posting comments."
        );
      }

      const commentMedia = await prepareProfileCommentMedia(mediaFile);

      if (!normalizedMessage && !commentMedia) {
        throw createFirebaseError(
          "comments/empty-message",
          "Write a comment or attach media before sending."
        );
      }

      if (hasAssignedProfileId(currentSupabaseDetails)) {
        const supabaseResponse = await callSupabaseAuthenticatedRpc(
          "add_profile_comment_rpc",
          {
            target_profile_id: profileId,
            target_message: normalizedMessage,
            target_media_url: commentMedia?.mediaURL ?? null,
            target_media_type: commentMedia?.mediaType ?? null,
            target_media_path: commentMedia?.mediaPath ?? null,
            target_media_size: commentMedia?.mediaSize ?? null,
          },
          "Comment could not be saved."
        );
        const supabaseComment = mapSupabaseRpcCommentPayloadToStoredComment(supabaseResponse);

        if (supabaseComment) {
          return supabaseComment;
        }
      }

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "comments/write-denied",
          "Comment could not be saved."
        );
      }

      let authorSnapshot = window.sakuraCurrentUserSnapshot;
      if (
        !authorSnapshot ||
        authorSnapshot.isAnonymous ||
        authorSnapshot.uid !== user.uid ||
        !hasAssignedProfileId(authorSnapshot)
      ) {
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
        mediaURL: commentMedia?.mediaURL ?? null,
        mediaType: commentMedia?.mediaType ?? null,
        mediaPath: commentMedia?.mediaPath ?? null,
        mediaSize: commentMedia?.mediaSize ?? null,
        createdAt,
      });
      const displayCommentPayload = {
        ...persistedCommentPayload,
        authorPhotoURL: authorSnapshot?.photoURL ?? null,
        authorAccentRole: pickCommentAccentRole(authorSnapshot?.roles ?? [], "user"),
      };
      const photoCommentPayload = {
        ...persistedCommentPayload,
        authorPhotoURL: authorSnapshot?.photoURL ?? null,
      };
      const timestampCommentPayload = {
        ...stripNullishFields({
          profileId,
          authorUid: user.uid,
          authorProfileId:
            typeof authorSnapshot?.profileId === "number" ? authorSnapshot.profileId : null,
          authorName,
          message: normalizedMessage,
          mediaURL: commentMedia?.mediaURL ?? null,
          mediaType: commentMedia?.mediaType ?? null,
          mediaPath: commentMedia?.mediaPath ?? null,
          mediaSize: commentMedia?.mediaSize ?? null,
        }),
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(commentRef, displayCommentPayload);
      } catch (error) {
        if (isFirestoreDocumentTooLargeError(error)) {
          throw createFirebaseError(
            "comments/media-too-large",
            "This comment is too large for Firestore. Use a smaller image or GIF."
          );
        }

        if (isPermissionDeniedError(error)) {
          try {
            await setDoc(commentRef, photoCommentPayload);
          } catch (fallbackError) {
            if (isFirestoreDocumentTooLargeError(fallbackError)) {
              throw createFirebaseError(
                "comments/media-too-large",
                "This comment is too large for Firestore. Use a smaller image or GIF."
              );
            }

            if (isPermissionDeniedError(fallbackError)) {
              try {
                await setDoc(commentRef, persistedCommentPayload);
              } catch (legacyError) {
                if (isFirestoreDocumentTooLargeError(legacyError)) {
                  throw createFirebaseError(
                    "comments/media-too-large",
                    "This comment is too large for Firestore. Use a smaller image or GIF."
                  );
                }

                if (isPermissionDeniedError(legacyError)) {
                  try {
                    await setDoc(commentRef, timestampCommentPayload);
                  } catch (timestampError) {
                    if (isFirestoreDocumentTooLargeError(timestampError)) {
                      throw createFirebaseError(
                        "comments/media-too-large",
                        "This comment is too large for Firestore. Use a smaller image or GIF."
                      );
                    }

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

      const createdComment = toStoredProfileComment(commentRef.id, displayCommentPayload);
      void syncSupabaseCommentRecord(user, createdComment);
      return createdComment;
    };

    const deleteProfileComment = async (commentId) => {
      const normalizedCommentId = typeof commentId === "string" ? commentId.trim() : "";
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });

      if (!normalizedCommentId) {
        throw createFirebaseError("comments/invalid-id", "Comment id is required.");
      }

      const user = auth.currentUser;

      if ((!user || user.isAnonymous) && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to manage comments on this profile."
        );
      }

      if (user && !user.isAnonymous) {
        await ensureVerifiedSessionAccess(
          user,
          "Verify your email before managing comments."
        );
      } else if (isEmailVerificationLocked(currentSupabaseDetails)) {
        throw createFirebaseError(
          "auth/email-not-verified",
          "Verify your email before managing comments."
        );
      }

      if (hasAssignedProfileId(currentSupabaseDetails) && isUuidLike(normalizedCommentId)) {
        const supabaseResponse = await callSupabaseAuthenticatedRpc(
          "delete_profile_comment_rpc",
          {
            target_comment_id: normalizedCommentId,
          },
          "Comment could not be deleted."
        );

        if (typeof supabaseResponse?.id === "string" && supabaseResponse.id) {
          return supabaseResponse.id;
        }

        if (!user || user.isAnonymous) {
          return null;
        }
      }

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in again to manage older comments on this profile."
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
      const hasCommentModerationAccess = await canDeleteCommentAsModerator(actorSnapshot, comment);

      if (!isAuthor && !ownsTargetProfile && !hasCommentModerationAccess) {
        throw createFirebaseError(
          "comments/delete-forbidden",
          "You can only delete your own comments, comments on your profile, or moderate comments with staff roles. Co-owner cannot remove root comments outside their profile."
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

      void syncSupabaseCommentRemoval(user, comment.id);
      return comment.id;
    };

    const updateProfileComment = async (commentId, message, mediaFile = null, removeMedia = false) => {
      const normalizedCommentId = typeof commentId === "string" ? commentId.trim() : "";

      if (!normalizedCommentId) {
        throw createFirebaseError("comments/invalid-id", "Comment id is required.");
      }

      const normalizedMessage = normalizeProfileCommentMessage(message);
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });
      const user = auth.currentUser;

      if ((!user || user.isAnonymous) && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to manage comments on this profile."
        );
      }

      if (user && !user.isAnonymous) {
        await ensureVerifiedSessionAccess(
          user,
          "Verify your email before editing comments."
        );
      } else if (isEmailVerificationLocked(currentSupabaseDetails)) {
        throw createFirebaseError(
          "auth/email-not-verified",
          "Verify your email before editing comments."
        );
      }

      if (hasAssignedProfileId(currentSupabaseDetails) && isUuidLike(normalizedCommentId)) {
        const existingSupabaseComment = await fetchSupabaseCommentById(normalizedCommentId);

        if (existingSupabaseComment) {
          const commentMedia = await prepareProfileCommentMedia(mediaFile);
          const finalMediaURL = commentMedia
            ? commentMedia.mediaURL
            : (removeMedia ? null : (existingSupabaseComment.mediaURL ?? null));
          const finalMediaType = commentMedia
            ? commentMedia.mediaType
            : (removeMedia ? null : (existingSupabaseComment.mediaType ?? null));
          const finalMediaPath = commentMedia
            ? commentMedia.mediaPath ?? null
            : (removeMedia ? null : (existingSupabaseComment.mediaPath ?? null));
          const finalMediaSize = commentMedia
            ? commentMedia.mediaSize ?? null
            : (removeMedia ? null : (existingSupabaseComment.mediaSize ?? null));

          if (!normalizedMessage && !finalMediaURL) {
            throw createFirebaseError(
              "comments/empty-message",
              "Write a comment or attach media before saving."
            );
          }

          const supabaseResponse = await callSupabaseAuthenticatedRpc(
            "update_profile_comment_rpc",
            {
              target_comment_id: normalizedCommentId,
              target_message: normalizedMessage,
              target_media_url: finalMediaURL,
              target_media_type: finalMediaType,
              target_media_path: finalMediaPath,
              target_media_size: finalMediaSize,
            },
            "Comment could not be updated."
          );
          const supabaseComment = mapSupabaseRpcCommentPayloadToStoredComment(supabaseResponse);

          if (supabaseComment) {
            return supabaseComment;
          }

          return null;
        }

        if (!user || user.isAnonymous) {
          return null;
        }
      }

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in again to manage older comments on this profile."
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
      const hasCommentEditAccess = canManageRoles(actorSnapshot?.roles ?? []);

      if (!isAuthor && !hasCommentEditAccess) {
        throw createFirebaseError(
          "comments/update-forbidden",
          "You can only edit your own comments unless you are root."
        );
      }

      const commentMedia = await prepareProfileCommentMedia(mediaFile);
      const finalMediaURL = commentMedia
        ? commentMedia.mediaURL
        : (removeMedia ? null : (comment.mediaURL ?? null));
      const finalMediaType = commentMedia
        ? commentMedia.mediaType
        : (removeMedia ? null : (comment.mediaType ?? null));
      const finalMediaPath = commentMedia
        ? commentMedia.mediaPath ?? null
        : (removeMedia ? null : (comment.mediaPath ?? null));
      const finalMediaSize = commentMedia
        ? commentMedia.mediaSize ?? null
        : (removeMedia ? null : (comment.mediaSize ?? null));

      if (!normalizedMessage && !finalMediaURL) {
        throw createFirebaseError(
          "comments/empty-message",
          "Write a comment or attach media before saving."
        );
      }

      const updatedAt = new Date().toISOString();

      try {
        await setDoc(
          commentRef,
          {
            message: normalizedMessage,
            mediaURL: finalMediaURL,
            mediaType: finalMediaType,
            mediaPath: finalMediaPath,
            mediaSize: finalMediaSize,
            updatedAt,
          },
          { merge: true }
        );
      } catch (error) {
        if (isFirestoreDocumentTooLargeError(error)) {
          throw createFirebaseError(
            "comments/media-too-large",
            "This updated comment is too large for Firestore. Use a smaller image or GIF."
          );
        }

        if (isPermissionDeniedError(error)) {
          throw createFirebaseError(
            "comments/update-denied",
            "Comments could not be updated. Check Firestore rules for profileComments."
          );
        }

        throw error;
      }

      const updatedComment = toStoredProfileComment(comment.id, {
        ...comment,
        message: normalizedMessage,
        mediaURL: finalMediaURL,
        mediaType: finalMediaType,
        mediaPath: finalMediaPath,
        mediaSize: finalMediaSize,
        updatedAt,
      });
      void syncSupabaseCommentRecord(user, updatedComment);
      return updatedComment;
    };

    const updateAvatar = async (file) => {
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });
      const user = auth.currentUser;
      const targetProfileId = hasAssignedProfileId(currentSupabaseDetails)
        ? currentSupabaseDetails.profileId
        : null;

      if (!user && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your avatar.");
      }

      if (user) {
        await ensureVerifiedSessionAccess(user, "Verify your email before updating the avatar.");
      } else if (isEmailVerificationLocked(currentSupabaseDetails)) {
        throw createFirebaseError(
          "auth/email-not-verified",
          "Verify your email before updating the avatar."
        );
      }

      const targetUid =
        user?.uid ??
        (typeof currentSupabaseDetails?.firebaseUid === "string" && currentSupabaseDetails.firebaseUid
          ? currentSupabaseDetails.firebaseUid
          : typeof currentSupabaseDetails?.authUserId === "string" && currentSupabaseDetails.authUserId
            ? currentSupabaseDetails.authUserId
            : null);

      const avatarUpload = await prepareAvatarUpload(file, targetUid);

      if (!avatarUpload?.photoURL) {
        throw createFirebaseError("storage/invalid-file", "Choose an image before uploading.");
      }

      if (targetProfileId) {
        markProfileForFreshFetch(targetProfileId);
      }

      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "update_current_profile_avatar_rpc",
        {
          target_photo_url: avatarUpload.photoURL,
          target_avatar_path: avatarUpload.avatarPath ?? null,
          target_avatar_type: avatarUpload.avatarType ?? null,
          target_avatar_size: avatarUpload.avatarSize ?? null,
        },
        "Avatar could not be saved."
      );

      if (supabaseResponse) {
        if (targetProfileId) {
          markProfileForFreshFetch(targetProfileId);
        }

        if (user && !user.isAnonymous) {
          try {
            await updateProfile(user, { photoURL: avatarUpload.photoURL });
          } catch (error) {
            console.error("Failed to sync Firebase Auth photoURL after avatar update:", error);
          }
        }

        const snapshot = await resolveSupabaseSessionSnapshotFallback();

        if (snapshot) {
          return snapshot;
        }
      }

      if (!user) {
        throw createFirebaseError("avatar/persist-failed", "Avatar could not be saved.");
      }

      const photoURL = avatarUpload.photoURL;
      const userRef = userRefFor(user.uid);
      const existingSnapshot = await getDoc(userRef);
      const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
      const hasStoredProfileRecord =
        existingSnapshot.exists() && typeof existingData?.profileId === "number";
      let persistedInFirestore = false;
      const currentDetails = window.sakuraCurrentUserSnapshot
        ? buildUserDetailsFromSnapshot(user, window.sakuraCurrentUserSnapshot)
        : buildFallbackUserDetails(user);

      ensureAvatarUploadAllowedForRoles(
        avatarUpload.avatarType ?? null,
        existingData?.roles ?? currentDetails.roles ?? ["user"]
      );

      if (!hasStoredProfileRecord) {
        await resolveUserSnapshot(user);
      }

      try {
        await setDoc(
          userRef,
          {
            photoURL,
            avatarPath: avatarUpload.avatarPath ?? null,
            avatarType: avatarUpload.avatarType ?? null,
            avatarSize: avatarUpload.avatarSize ?? null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        persistedInFirestore = true;
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        if (!hasStoredProfileRecord) {
          await resolveUserSnapshot(user);

          await setDoc(
            userRef,
            {
              photoURL,
              avatarPath: avatarUpload.avatarPath ?? null,
              avatarType: avatarUpload.avatarType ?? null,
              avatarSize: avatarUpload.avatarSize ?? null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          persistedInFirestore = true;
        }
      }

      if (!persistedInFirestore || !photoURL) {
        throw createFirebaseError(
          "avatar/persist-failed",
          "Avatar could not be saved. Check Firestore rules for users/{uid}."
        );
      }

      const snapshot = publishUserSnapshot(
        toUserSnapshot(user, {
          ...currentDetails,
          photoURL,
          avatarPath: avatarUpload.avatarPath ?? null,
          avatarType: avatarUpload.avatarType ?? null,
          avatarSize: avatarUpload.avatarSize ?? null,
        })
      );
      void syncSupabaseProfileRecord(user, snapshot);
      return snapshot;
    };

    const deleteAvatar = async () => {
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });
      const user = auth.currentUser;
      const targetProfileId = hasAssignedProfileId(currentSupabaseDetails)
        ? currentSupabaseDetails.profileId
        : null;

      if (!user && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your avatar.");
      }

      if (user) {
        await ensureVerifiedSessionAccess(user, "Verify your email before updating the avatar.");
      } else if (isEmailVerificationLocked(currentSupabaseDetails)) {
        throw createFirebaseError(
          "auth/email-not-verified",
          "Verify your email before updating the avatar."
        );
      }

      if (targetProfileId) {
        markProfileForFreshFetch(targetProfileId);
      }

      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "update_current_profile_avatar_rpc",
        {
          target_photo_url: null,
          target_avatar_path: null,
          target_avatar_type: null,
          target_avatar_size: null,
        },
        "Avatar could not be deleted."
      );

      if (supabaseResponse) {
        if (targetProfileId) {
          markProfileForFreshFetch(targetProfileId);
        }

        if (user && !user.isAnonymous) {
          try {
            await updateProfile(user, { photoURL: null });
          } catch (error) {
            console.error("Failed to sync Firebase Auth photoURL after avatar delete:", error);
          }
        }

        const snapshot = await resolveSupabaseSessionSnapshotFallback();

        if (snapshot) {
          return snapshot;
        }
      }

      if (!user) {
        throw createFirebaseError("avatar/delete-failed", "Avatar could not be deleted.");
      }

      const userRef = userRefFor(user.uid);
      const existingSnapshot = await getDoc(userRef);
      const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
      const hasStoredProfileRecord =
        existingSnapshot.exists() && typeof existingData?.profileId === "number";

      if (!hasStoredProfileRecord) {
        await resolveUserSnapshot(user);
      }

      if (STORAGE_AVATAR_UPLOADS_ENABLED) {
        try {
          await deleteAvatarFromStorage(user.uid);
        } catch (error) {
          console.error("Failed to delete avatar file from storage:", error);
        }
      }

      try {
        await setDoc(
          userRef,
          {
            photoURL: null,
            avatarPath: null,
            avatarType: null,
            avatarSize: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        if (!hasStoredProfileRecord) {
          await resolveUserSnapshot(user);

          await setDoc(
            userRef,
            {
              photoURL: null,
              avatarPath: null,
              avatarType: null,
              avatarSize: null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } else {
          throw createFirebaseError(
            "avatar/delete-failed",
            "Avatar could not be deleted. Check Firestore rules for users/{uid}."
          );
        }
      }

      const currentDetails = window.sakuraCurrentUserSnapshot
        ? buildUserDetailsFromSnapshot(user, window.sakuraCurrentUserSnapshot)
        : buildFallbackUserDetails(user);

      const snapshot = publishUserSnapshot(
        toUserSnapshot(user, {
          ...currentDetails,
          photoURL: null,
          avatarPath: null,
          avatarType: null,
          avatarSize: null,
        })
      );
      void syncSupabaseProfileRecord(user, snapshot);
      return snapshot;
    };
    const adminUpdateProfileDisplayName = async (profileId, nextDisplayName) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const sanitizedDisplayName = sanitizeDisplayName(nextDisplayName);

      if (!sanitizedDisplayName) {
        throw createFirebaseError("display-name/empty", "Enter a profile name.");
      }

      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "admin_update_profile_identity_rpc",
        {
          target_profile_id: profileId,
          target_display_name: sanitizedDisplayName,
        },
        "Profile name could not be saved."
      );

      if (supabaseResponse) {
        if (
          window.sakuraCurrentUserSnapshot?.profileId === profileId &&
          auth.currentUser &&
          !auth.currentUser.isAnonymous
        ) {
          try {
            await updateProfile(auth.currentUser, { displayName: sanitizedDisplayName });
          } catch (error) {
            console.error("Failed to sync Firebase Auth displayName from admin panel:", error);
          }
        }

        if (window.sakuraCurrentUserSnapshot?.profileId === profileId) {
          const currentSnapshot = await resolveSupabaseSessionSnapshotFallback({
            preferredDisplayName: sanitizedDisplayName,
          });

          if (currentSnapshot) {
            return currentSnapshot;
          }
        }

        const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot(supabaseResponse, {
          profileId,
        });

        if (mappedSnapshot) {
          return mappedSnapshot;
        }

        const refreshedSnapshot = await getProfileById(profileId).catch(() => null);

        if (refreshedSnapshot) {
          return {
            ...refreshedSnapshot,
            displayName:
              typeof supabaseResponse?.displayName === "string"
                ? supabaseResponse.displayName
                : refreshedSnapshot.displayName,
          };
        }
      }

      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

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

      if (user && targetDoc.id === user.uid) {
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
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const normalizedRequestedLogin = String(nextLogin ?? "").trim().replace(/\\s+/g, "");

      if (!normalizedRequestedLogin) {
        throw createFirebaseError("auth/invalid-login", "Enter a login.");
      }

      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "admin_update_profile_identity_rpc",
        {
          target_profile_id: profileId,
          target_login: normalizedRequestedLogin,
        },
        "Login could not be saved."
      );

      if (supabaseResponse) {
        if (window.sakuraCurrentUserSnapshot?.profileId === profileId) {
          const currentSnapshot = await resolveSupabaseSessionSnapshotFallback({
            requestedLogin: normalizedRequestedLogin,
          });

          if (currentSnapshot) {
            return currentSnapshot;
          }
        }

        const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot(supabaseResponse, {
          profileId,
        });

        if (mappedSnapshot) {
          return mappedSnapshot;
        }

        const refreshedSnapshot = await getProfileById(profileId).catch(() => null);

        if (refreshedSnapshot) {
          return {
            ...refreshedSnapshot,
            login:
              typeof supabaseResponse?.login === "string"
                ? supabaseResponse.login
                : refreshedSnapshot.login,
          };
        }
      }

      const { actorSnapshot } = await ensureRootActorSnapshot();

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

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
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const avatarUpload = await prepareAvatarUpload(file, profileId);

      if (!avatarUpload?.photoURL) {
        throw createFirebaseError("storage/invalid-file", "Choose an image before uploading.");
      }

      markProfileForFreshFetch(profileId);

      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "admin_update_profile_avatar_rpc",
        {
          target_profile_id: profileId,
          target_photo_url: avatarUpload.photoURL,
          target_avatar_path: avatarUpload.avatarPath ?? null,
          target_avatar_type: avatarUpload.avatarType ?? null,
          target_avatar_size: avatarUpload.avatarSize ?? null,
        },
        "Avatar could not be saved."
      );

      if (supabaseResponse) {
        markProfileForFreshFetch(profileId);

        if (window.sakuraCurrentUserSnapshot?.profileId === profileId) {
          const currentSnapshot = await resolveSupabaseSessionSnapshotFallback();

          if (currentSnapshot) {
            return currentSnapshot;
          }
        }

        const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot(supabaseResponse, {
          profileId,
        });

        if (mappedSnapshot) {
          return mappedSnapshot;
        }

        const refreshedSnapshot = await getProfileById(profileId).catch(() => null);

        if (refreshedSnapshot) {
          return {
            ...refreshedSnapshot,
            photoURL:
              typeof supabaseResponse?.photoURL === "string"
                ? supabaseResponse.photoURL
                : refreshedSnapshot.photoURL,
            avatarPath:
              typeof supabaseResponse?.avatarPath === "string"
                ? supabaseResponse.avatarPath
                : refreshedSnapshot.avatarPath,
            avatarType:
              typeof supabaseResponse?.avatarType === "string"
                ? supabaseResponse.avatarType
                : refreshedSnapshot.avatarType,
            avatarSize:
              typeof supabaseResponse?.avatarSize === "number"
                ? supabaseResponse.avatarSize
                : refreshedSnapshot.avatarSize,
          };
        }
      }

      const { actorSnapshot } = await ensureRootActorSnapshot();

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

      ensureAvatarUploadAllowedForRoles(
        avatarUpload.avatarType ?? null,
        targetDoc.data()?.roles ?? ["user"]
      );

      const photoURL = avatarUpload.photoURL;

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            photoURL,
            avatarPath: avatarUpload.avatarPath ?? null,
            avatarType: avatarUpload.avatarType ?? null,
            avatarSize: avatarUpload.avatarSize ?? null,
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

      if (!photoURL) {
        throw createFirebaseError(
          "avatar/persist-failed",
          "Avatar could not be saved. Check Firestore rules for privileged users."
        );
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        photoURL,
        avatarPath: avatarUpload.avatarPath ?? null,
        avatarType: avatarUpload.avatarType ?? null,
        avatarSize: avatarUpload.avatarSize ?? null,
      });
    };

    const adminDeleteProfileAvatar = async (profileId) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      markProfileForFreshFetch(profileId);

      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "admin_update_profile_avatar_rpc",
        {
          target_profile_id: profileId,
          target_photo_url: null,
          target_avatar_path: null,
          target_avatar_type: null,
          target_avatar_size: null,
        },
        "Avatar could not be deleted."
      );

      if (supabaseResponse) {
        markProfileForFreshFetch(profileId);

        if (window.sakuraCurrentUserSnapshot?.profileId === profileId) {
          const currentSnapshot = await resolveSupabaseSessionSnapshotFallback();

          if (currentSnapshot) {
            return currentSnapshot;
          }
        }

        const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot(supabaseResponse);

        if (mappedSnapshot) {
          return mappedSnapshot;
        }

        const refreshedSnapshot = await getProfileById(profileId).catch(() => null);

        if (refreshedSnapshot) {
          return {
            ...refreshedSnapshot,
            photoURL: null,
            avatarPath: null,
            avatarType: null,
            avatarSize: null,
          };
        }
      }

      const { actorSnapshot } = await ensureRootActorSnapshot();

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

      if (STORAGE_AVATAR_UPLOADS_ENABLED) {
        try {
          await deleteAvatarFromStorage(targetDoc.id);
        } catch (error) {
          console.error("Failed to delete avatar file from storage:", error);
        }
      }

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            photoURL: null,
            avatarPath: null,
            avatarType: null,
            avatarSize: null,
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
        avatarPath: null,
        avatarType: null,
        avatarSize: null,
      });
    };
    const adminSetProfileBan = async (profileId, nextIsBanned) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const isBanned = Boolean(nextIsBanned);
      console.log("[adminSetProfileBan] Called with profileId:", profileId, "isBanned:", isBanned);
      markProfileForFreshFetch(profileId);
      let ensuredRootContext = null;
      const ensureRootContext = async () => {
        if (!ensuredRootContext) {
          ensuredRootContext = await ensureRootActorSnapshot();
        }

        return ensuredRootContext;
      };
      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "admin_set_profile_ban_rpc",
        {
          target_profile_id: profileId,
          target_is_banned: isBanned,
        },
        "Ban status could not be saved."
      );

      console.log("[adminSetProfileBan] supabaseResponse:", supabaseResponse);

      if (supabaseResponse) {
        const responseIsBanned =
          typeof supabaseResponse?.isBanned === "boolean"
            ? supabaseResponse.isBanned
            : isBanned;
        const responseBannedAt =
          typeof supabaseResponse?.bannedAt === "string" ? supabaseResponse.bannedAt : null;

        console.log("[adminSetProfileBan] responseIsBanned:", responseIsBanned, "responseBannedAt:", responseBannedAt);

        if (window.sakuraCurrentUserSnapshot?.profileId === profileId) {
          const currentSnapshot = await resolveSupabaseSessionSnapshotFallback();

          if (currentSnapshot) {
            const nextSnapshot = {
              ...currentSnapshot,
              isBanned: responseIsBanned,
              bannedAt: responseBannedAt,
            };

            if (responseIsBanned) {
              await enforceActiveSessionNotBanned(nextSnapshot, { throwError: true });
            }

            console.log("[adminSetProfileBan] Returning current user snapshot");
            return nextSnapshot;
          }
        }

        const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot({
          ...supabaseResponse,
          isBanned: responseIsBanned,
          bannedAt: responseBannedAt,
        }, {
          profileId,
        });

        console.log("[adminSetProfileBan] mappedSnapshot:", mappedSnapshot);

        if (mappedSnapshot) {
          console.log("[adminSetProfileBan] Returning mappedSnapshot");
          return mappedSnapshot;
        }

        const refreshedSnapshot = await getProfileById(profileId).catch(() => null);

        console.log("[adminSetProfileBan] refreshedSnapshot:", refreshedSnapshot);

        if (refreshedSnapshot) {
          console.log("[adminSetProfileBan] Returning refreshedSnapshot");
          return {
            ...refreshedSnapshot,
            isBanned: responseIsBanned,
            bannedAt: responseBannedAt,
          };
        }
      }

      const { user, actorSnapshot } = await ensureRootContext();

      const syncResponse = await requestSupabaseSyncActionOrThrow(
        user,
        "admin_set_profile_ban",
        {
          profileId,
          isBanned,
        },
        "ban/persist-failed",
        "Ban status could not be saved."
      ).catch(() => null);

      if (syncResponse && typeof syncResponse === "object") {
        const responseProfile =
          syncResponse.profile && typeof syncResponse.profile === "object"
            ? syncResponse.profile
            : null;

        if (responseProfile) {
          const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot(responseProfile, {
            profileId,
          });

          if (mappedSnapshot) {
            return mappedSnapshot;
          }
        }
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

      const bannedAt = isBanned ? new Date().toISOString() : null;

      if (user && targetDoc.id === user.uid && isBanned) {
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

      if (user && targetDoc.id === user.uid && isBanned) {
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
    const adminSetProfileEmailVerification = async (profileId, nextIsVerified) => {
      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const isVerified = Boolean(nextIsVerified);

      if (
        actorSnapshot?.profileId === profileId &&
        !isVerified &&
        normalizeRoles(actorSnapshot?.roles ?? []).includes("root")
      ) {
        throw createFirebaseError(
          "verification/self-forbidden",
          "You cannot revoke email verification on your own root account."
        );
      }

      const response = await requestSupabaseSyncActionOrThrow(
        user,
        "admin_set_profile_email_verification",
        {
          profileId,
          isVerified,
        },
        "verification/persist-failed",
        "Email verification status could not be saved."
      );

      const refreshedSnapshot = await getProfileById(profileId).catch(() => null);
      const responseFields =
        response && typeof response.fields === "object" && response.fields ? response.fields : null;

      if (!refreshedSnapshot) {
        return null;
      }

      return {
        ...refreshedSnapshot,
        email:
          typeof responseFields?.email === "string"
            ? responseFields.email
            : refreshedSnapshot.email ?? null,
        emailVerified: isVerified,
        verificationRequired: !isVerified,
        providerIds:
          Array.isArray(responseFields?.providerIds) && responseFields.providerIds.length
            ? responseFields.providerIds
            : refreshedSnapshot.providerIds,
      };
    };
    const getAdminPrivateProfileFields = async (profileId) => {
      const { user } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      return await loadPrivateProfileFields(user, profileId);
    };

    const updateProfileRoles = async (profileId, nextRoles) => {
      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const roles = normalizeRoles(nextRoles);
      const supabaseResponse = await callSupabaseAuthenticatedRpc(
        "admin_update_profile_roles_rpc",
        {
          target_profile_id: profileId,
          target_roles: roles,
        },
        "Roles could not be updated."
      );

      if (supabaseResponse) {
        const responseRoles =
          Array.isArray(supabaseResponse?.roles) && supabaseResponse.roles.length
            ? normalizeRoles(supabaseResponse.roles)
            : roles;

        if (window.sakuraCurrentUserSnapshot?.profileId === profileId) {
          const currentSnapshot = await resolveSupabaseSessionSnapshotFallback();

          if (currentSnapshot) {
            return {
              ...currentSnapshot,
              roles: responseRoles,
            };
          }
        }

        const mappedSnapshot = mapSupabaseRpcProfilePayloadToSnapshot({
          ...supabaseResponse,
          roles: responseRoles,
        }, {
          profileId,
        });

        if (mappedSnapshot) {
          return mappedSnapshot;
        }

        const refreshedSnapshot = await getProfileById(profileId).catch(() => null);

        if (refreshedSnapshot) {
          return {
            ...refreshedSnapshot,
            roles: responseRoles,
          };
        }
      }

      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to manage roles.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      const actorRoles = actorSnapshot?.roles ?? [];

      ensureActorCanAssignRoles(actorRoles, targetDoc.data()?.roles ?? [], roles);

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
      const user = auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null;
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });
      const currentSnapshot = window.sakuraCurrentUserSnapshot;
      const currentRoles = normalizeRoles(
        currentSnapshot?.roles ?? currentSupabaseDetails?.roles ?? []
      );
      const currentProviderIds = normalizeProviderIdsList(
        currentSnapshot?.providerIds ??
          currentSupabaseDetails?.providerIds ??
          (user ? getProviderIds(user) : [])
      );

      if (!user && !currentSnapshot?.uid && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to verify your email.");
      }

      if (
        !requiresEmailVerification(currentRoles) ||
        hasTrustedEmailProvider(currentProviderIds)
      ) {
        const snapshot = await applyCurrentVerificationSnapshot({
          emailVerified: true,
          verificationRequired: false,
          verificationEmailSent: false,
          providerIds: currentProviderIds,
        });

        if (!snapshot) {
          return null;
        }

        return {
          ...snapshot,
          verificationEmailSent: false,
        };
      }

      const currentSupabaseUser = await getSupabaseBridgeCurrentUser();

      if (currentSupabaseUser?.emailVerified || user?.emailVerified) {
        const snapshot = await applyCurrentVerificationSnapshot({
          emailVerified: true,
          verificationRequired: false,
          verificationEmailSent: false,
          providerIds:
            currentProviderIds.length > 0
              ? currentProviderIds
              : currentSupabaseUser?.providerIds ?? null,
        });

        if (!snapshot) {
          return null;
        }

        return {
          ...snapshot,
          verificationEmailSent: false,
        };
      }

      const targetEmail =
        currentSupabaseUser?.email ??
        currentSupabaseDetails?.email ??
        currentSnapshot?.email ??
        user?.email ??
        null;
      let verificationEmailSent = false;

      const supabaseBridge = await ensureSupabasePasswordBridge();

      if (supabaseBridge?.resendVerificationEmail && typeof targetEmail === "string" && targetEmail) {
        await supabaseBridge.resendVerificationEmail(targetEmail);
        verificationEmailSent = true;
      }

      if (!verificationEmailSent && user) {
        await sendEmailVerification(user);
        verificationEmailSent = true;
      }

      if (!verificationEmailSent) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in again to verify your email."
        );
      }

      const snapshot = await applyCurrentVerificationSnapshot({
        emailVerified: false,
        verificationRequired: true,
        verificationEmailSent: true,
        providerIds:
          currentProviderIds.length > 0 ? currentProviderIds : currentSupabaseUser?.providerIds,
      });

      if (!snapshot) {
        return null;
      }

      return {
        ...snapshot,
        verificationEmailSent: true,
      };
    };
    const refreshVerificationStatus = async () => {
      const user = auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null;
      const currentSupabaseDetails = await loadCurrentAuthProfileFromSupabaseRpcWithRetry({
        attempts: 2,
        delayMs: 120,
      });

      if (!user && !window.sakuraCurrentUserSnapshot?.uid && !hasAssignedProfileId(currentSupabaseDetails)) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in again to refresh email verification."
        );
      }

      if (user) {
        await reload(user);
      }

      const currentSupabaseUser = await getSupabaseBridgeCurrentUser();

      const currentProviderIds = normalizeProviderIdsList(
        window.sakuraCurrentUserSnapshot?.providerIds ??
          currentSupabaseDetails?.providerIds ??
          currentSupabaseUser?.providerIds ??
          (user ? getProviderIds(user) : [])
      );

      if (
        currentSupabaseUser?.emailVerified ||
        user?.emailVerified ||
        hasTrustedEmailProvider(currentProviderIds)
      ) {
        const snapshot = await applyCurrentVerificationSnapshot({
          emailVerified: true,
          verificationRequired: false,
          verificationEmailSent: false,
          providerIds:
            currentProviderIds.length > 0
              ? currentProviderIds
              : currentSupabaseUser?.providerIds ?? null,
        });
        const allowedSnapshot = snapshot
          ? await enforceActiveSessionNotBanned(snapshot)
          : null;

        if (!allowedSnapshot) {
          return null;
        }

        return {
          ...allowedSnapshot,
          verificationEmailSent: false,
        };
      }

      let snapshot = await resolveSupabaseSessionSnapshotFallback();

      if (!snapshot && user) {
        snapshot = await resolveUserSnapshot(user);
      }

      const allowedSnapshot = snapshot
        ? await enforceActiveSessionNotBanned(snapshot)
        : null;

      if (!allowedSnapshot) {
        return null;
      }

      return {
        ...allowedSnapshot,
        verificationEmailSent: false,
      };
    };
    const getSiteOnlineCount = async () => {
      const presenceRuntime = await ensurePresenceRuntime();
      return presenceRuntime.getSiteOnlineCount();
    };
    const getSiteOnlineUsers = async () => {
      const presenceRuntime = await ensurePresenceRuntime();
      return presenceRuntime.getSiteOnlineUsers();
    };

    const redirectResultPromise = getRedirectResult(auth).catch((error) => {
      if (getErrorCode(error) !== "auth/no-auth-event") {
        const message =
          error instanceof Error ? error.message : "Google redirect sign-in could not be completed.";
        window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { detail: message }));
      }

      return null;
    });

    window.sakuraFirebaseAuth = {
      register: async ({ login, displayName, email, password }) => {
        const supabaseAuthBridge = await ensureSupabasePasswordBridge();
        const preferredLogin =
          sanitizeLogin(login) ||
          (typeof login === "string" ? login.trim() : "");
        const preferredDisplayName = sanitizeDisplayName(displayName);

        if (supabaseAuthBridge?.signUpWithPassword) {
          try {
            const signUpResult = await supabaseAuthBridge.signUpWithPassword({
              email,
              password,
              login: preferredLogin,
              displayName: preferredDisplayName,
            });

            if (!signUpResult?.session) {
              return null;
            }

            return await resolveSupabasePasswordSessionSnapshot({
              source: "register",
              requestedLogin: preferredLogin || null,
              preferredDisplayName:
                preferredDisplayName || preferredLogin || null,
            });
          } catch (error) {
            if (!shouldFallbackToFirebasePasswordRegister(error)) {
              throw error;
            }
          }
        }

        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const fallbackPreferredLogin =
          preferredLogin || ("user" + credentials.user.uid.slice(0, 6));
        let verificationEmailSent = false;

        try {
          let snapshot = await resolveUserSnapshot(credentials.user, {
            requestedLogin: login,
            preferredDisplayName: preferredDisplayName || fallbackPreferredLogin,
          });
          const storedRegistrationSnapshot = await getDoc(userRefFor(credentials.user.uid)).catch(
            (error) => {
              if (!isPermissionDeniedError(error)) {
                throw error;
              }

              return null;
            }
          );
          const storedRegistrationData = storedRegistrationSnapshot?.exists()
            ? storedRegistrationSnapshot.data()
            : null;
          const storedRegistrationLogin =
            typeof storedRegistrationData?.login === "string" ? storedRegistrationData.login : null;
          const storedRegistrationLoginLower =
            typeof storedRegistrationData?.loginLower === "string"
              ? storedRegistrationData.loginLower
              : null;

          if ((!storedRegistrationLogin || !storedRegistrationLoginLower) && fallbackPreferredLogin) {
            const recoveredLoginDetails = await resolveAvailableLogin(
              snapshot?.login || fallbackPreferredLogin,
              credentials.user.uid
            );

            await setDoc(
              userRefFor(credentials.user.uid),
              {
                login: recoveredLoginDetails.login,
                loginLower: recoveredLoginDetails.loginLower,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );

            snapshot = publishUserSnapshot(
              toUserSnapshot(credentials.user, {
                ...(window.sakuraCurrentUserSnapshot ?? snapshot ?? {}),
                ...storedRegistrationData,
                login: recoveredLoginDetails.login,
                loginLower: recoveredLoginDetails.loginLower,
                displayName:
                  snapshot?.displayName ?? preferredDisplayName ?? recoveredLoginDetails.login,
              })
            );
          }

          const registrationDisplayName =
            snapshot?.displayName ?? preferredDisplayName ?? snapshot?.login ?? fallbackPreferredLogin;

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
          void syncSupabasePasswordAccount(
            credentials.user,
            allowedSnapshot,
            email,
            password
          );

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
        const supabaseAuthBridge = await ensureSupabasePasswordBridge();

        if (supabaseAuthBridge?.loginWithPassword) {
          try {
            await supabaseAuthBridge.loginWithPassword(email, password);

            return await resolveSupabasePasswordSessionSnapshot({
              source: "login",
            });
          } catch (error) {
            if (!shouldFallbackToFirebasePasswordLogin(error)) {
              throw error;
            }
          }
        }

        const credentials = await signInWithEmailAndPassword(auth, email, password);

        try {
          const snapshot = await resolveUserSnapshot(credentials.user);
          const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);
          await syncPresence(credentials.user, {
            path: window.location.pathname,
            source: "login",
            forceVisit: true,
          });
          void syncSupabasePasswordAccount(
            credentials.user,
            allowedSnapshot,
            email,
            password
          );
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
      completeGoogleAccount,
      loginWithGoogle,
      updateDisplayName,
      updateUsername,
      adminUpdateProfileDisplayName,
      adminUpdateProfileLogin,
      adminSetProfileBan,
      adminSetProfileEmailVerification,
      getAdminPrivateProfileFields,
      adminDeleteAccount: async (profileId) => adminDeleteProfileAccount(profileId),
      getProfileById,
      refreshProfileById,
      getProfileByAuthorName,
      getProfilesByLoginPrefix,
      getProfileComments,
      isCommentMediaPathReferenced,
      addProfileComment,
      updateProfileComment,
      deleteProfileComment,
      resendVerificationEmail,
      refreshVerificationStatus,
      getSiteOnlineCount,
      getSiteOnlineUsers,
      updateProfileRoles,
      updateAvatar,
      deleteAvatar,
      adminUpdateProfileAvatar,
      adminDeleteProfileAvatar,
      getAuthToken: async () => {
        const user = auth.currentUser;

        if (!user || user.isAnonymous) {
          return null;
        }

        return getSupabaseSyncToken(user);
      },
      syncPresence: async (options = {}) => {
        const user = auth.currentUser;
        return syncPresence(user ?? null, options);
      },
      deleteAccount: async () => deleteCurrentAccount(),
      logout: async () => {
        stopPresenceTracking();
        await signOutSupabaseBridge();
        await signOut(auth);
        publishUserSnapshot(null);
      },
      onAuthStateChanged: (callback) =>
        onAuthStateChanged(auth, async (user) => {
          stopPresenceTracking();
          markAuthStateSettled();

          if (!user) {
            try {
              const fallbackSnapshot = await resolveSupabaseSessionSnapshotFallback();

              if (fallbackSnapshot) {
                callback(fallbackSnapshot);
                startPresenceTracking(null);
                return;
              }

              const bridgedUser =
                (await bridgeSupabaseSessionToFirebase()) ??
                (await bridgeSupabaseGoogleSessionToFirebase());

              if (bridgedUser && !bridgedUser.isAnonymous) {
                return;
              }
            } catch (error) {
              emitAuthError(
                error instanceof Error
                  ? error.message
                  : "Google sign-in could not be completed through Supabase."
              );
            }

            callback(publishUserSnapshot(null));
            return;
          }

          if (user.isAnonymous) {
            try {
              const fallbackSnapshot = await resolveSupabaseSessionSnapshotFallback();

              if (fallbackSnapshot) {
                callback(fallbackSnapshot);
                startPresenceTracking(null);
                return;
              }

              const bridgedUser =
                (await bridgeSupabaseSessionToFirebase()) ??
                (await bridgeSupabaseGoogleSessionToFirebase());

              if (bridgedUser && !bridgedUser.isAnonymous) {
                return;
              }
            } catch (error) {
              emitAuthError(
                error instanceof Error
                  ? error.message
                  : "Google sign-in could not be completed through Supabase."
              );
            }

            callback(publishUserSnapshot(toAnonymousViewerSnapshot(user)));
            return;
          }

          try {
            const redirectResult = await redirectResultPromise;
            const snapshot =
              redirectResult?.user?.uid === user.uid
                ? await finalizeGoogleSignIn(user)
                : await resolveUserSnapshot(user);
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
