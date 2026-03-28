"use client";

import { useEffect } from "react";

type FirebaseBootWindow = Window & {
  sakuraStartFirebaseAuth?: () => Promise<unknown> | unknown;
  sakuraFirebaseRuntimeInjected?: boolean;
  sakuraFirebaseRuntimePromise?: Promise<void> | null;
};

const getWindowState = () => window as FirebaseBootWindow;

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

    if (/(?:^|\/)profile(?:\/|$)/.test(window.location.pathname)) {
      void bootNow();
      return;
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleInteractionStart, { once: true, passive: true });
    });

    if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(() => {
        void loadRuntime();
      }, { timeout: 1500 });
    } else {
      idleTimerId = window.setTimeout(() => {
        void loadRuntime();
      }, 1200);
    }

    return () => {
      cleanupDeferredLoad();
    };
  }, []);

  return null;
}
