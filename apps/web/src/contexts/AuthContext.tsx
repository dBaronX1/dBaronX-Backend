"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { AUTH_SESSION_CHANGED_EVENT, clearAuthSession, meWithApi, readAuthSession, readStoredAuthUser, safeAuthMessage, type AuthUser } from "@/lib/auth/nest-auth-client";

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
const AuthContextProvider = AuthContext.Provider as any;

function sessionFromUser(user: AuthUser, accessToken = readAuthSession()?.accessToken): SafeSession {
  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.fullName || "",
        display_name: user.displayName || user.fullName || "",
        avatar_url: user.avatarUrl || "",
        gender: user.gender || "Prefer not to say",
        pronouns: user.pronouns || "Prefer not to say",
        country: user.country || "",
        phone_code: user.phoneCode || "",
        language: user.language || "",
        referral_code: user.referralCode || "",
      },
    },
  };
}

function safeSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return safeAuthMessage(message, "Unable to load auth session. Please sign in again or contact support.");
}

export function AuthProvider({ children }: { children: any }) {
  const [session, setSession] = useState<SafeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function hydrateCachedSession() {
    const cachedSession = readAuthSession();
    const cachedUser = readStoredAuthUser();
    if (cachedSession?.accessToken && cachedUser?.id) {
      setSession(sessionFromUser(cachedUser, cachedSession.accessToken));
      setError(null);
      return true;
    }
    setSession(null);
    return false;
  }

  async function refreshSession() {
    const hasCachedSession = hydrateCachedSession();
    setLoading(!hasCachedSession);
    try {
      const payload = await meWithApi();
      if (payload?.user) {
        setSession(sessionFromUser(payload.user));
        setError(null);
      } else if (!hasCachedSession) {
        setSession(null);
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "");
      const cachedSession = readAuthSession();
      const cachedUser = readStoredAuthUser();
      if (cachedSession?.accessToken && cachedUser?.id && message !== "SESSION_EXPIRED") {
        setSession(sessionFromUser(cachedUser, cachedSession.accessToken));
        setError(safeSessionError(err));
      } else {
        clearAuthSession(false);
        setError(safeSessionError(err));
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSession();
    const syncAuthSession = () => void refreshSession();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthSession);
    window.addEventListener("storage", syncAuthSession);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthSession);
      window.removeEventListener("storage", syncAuthSession);
    };
  }, []);

  const value = useMemo(
    () => ({ session, loading, error, signedIn: Boolean(session?.user), refreshSession }),
    [session, loading, error],
  );

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }
  return value;
}
