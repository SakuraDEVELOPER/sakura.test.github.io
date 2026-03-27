import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const firebaseModuleScript = `
  import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut
  } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAnZQt5NWXGOWuz3STh_vy-dSENVBM9_ZY",
    authDomain: "sakura-bfa74.firebaseapp.com",
    projectId: "sakura-bfa74",
    storageBucket: "sakura-bfa74.firebasestorage.app",
    messagingSenderId: "145336250722",
    appId: "1:145336250722:web:d31610ae8258c398e47c3b",
    measurementId: "G-1V07L6BRL0"
  };

  const toUserSnapshot = (user) =>
    user
      ? {
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
          providerIds: user.providerData
            .map((provider) => provider?.providerId)
            .filter(Boolean),
          creationTime: user.metadata.creationTime ?? null,
          lastSignInTime: user.metadata.lastSignInTime ?? null
        }
      : null;

  window.firebaseConfig = firebaseConfig;

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    const loginWithGoogle = async () => {
      const result = await signInWithPopup(auth, provider);
      return toUserSnapshot(result.user);
    };

    window.sakuraFirebaseAuth = {
      register: async (email, password) => {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        return toUserSnapshot(credentials.user);
      },
      login: async (email, password) => {
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        return toUserSnapshot(credentials.user);
      },
      loginWithGoogle,
      logout: async () => {
        await signOut(auth);
      },
      onAuthStateChanged: (callback) =>
        onAuthStateChanged(auth, (user) => callback(toUserSnapshot(user)))
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
