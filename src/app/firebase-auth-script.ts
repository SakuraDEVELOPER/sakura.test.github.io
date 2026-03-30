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
          onAuthStateChanged,
          reauthenticateWithCredential,
          reload,
          sendEmailVerification,
          signInAnonymously,
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
        },
        {
          deleteObject,
          getDownloadURL,
          getStorage,
          ref: storageRef,
          uploadBytes
        }
      ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js")
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
  const PRESENCE_ONLINE_WINDOW_MS = 90 * 1000;
  const PRESENCE_HEARTBEAT_INTERVAL_MS = 45 * 1000;
  const PRESENCE_VISIT_RECORD_COOLDOWN_MS = 5 * 60 * 1000;
  const DISPLAY_NAME_MAX_LENGTH = 48;
  const USER_UPDATE_EVENT = "sakura-user-update";
  const AUTH_ERROR_EVENT = "sakura-auth-error";
  const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
  const CURRENT_PROFILE_ID_STORAGE_KEY = "sakura-current-profile-id";
  const AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);
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
    avatarPath: resolveAvatarPath(details, null),
    avatarType: resolveAvatarType(details, null),
    avatarSize: resolveAvatarSize(details, null),
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
          avatarPath: resolveAvatarPath(details, null),
          avatarType: resolveAvatarType(details, null),
          avatarSize: resolveAvatarSize(details, null),
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
    avatarPath: resolveAvatarPath(details, null),
    avatarType: resolveAvatarType(details, null),
    avatarSize: resolveAvatarSize(details, null),
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
    const storage = getStorage(app);
    const provider = new GoogleAuthProvider();

    const userRefFor = (uid) => doc(db, "users", uid);
    const avatarStorageRefFor = (uid, extension) =>
      storageRef(storage, \`avatars/\${uid}/avatar.\${extension}\`);
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
    const uploadAvatarToStorage = async (uid, file) => {
      const extension = getAvatarStorageExtension(file);

      if (!extension) {
        return null;
      }

      const avatarRef = avatarStorageRefFor(uid, extension);

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

      await Promise.all(
        extensions.map(async (extension) => {
          try {
            await deleteObject(avatarStorageRefFor(uid, extension));
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
          Date.now() - lastPresenceAt > PRESENCE_VISIT_RECORD_COOLDOWN_MS ||
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
      const profilePayload = {
        uid: user.uid,
        email: user.email ?? null,
        emailVerified:
          storedEmailVerified !== null ? storedEmailVerified : Boolean(user.emailVerified),
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
        verificationRequired:
          storedVerificationRequired !== null
            ? storedVerificationRequired
            : requiresEmailVerification(roles),
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

      const handlePageShow = () => {
        syncCurrentPresence("page-show", true);
      };

      const handlePageHide = () => {
        syncCurrentPresence("page-hide", true);
      };

      const intervalId = window.setInterval(() => {
        syncCurrentPresence("heartbeat");
      }, PRESENCE_HEARTBEAT_INTERVAL_MS);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pageshow", handlePageShow);
      window.addEventListener("pagehide", handlePageHide);

      stopPresenceTracking = () => {
        window.clearInterval(intervalId);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pageshow", handlePageShow);
        window.removeEventListener("pagehide", handlePageHide);
      };

      syncCurrentPresence("session-start", true);

      return stopPresenceTracking;
    };

    const updateUsername = async (nextUsername, currentPassword = "") => {
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

      return snapshot;
    };
    const updateDisplayName = async (nextDisplayName) => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your profile name.");
      }

      await ensureVerifiedSessionAccess(user, "Verify your email before changing the profile name.");

      const sanitizedDisplayName = sanitizeDisplayName(nextDisplayName);

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

      return publishUserSnapshot(
        toUserSnapshot(user, {
          ...existingData,
          displayName: sanitizedDisplayName,
        })
      );
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

    const getProfileByAuthorName = async (authorName) => {
      const normalizedAuthorName = normalizeProfileCommentAuthorName(authorName);

      if (!normalizedAuthorName) {
        return null;
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

      return profileDoc ? toStoredUserSnapshot(profileDoc.id, profileDoc.data()) : null;
    };
    const getProfilesByLoginPrefix = async (loginPrefix) => {
      const normalizedPrefix = normalizeLogin(loginPrefix);

      if (!normalizedPrefix || normalizedPrefix.length < 2) {
        return [];
      }

      const snapshot = await withTimeout(
        findUsersByLoginPrefix(normalizedPrefix),
        PROFILE_LOOKUP_TIMEOUT_MS,
        () =>
          createFirebaseError(
            "profile/load-timeout",
            "Profile search took too long. Refresh the page and try again."
          )
      );

      return snapshot
        .map((profileDoc) => toStoredUserSnapshot(profileDoc.id, profileDoc.data()))
        .filter(
          (profile, index, profiles) =>
            typeof profile.login === "string" &&
            normalizeLogin(profile.login)?.startsWith(normalizedPrefix) &&
            index === profiles.findIndex((candidate) => candidate.uid === profile.uid)
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

    const isCommentMediaPathReferenced = async (mediaPath) => {
      const normalizedMediaPath =
        typeof mediaPath === "string" ? mediaPath.trim() : "";

      if (!normalizedMediaPath) {
        return false;
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

      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to leave a comment on this profile."
        );
      }

      await ensureVerifiedSessionAccess(
        user,
        "Verify your email before posting comments."
      );

      let authorSnapshot = window.sakuraCurrentUserSnapshot;
      if (
        !authorSnapshot ||
        authorSnapshot.isAnonymous ||
        authorSnapshot.uid !== user.uid ||
        !hasAssignedProfileId(authorSnapshot)
      ) {
        authorSnapshot = await resolveUserSnapshot(user);
      }

      const commentMedia = await prepareProfileCommentMedia(mediaFile);

      if (!normalizedMessage && !commentMedia) {
        throw createFirebaseError(
          "comments/empty-message",
          "Write a comment or attach media before sending."
        );
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

      await ensureVerifiedSessionAccess(
        user,
        "Verify your email before managing comments."
      );

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

      return comment.id;
    };

    const updateProfileComment = async (commentId, message, mediaFile = null, removeMedia = false) => {
      const normalizedCommentId = typeof commentId === "string" ? commentId.trim() : "";

      if (!normalizedCommentId) {
        throw createFirebaseError("comments/invalid-id", "Comment id is required.");
      }

      const normalizedMessage = normalizeProfileCommentMessage(message);

      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "comments/login-required",
          "Sign in to manage comments on this profile."
        );
      }

      await ensureVerifiedSessionAccess(
        user,
        "Verify your email before editing comments."
      );

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

      return toStoredProfileComment(comment.id, {
        ...comment,
        message: normalizedMessage,
        mediaURL: finalMediaURL,
        mediaType: finalMediaType,
        mediaPath: finalMediaPath,
        mediaSize: finalMediaSize,
        updatedAt,
      });
    };

    const updateAvatar = async (file) => {
      const user = auth.currentUser;

      if (!user) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your avatar.");
      }

      await ensureVerifiedSessionAccess(user, "Verify your email before updating the avatar.");

      const avatarUpload = await prepareAvatarUpload(file, user.uid);

      if (!avatarUpload?.photoURL) {
        throw createFirebaseError("storage/invalid-file", "Choose an image before uploading.");
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

      return publishUserSnapshot(
        toUserSnapshot(user, {
          ...currentDetails,
          photoURL,
          avatarPath: avatarUpload.avatarPath ?? null,
          avatarType: avatarUpload.avatarType ?? null,
          avatarSize: avatarUpload.avatarSize ?? null,
        })
      );
    };

    const deleteAvatar = async () => {
      const user = auth.currentUser;

      if (!user) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to update your avatar.");
      }

      await ensureVerifiedSessionAccess(user, "Verify your email before updating the avatar.");

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

      return publishUserSnapshot(
        toUserSnapshot(user, {
          ...currentDetails,
          photoURL: null,
          avatarPath: null,
          avatarType: null,
          avatarSize: null,
        })
      );
    };
    const adminUpdateProfileDisplayName = async (profileId, nextDisplayName) => {
      const { user, actorSnapshot } = await ensureRootActorSnapshot();

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
      const { actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const normalizedRequestedLogin = String(nextLogin ?? "").trim().replace(/\\s+/g, "");

      if (!normalizedRequestedLogin) {
        throw createFirebaseError("auth/invalid-login", "Enter a login.");
      }

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
      const { actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

      const avatarUpload = await prepareAvatarUpload(file, targetDoc.id);

      if (!avatarUpload?.photoURL) {
        throw createFirebaseError("storage/invalid-file", "Choose an image before uploading.");
      }

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
      const { actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

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
      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

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
    const adminSetProfileEmailVerification = async (profileId, nextIsVerified) => {
      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      ensureActorCanManageTargetProfile(actorSnapshot?.roles ?? [], targetDoc.data()?.roles ?? []);

      const isVerified = Boolean(nextIsVerified);

      if (targetDoc.id === user.uid && !isVerified) {
        throw createFirebaseError(
          "verification/self-forbidden",
          "You cannot revoke email verification on your own root account."
        );
      }

      try {
        await setDoc(
          userRefFor(targetDoc.id),
          {
            emailVerified: isVerified,
            verificationRequired: !isVerified,
            verificationEmailSent: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          throw error;
        }

        throw createFirebaseError(
          "verification/persist-failed",
          "Email verification status could not be saved. Check Firestore rules for privileged users."
        );
      }

      return refreshStoredUserSnapshot(targetDoc.id, {
        ...targetDoc.data(),
        emailVerified: isVerified,
        verificationRequired: !isVerified,
        verificationEmailSent: false,
      });
    };

    const updateProfileRoles = async (profileId, nextRoles) => {
      const { user, actorSnapshot } = await ensureRootActorSnapshot();

      if (!user || user.isAnonymous) {
        throw createFirebaseError("auth/no-current-user", "Sign in again to manage roles.");
      }

      if (!Number.isInteger(profileId) || profileId <= 0) {
        throw createFirebaseError("profile/invalid-id", "Profile id must be a positive number.");
      }

      const targetDoc = await findUserByProfileId(profileId);

      if (!targetDoc) {
        return null;
      }

      const roles = normalizeRoles(nextRoles);
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
    const refreshVerificationStatus = async () => {
      const user = auth.currentUser;

      if (!user || user.isAnonymous) {
        throw createFirebaseError(
          "auth/no-current-user",
          "Sign in again to refresh email verification."
        );
      }

      await reload(user);

      if (user.emailVerified) {
        try {
          await setDoc(
            userRefFor(user.uid),
            {
              emailVerified: true,
              verificationRequired: false,
              verificationEmailSent: false,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (error) {}
      }

      const snapshot = await resolveUserSnapshot(user);
      const allowedSnapshot = await enforceActiveSessionNotBanned(snapshot);

      return {
        ...allowedSnapshot,
        verificationEmailSent: false,
      };
    };
    const compareOnlineUsers = (left, right) => {
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
        const onlineUsers = [];
        const countedUserIds = new Set();

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
        const currentSnapshot = window.sakuraCurrentUserSnapshot;
        const localCurrentUid =
          currentUser && !currentUser.isAnonymous
            ? currentUser.uid
            : currentSnapshot?.uid ?? null;
        const localSessionLooksOnline =
          Boolean(localCurrentUid) &&
          Boolean(navigator.onLine) &&
          (typeof document === "undefined" || document.visibilityState !== "hidden");
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
            presence: normalizePresence(
              currentSnapshot?.presence,
              window.location.pathname
            ),
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
    const getSiteOnlineCount = async () => {
      const onlineUsers = await getFreshOnlineUsers();
      return onlineUsers.length;
    };
    const getSiteOnlineUsers = async () => {
      const onlineUsers = await getFreshOnlineUsers();

      return onlineUsers.map((snapshot) => ({
        uid: snapshot?.uid ?? null,
        profileId: typeof snapshot?.profileId === "number" ? snapshot.profileId : null,
        displayName:
          typeof snapshot?.displayName === "string" ? snapshot.displayName : null,
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
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const preferredLogin =
          sanitizeLogin(login) ||
          (typeof login === "string" ? login.trim() : "") ||
          ("user" + credentials.user.uid.slice(0, 6));
        const preferredDisplayName = sanitizeDisplayName(displayName);
        let verificationEmailSent = false;

        try {
          let snapshot = await resolveUserSnapshot(credentials.user, {
            requestedLogin: login,
            preferredDisplayName: preferredDisplayName || preferredLogin,
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

          if ((!storedRegistrationLogin || !storedRegistrationLoginLower) && preferredLogin) {
            const recoveredLoginDetails = await resolveAvailableLogin(
              snapshot?.login || preferredLogin,
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
      adminSetProfileEmailVerification,
      getProfileById,
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
