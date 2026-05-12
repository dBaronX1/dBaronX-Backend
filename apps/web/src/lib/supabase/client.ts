"use client";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, resolveAuthRedirect } from "@/lib/env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const env = getPublicEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export const authRedirectTo = resolveAuthRedirect;
