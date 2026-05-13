"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            setError(sessionError?.message || null);
          })
          .catch((err) => mounted && setError(err instanceof Error ? err.message : "Unable to load auth session."))
          .finally(() => mounted && setLoading(false));

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
          setLoading(false);
        });
        unsubscribe = () => subscription.subscription.unsubscribe();
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load auth session.");
        setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return { session, loading, error, signedIn: Boolean(session?.user) };
}
