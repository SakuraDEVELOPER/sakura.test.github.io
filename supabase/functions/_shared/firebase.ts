import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export type VerifiedFirebaseUser = {
  uid: string;
  email: string | null;
};

export async function verifyFirebaseIdToken(idToken: string, projectId: string) {
  if (!idToken) {
    throw new Error("Missing Firebase ID token.");
  }

  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID secret.");
  }

  const { payload } = await jwtVerify(idToken, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Firebase token does not contain a valid uid.");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  } satisfies VerifiedFirebaseUser;
}
