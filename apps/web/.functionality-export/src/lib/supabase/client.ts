"use client";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, resolveAuthRedirect } from "@/lib/env";
import { CUSTOMER_AUTH_UNAVAILABLE_MESSAGE } from "@/lib/public-config";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const env = getPublicEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase auth public config is missing for the build-time browser client.");
    }
    throw new Error(CUSTOMER_AUTH_UNAVAILABLE_MESSAGE);
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
