import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSession, signIn, signOutRequest, signUp, type AuthUser } from "../lib/api";
import { setMockMode } from "../lib/mockStore";

export type { AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isMock: boolean;
  isAuthed: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  /** Patches the locally-held user (e.g. after a profile name change) without
   *  a full session refetch — this app never exposes a Supabase client to
   *  the browser, so there's no client-side session to sync from. */
  updateLocalUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  // Bootstrap the session from the server's httpOnly cookie.
  useEffect(() => {
    let active = true;
    getSession()
      .then(({ user: u, mock }) => {
        if (!active) return;
        setUser(u);
        setIsMock(mock);
        setMockMode(mock);
      })
      .catch(() => {
        // Treat as signed out.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const result = await signIn(email, password);
    if (result.error || !result.user) return { error: result.error ?? "Sign in failed" };
    setUser(result.user);
    return {};
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const result = await signUp(email, password);
    if (result.error) return { error: result.error };
    if (!result.user) return { error: "Sign up failed" };
    setUser(result.user);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest().catch(() => {
      // Clear local state regardless of network outcome.
    });
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isMock,
    isAuthed: Boolean(user),
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateLocalUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
