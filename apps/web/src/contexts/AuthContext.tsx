"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { clearAuthSession, meWithApi, readAuthSession, safeAuthMessage, type AuthUser } from "@/lib/auth/nest-auth-client";

type SafeSession = {
  accessToken?: string;
  user: {
    id: string;
    email: string | null;
    user_metadata: Record<string, unknown>;
  };
};

type AuthContextValue = {
  session: SafeSession | null;
  loading: boolean;
  error: string | null;
  signedIn: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromUser(user: AuthUser): SafeSession {
  return {
    accessToken: readAuthSession()?.accessToken,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.fullName || "",
        display_name: user.fullName || "",
        referral_code: user.referralCode || "",
      },
    },
  };
}

function safeSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return safeAuthMessage(message, "Unable to load auth session. Please sign in again or contact support.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SafeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshSession() {
    setLoading(true);
    try {
      const payload = await meWithApi();
      if (payload?.user) {
        setSession(sessionFromUser(payload.user));
        setError(null);
      } else {
        setSession(null);
        setError(null);
      }
    } catch (err) {
      clearAuthSession();
      setError(safeSessionError(err));
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo(
    () => ({ session, loading, error, signedIn: Boolean(session?.user), refreshSession }),
    [session, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }
  return value;
}
