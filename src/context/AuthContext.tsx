"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  emailVerified: boolean;
  resendVerification: () => Promise<void>;
  refreshVerification: () => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [verifyTick, setVerifyTick] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebase().auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(getFirebase().auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    sendEmailVerification(cred.user).catch(() => {}); // best effort; needed before sharing vaults
  }, []);
  const resendVerification = useCallback(async () => {
    const u = getFirebase().auth.currentUser;
    if (u) await sendEmailVerification(u);
  }, []);
  /** Re-reads the account so a just-clicked verification link takes effect (and refreshes the ID token claims). */
  const refreshVerification = useCallback(async () => {
    const u = getFirebase().auth.currentUser;
    if (!u) return false;
    await u.reload();
    await u.getIdToken(true);
    setVerifyTick((t) => t + 1);
    return u.emailVerified;
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebase().auth, email, password);
  }, []);
  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
  }, []);
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebase().auth, email);
  }, []);
  const logout = useCallback(async () => {
    await signOut(getFirebase().auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      emailVerified: !!user?.emailVerified && verifyTick >= 0,
      resendVerification,
      refreshVerification,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      logout,
    }),
    [user, loading, verifyTick, signUp, signIn, signInWithGoogle, resetPassword, logout, resendVerification, refreshVerification],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Turn Firebase error codes into human messages. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Account password must be at least 6 characters.",
    "auth/invalid-email": "That email address looks invalid.",
    "auth/too-many-requests": "Too many attempts. Try again in a few minutes.",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
    "auth/network-request-failed": "Network error, check your connection.",
  };
  return map[code] ?? (err instanceof Error ? err.message : "Something went wrong.");
}
