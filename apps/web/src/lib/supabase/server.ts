import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

export function getSupabaseServerAnonClient() {
  const env = getPublicEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
