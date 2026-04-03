"use client";

import { useEffect } from "react";

type FirebaseBootWindow = Window & {
  sakuraAuthStateSettled?: boolean;
  sakuraFirebaseAuth?: unknown;
  sakuraFirebaseAuthError?: string;
  sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraFirebaseRuntimeInjected?: boolean;
  sakuraFirebaseRuntimePromise?: Promise<void> | null;
  sakuraFirebaseRuntimeVersion?: string;
  sakuraLoadFirebasePresenceRuntime?: () => Promise<unknown>;
};

const getWindowState = () => window as FirebaseBootWindow;
const FIREBASE_AUTH_RUNTIME_VERSION = "2026-04-03-runtime-v1";
const AUTH_ERROR_EVENT = "sakura-auth-error";
const AUTH_RUNTIME_INSTALLED_EVENT = "sakura-auth-runtime-installed";
const AUTH_STATE_SETTLED_EVENT = "sakura-auth-state-settled";
const AUTH_RUNTIME_INSTALL_TIMEOUT_MS = 4_000;
const CHUNK_RELOAD_STORAGE_KEY = "sakura-chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 20_000;
const FIREBASE_AUTH_STORAGE_KEY_PREFIX = "firebase:authUser:";
const AUTH_IDLE_PRELOAD_TIMEOUT_MS = 700;
const AUTH_FALLBACK_PRELOAD_TIMEOUT_MS = 450;

const getBootErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : "Firebase Auth runtime did not start. Проверьте соединение и настройки Firebase.";

const reportBootFailure = (runtime: FirebaseBootWindow, error: unknown) => {
  const message = getBootErrorMessage(error);

  runtime.sakuraFirebaseAuthError = message;
  runtime.sakuraAuthStateSettled = true;
  window.dispatchEvent(new CustomEvent(AUTH_STATE_SETTLED_EVENT));
  window.dispatchEvent(
    new CustomEvent(AUTH_ERROR_EVENT, {
      detail: { message },
    })
  );
};

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

const hasCurrentRuntime = (runtime: FirebaseBootWindow) =>
  Boolean(runtime.sakuraFirebaseAuth) &&
  runtime.sakuraFirebaseRuntimeVersion === FIREBASE_AUTH_RUNTIME_VERSION;

const resetStaleRuntime = (runtime: FirebaseBootWindow) => {
  if (runtime.sakuraFirebaseRuntimeVersion === FIREBASE_AUTH_RUNTIME_VERSION) {
    return;
  }

  delete runtime.sakuraFirebaseAuth;
  delete runtime.sakuraFirebaseAuthError;
  delete runtime.sakuraFirebaseRuntimeVersion;
  runtime.sakuraFirebaseRuntimeInjected = false;
  runtime.sakuraAuthStateSettled = false;
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
      resetStaleRuntime(runtime);

      if (hasCurrentRuntime(runtime)) {
        return;
      }

      if (!runtime.sakuraLoadFirebasePresenceRuntime) {
        runtime.sakuraLoadFirebasePresenceRuntime = () => import("./firebase-auth-presence-runtime");
      }

      if (!runtime.sakuraFirebaseRuntimeInjected && !runtime.sakuraFirebaseRuntimePromise) {
        let injectedScript: HTMLScriptElement | null = null;

        runtime.sakuraFirebaseRuntimePromise = import("./firebase-auth-script")
          .then(({ default: firebaseModuleScript }) => {
            delete runtime.sakuraFirebaseAuthError;
            runtime.sakuraAuthStateSettled = false;

            return new Promise<void>((resolve, reject) => {
              const cleanup = () => {
                window.clearTimeout(timeoutId);
                window.removeEventListener(AUTH_RUNTIME_INSTALLED_EVENT, handleInstalled);
              };
              const handleInstalled = () => {
                if (runtime.sakuraFirebaseRuntimeVersion !== FIREBASE_AUTH_RUNTIME_VERSION) {
                  return;
                }

                cleanup();
                runtime.sakuraFirebaseRuntimeInjected = true;
                resolve();
              };
              const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(
                  new Error(
                    "Firebase Auth runtime did not start. Проверьте соединение и настройки Firebase."
                  )
                );
              }, AUTH_RUNTIME_INSTALL_TIMEOUT_MS);

              window.addEventListener(AUTH_RUNTIME_INSTALLED_EVENT, handleInstalled, { once: true });
              injectedScript = document.createElement("script");
              injectedScript.type = "module";
              injectedScript.textContent = firebaseModuleScript;
              document.body.appendChild(injectedScript);
            });
          })
          .catch((error) => {
            runtime.sakuraFirebaseRuntimeInjected = false;

            if (injectedScript?.isConnected) {
              injectedScript.remove();
            }

            reportBootFailure(runtime, error);
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
