"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type SupabaseAuthUserSnapshot = {
  id: string;
  email: string | null;
  providerIds: string[];
  createdAt: string | null;
  lastSignInAt: string | null;
  hasSession: boolean;
};

export type SupabaseAuthResolvedUserSnapshot = SupabaseAuthUserSnapshot & {
  emailVerified: boolean;
  emailConfirmedAt: string | null;
};

export type SupabasePasswordSignUpResult = {
  session: Session | null;
  user: SupabaseAuthUserSnapshot | null;
  needsEmailVerification: boolean;
};

type SupabaseAuthBridge = {
  loginWithGoogle: () => Promise<null>;
  loginWithPassword: (email: string, password: string) => Promise<Session | null>;
  signUpWithPassword: (options: {
    email: string;
    password: string;
    login?: string | null;
    displayName?: string | null;
  }) => Promise<SupabasePasswordSignUpResult>;
  resendVerificationEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  getSession: () => Promise<Session | null>;
  getCurrentUser: () => Promise<SupabaseAuthResolvedUserSnapshot | null>;
  onAuthStateChanged: (callback: (user: SupabaseAuthUserSnapshot | null) => void) => () => void;
};

type SupabaseRuntimeWindow = Window & {
  sakuraSupabaseAuth?: SupabaseAuthBridge;
  sakuraSupabaseCurrentUserSnapshot?: SupabaseAuthUserSnapshot | null;
  sakuraSupabaseCurrentSession?: Session | null;
  sakuraSupabaseAuthError?: string | null;
  sakuraSupabaseAuthReady?: boolean;
};

const SUPABASE_AUTH_READY_EVENT = "sakura-supabase-auth-ready";
const SUPABASE_AUTH_ERROR_EVENT = "sakura-supabase-auth-error";
const SUPABASE_USER_UPDATE_EVENT = "sakura-supabase-user-update";
const SUPABASE_PROVIDER_TOKEN_STORAGE_KEY = "sakura-supabase-provider-token";
const SUPABASE_PROVIDER_REFRESH_TOKEN_STORAGE_KEY =
  "sakura-supabase-provider-refresh-token";
const SUPABASE_PROVIDER_ID_STORAGE_KEY = "sakura-supabase-provider-id";

const getRuntimeWindow = () => window as SupabaseRuntimeWindow;

const normalizeProviderIds = (user: User | null) => {
  if (!user) {
    return [];
  }

  const identities = Array.isArray(user.identities) ? user.identities : [];
  const providerIds = identities
    .map((identity) =>
      typeof identity?.provider === "string" ? identity.provider.trim() : ""
    )
    .filter(Boolean);

  if (providerIds.length) {
    return [...new Set(providerIds)];
  }

  const primaryProvider =
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider.trim() : "";

  return primaryProvider ? [primaryProvider] : [];
};

const readStoredValue = (key: string) => {
  try {
    const value = window.localStorage.getItem(key);
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
};

const writeStoredValue = (key: string, value: string | null) => {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
      return;
    }

    window.localStorage.removeItem(key);
  } catch {}
};

const resolvePrimaryProviderId = (session: Session | null) => {
  const user = session?.user ?? null;

  if (!user) {
    return null;
  }

  const providerIds = normalizeProviderIds(user);

  if (providerIds.length) {
    return providerIds[0] ?? null;
  }

  const provider =
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider.trim() : "";

  return provider || null;
};

const normalizeSession = (session: Session | null) => {
  const runtime = getRuntimeWindow();

  if (!session) {
    return null;
  }

  return {
    ...session,
    provider_token:
      session.provider_token ??
      runtime.sakuraSupabaseCurrentSession?.provider_token ??
      readStoredValue(SUPABASE_PROVIDER_TOKEN_STORAGE_KEY),
    provider_refresh_token:
      session.provider_refresh_token ??
      runtime.sakuraSupabaseCurrentSession?.provider_refresh_token ??
      readStoredValue(SUPABASE_PROVIDER_REFRESH_TOKEN_STORAGE_KEY),
  };
};

const persistSessionArtifacts = (session: Session | null) => {
  if (!session?.user) {
    writeStoredValue(SUPABASE_PROVIDER_TOKEN_STORAGE_KEY, null);
    writeStoredValue(SUPABASE_PROVIDER_REFRESH_TOKEN_STORAGE_KEY, null);
    writeStoredValue(SUPABASE_PROVIDER_ID_STORAGE_KEY, null);
    return;
  }

  if (typeof session.provider_token === "string" && session.provider_token) {
    writeStoredValue(SUPABASE_PROVIDER_TOKEN_STORAGE_KEY, session.provider_token);
  }

  if (
    typeof session.provider_refresh_token === "string" &&
    session.provider_refresh_token
  ) {
    writeStoredValue(
      SUPABASE_PROVIDER_REFRESH_TOKEN_STORAGE_KEY,
      session.provider_refresh_token
    );
  }

  writeStoredValue(SUPABASE_PROVIDER_ID_STORAGE_KEY, resolvePrimaryProviderId(session));
};

const publishSession = (session: Session | null) => {
  const runtime = getRuntimeWindow();
  const normalizedSession = normalizeSession(session);

  runtime.sakuraSupabaseCurrentSession = normalizedSession;
  persistSessionArtifacts(normalizedSession);

  return normalizedSession;
};

const toSupabaseSnapshot = (session: Session | null): SupabaseAuthUserSnapshot | null => {
  const user = session?.user ?? null;

  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
    providerIds: normalizeProviderIds(user),
    createdAt: typeof user.created_at === "string" ? user.created_at : null,
    lastSignInAt:
      typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    hasSession: Boolean(session?.access_token),
  };
};

const toSupabaseSnapshotFromUser = (
  user: User | null,
  hasSession: boolean,
): SupabaseAuthUserSnapshot | null => {
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
    providerIds: normalizeProviderIds(user),
    createdAt: typeof user.created_at === "string" ? user.created_at : null,
    lastSignInAt:
      typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    hasSession,
  };
};

const toResolvedSupabaseSnapshotFromUser = (
  user: User | null,
  hasSession: boolean,
): SupabaseAuthResolvedUserSnapshot | null => {
  const baseSnapshot = toSupabaseSnapshotFromUser(user, hasSession);

  if (!baseSnapshot) {
    return null;
  }

  return {
    ...baseSnapshot,
    emailVerified: Boolean(user?.email_confirmed_at || user?.confirmed_at),
    emailConfirmedAt:
      typeof user?.email_confirmed_at === "string" && user.email_confirmed_at
        ? user.email_confirmed_at
        : typeof user?.confirmed_at === "string" && user.confirmed_at
          ? user.confirmed_at
          : null,
  };
};

const publishSnapshot = (snapshot: SupabaseAuthUserSnapshot | null) => {
  const runtime = getRuntimeWindow();
  runtime.sakuraSupabaseCurrentUserSnapshot = snapshot;
  runtime.dispatchEvent(
    new CustomEvent(SUPABASE_USER_UPDATE_EVENT, {
      detail: { user: snapshot },
    })
  );
  return snapshot;
};

const buildSupabaseRedirectTo = () => {
  try {
    return window.location.href;
  } catch {
    return undefined;
  }
};

const createSupabaseBridgeError = (code: string, message: string) => {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
};

const normalizeSupabaseAuthError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "Supabase Auth request failed.";
  const normalizedMessage = message.toLowerCase();
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : null;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (code === "email_not_confirmed" || normalizedMessage.includes("email not confirmed")) {
    return createSupabaseBridgeError(
      "auth/email-not-verified",
      "Подтвердите почту, прежде чем входить через Supabase Auth."
    );
  }

  if (code === "email_not_confirmed" || normalizedMessage.includes("email not confirmed")) {
    return createSupabaseBridgeError(
      "auth/email-not-verified",
      "Подтвердите почту, прежде чем входить через Supabase Auth."
    );
  }

  if (
    code === "invalid_credentials" ||
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return createSupabaseBridgeError("auth/invalid-credential", "Invalid email or password.");
  }

  if (code === "email_address_invalid" || normalizedMessage.includes("invalid email")) {
    return createSupabaseBridgeError("auth/invalid-email", "Enter a valid email address.");
  }

  if (status === 429 || normalizedMessage.includes("rate limit")) {
    return createSupabaseBridgeError("auth/too-many-requests", "Too many auth attempts.");
  }

  if (error instanceof Error) {
    return error;
  }

  return createSupabaseBridgeError("auth/internal-error", message);
};

export const startSupabaseAuthRuntime = async () => {
  const runtime = getRuntimeWindow();

  if (runtime.sakuraSupabaseAuthReady && runtime.sakuraSupabaseAuth) {
    return runtime.sakuraSupabaseAuth;
  }

  if (!isSupabaseConfigured || !supabase) {
    runtime.sakuraSupabaseAuthReady = true;
    runtime.sakuraSupabaseAuthError = null;
    runtime.dispatchEvent(new CustomEvent(SUPABASE_AUTH_READY_EVENT));
    return null;
  }

  const client = supabase as SupabaseClient;

  try {
    const bridge: SupabaseAuthBridge = {
      loginWithGoogle: async () => {
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: buildSupabaseRedirectTo(),
          },
        });

        if (error) {
          throw error;
        }

        return null;
      },
      loginWithPassword: async (email, password) => {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }

        return publishSession(data.session ?? null);
      },
      signUpWithPassword: async ({ email, password, login, displayName }) => {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildSupabaseRedirectTo(),
            data: {
              login: typeof login === "string" && login.trim() ? login.trim() : undefined,
              display_name:
                typeof displayName === "string" && displayName.trim()
                  ? displayName.trim()
                  : undefined,
            },
          },
        });

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }

        const session = publishSession(data.session ?? null);
        return {
          session,
          user: toSupabaseSnapshotFromUser(data.user ?? null, Boolean(session?.access_token)),
          needsEmailVerification: Boolean(data.user && !session?.access_token),
        };
      },
      resendVerificationEmail: async (email) => {
        const { error } = await client.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: buildSupabaseRedirectTo(),
          },
        });

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }
      },
      logout: async () => {
        const { error } = await client.auth.signOut();

        if (error) {
          throw error;
        }
      },
      getSession: async () => {
        const { data, error } = await client.auth.getSession();

        if (error) {
          throw error;
        }

        return publishSession(data.session ?? null);
      },
      getCurrentUser: async () => {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const session = publishSession(sessionData.session ?? null);
        const { data, error } = await client.auth.getUser();

        if (error) {
          throw normalizeSupabaseAuthError(error);
        }

        return toResolvedSupabaseSnapshotFromUser(
          data.user ?? session?.user ?? null,
          Boolean(session?.access_token),
        );
      },
      onAuthStateChanged: (callback) => {
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((_event, session) => {
          const nextSession = publishSession(session);
          callback(publishSnapshot(toSupabaseSnapshot(nextSession)));
        });

        callback(runtime.sakuraSupabaseCurrentUserSnapshot ?? null);
        return () => {
          subscription.unsubscribe();
        };
      },
    };

    runtime.sakuraSupabaseAuth = bridge;

    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    const initialSession = publishSession(data.session ?? null);
    publishSnapshot(toSupabaseSnapshot(initialSession));

    client.auth.onAuthStateChange((_event, session) => {
      const nextSession = publishSession(session);
      publishSnapshot(toSupabaseSnapshot(nextSession));
    });

    runtime.sakuraSupabaseAuthReady = true;
    runtime.sakuraSupabaseAuthError = null;
    runtime.dispatchEvent(new CustomEvent(SUPABASE_AUTH_READY_EVENT));
    return bridge;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize Supabase Auth.";

    runtime.sakuraSupabaseAuthError = message;
    runtime.sakuraSupabaseAuthReady = true;
    runtime.dispatchEvent(
      new CustomEvent(SUPABASE_AUTH_ERROR_EVENT, {
        detail: { message },
      })
    );
    return null;
  }
};
