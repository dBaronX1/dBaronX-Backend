"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  signedIn: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function safeAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load auth session.";
  const lower = message.toLowerCase();
  const looksInternal = ["next_public", "customer_auth_", "secret", "private", "credential"].some((marker) => lower.includes(marker));
  return looksInternal ? "Unable to load auth session. Please sign in again or contact support." : message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshSession() {
    setLoading(true);
    try {
      const supabase = await getSupabaseRuntimeBrowserClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      setSession(data.session || null);
      setError(sessionError ? safeAuthError(sessionError) : null);
    } catch (err) {
      setError(safeAuthError(err));
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    getSupabaseRuntimeBrowserClient()
      .then((supabase) => {
        if (!mounted) return;
        supabase.auth
          .getSession()
          .then(({ data, error: sessionError }) => {
            if (!mounted) return;
            setSession(data.session || null);
            setError(sessionError ? safeAuthError(sessionError) : null);
          })
          .catch((err) => {
            if (!mounted) return;
            setError(safeAuthError(err));
            setSession(null);
          })
          .finally(() => mounted && setLoading(false));

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
          setError(null);
          setLoading(false);
        });
        unsubscribe = () => subscription.subscription.unsubscribe();
      })
      .catch((err) => {
        if (!mounted) return;
        setError(safeAuthError(err));
        setSession(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
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
