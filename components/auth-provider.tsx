"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { toast } from "sonner";
import { auth, googleProvider } from "@/hooks/useFirebaseAuth";
import { syncUser, type SyncedUser } from "@/lib/auth-actions";

type AuthContextValue = {
  user: SyncedUser | null;
  loading: boolean;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Popup closes the user triggered themselves are not errors worth a toast.
const QUIET_ERRORS = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SyncedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const explicitSignIn = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        if (cancelled) return;
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const token = await fbUser.getIdToken();
        const res = await syncUser(token);
        if (cancelled) return;

        if (res.ok) {
          setUser(res.user);
          if (explicitSignIn.current) toast.success(`Welcome, ${res.user.name.split(" ")[0]}`, { id: "auth" });
        } else {
          // Keep Firebase and the database in step: no DB row means no session.
          await firebaseSignOut(auth);
          setUser(null);
          toast.error(res.message, { id: "auth" });
        }
      } catch {
        if (cancelled) return;
        await firebaseSignOut(auth).catch(() => {});
        setUser(null);
        toast.error("We could not finish signing you in. Please try again.", { id: "auth" });
      } finally {
        explicitSignIn.current = false;
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    explicitSignIn.current = true;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      explicitSignIn.current = false;
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked") {
        toast.error("Your browser blocked the sign-in window. Allow popups and try again.", { id: "auth" });
      } else if (!QUIET_ERRORS.has(code)) {
        toast.error("Google sign-in failed. Please try again.", { id: "auth" });
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      toast("Signed out", { id: "auth" });
    } catch {
      toast.error("Could not sign out. Please try again.", { id: "auth" });
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signingIn, signIn, signOut }),
    [user, loading, signingIn, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}