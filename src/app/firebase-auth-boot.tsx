"use client";

import { useEffect } from "react";

type FirebaseBootWindow = Window & {
  sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraFirebaseRuntimeInjected?: boolean;
  sakuraFirebaseRuntimePromise?: Promise<void> | null;
  sakuraLoadFirebasePresenceRuntime?: () => Promise<unknown>;
};

const getWindowState = () => window as FirebaseBootWindow;
const CHUNK_RELOAD_STORAGE_KEY = "sakura-chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 20_000;
const FIREBASE_AUTH_STORAGE_KEY_PREFIX = "firebase:authUser:";
const AUTH_IDLE_PRELOAD_TIMEOUT_MS = 700;
const AUTH_FALLBACK_PRELOAD_TIMEOUT_MS = 450;

const isChunkLoadFailure = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message || "";

  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /_next\/static\/chunks/i.test(message)
  );
};

const reloadOnChunkFailure = () => {
  try {
    const lastReloadAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || "0");

    if (Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
      return;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    window.location.reload();
  }
};

const hasPersistedFirebaseSession = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storageKey = window.localStorage.key(index);

      if (storageKey?.startsWith(FIREBASE_AUTH_STORAGE_KEY_PREFIX)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
};

const shouldBootImmediately = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    /(?:^|\/)profile(?:\/|$)/.test(window.location.pathname) ||
    hasPersistedFirebaseSession()
  );
};

export default function FirebaseAuthBoot() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const runtime = getWindowState();
    let idleTimerId = 0;
    let idleCallbackId: number | null = null;
    const interactionEvents = ["pointerdown", "keydown", "touchstart"] as const;
    const cleanupDeferredLoad = () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleInteractionStart);
      });

      if (
        idleCallbackId !== null &&
        "cancelIdleCallback" in window &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }

      if (idleTimerId) {
        window.clearTimeout(idleTimerId);
      }

      idleCallbackId = null;
      idleTimerId = 0;
    };

    const loadRuntime = async () => {
      if (!runtime.sakuraLoadFirebasePresenceRuntime) {
        runtime.sakuraLoadFirebasePresenceRuntime = () => import("./firebase-auth-presence-runtime");
      }

      if (!runtime.sakuraFirebaseRuntimeInjected && !runtime.sakuraFirebaseRuntimePromise) {
        runtime.sakuraFirebaseRuntimePromise = import("./firebase-auth-script")
          .then(async ({ default: firebaseModuleScript }) => {
            if (!runtime.sakuraFirebaseRuntimeInjected) {
              const script = document.createElement("script");

              script.type = "module";
              script.textContent = firebaseModuleScript;
              document.body.appendChild(script);
              runtime.sakuraFirebaseRuntimeInjected = true;
            }
          })
          .finally(() => {
            runtime.sakuraFirebaseRuntimePromise = null;
          });
      }

      if (runtime.sakuraFirebaseRuntimePromise) {
        await runtime.sakuraFirebaseRuntimePromise;
      }
    };

    const bootNow = () => {
      cleanupDeferredLoad();
      return loadRuntime();
    };
    const handleInteractionStart = () => {
      void bootNow();
    };

    runtime.sakuraStartFirebaseAuth = bootNow;

    if (shouldBootImmediately()) {
      void bootNow();
      return;
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleInteractionStart, { once: true, passive: true });
    });

    if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(() => {
        void loadRuntime();
      }, { timeout: AUTH_IDLE_PRELOAD_TIMEOUT_MS });
    } else {
      idleTimerId = window.setTimeout(() => {
        void loadRuntime();
      }, AUTH_FALLBACK_PRELOAD_TIMEOUT_MS);
    }

    const handleWindowError = (event: ErrorEvent) => {
      let chunkTarget = "";

      if (event.target instanceof HTMLScriptElement) {
        chunkTarget = event.target.src || "";
      } else if (event.target instanceof HTMLLinkElement) {
        chunkTarget = event.target.href || "";
      }

      if (/_next\/static\/chunks\//i.test(chunkTarget) || isChunkLoadFailure(event.error)) {
        reloadOnChunkFailure();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadFailure(event.reason)) {
        reloadOnChunkFailure();
      }
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      cleanupDeferredLoad();
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
