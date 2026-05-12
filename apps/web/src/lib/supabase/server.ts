import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { CUSTOMER_AUTH_UNAVAILABLE_MESSAGE } from "@/lib/public-config";

export function getSupabaseServerAnonClient() {
  const env = getPublicEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(CUSTOMER_AUTH_UNAVAILABLE_MESSAGE);
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
