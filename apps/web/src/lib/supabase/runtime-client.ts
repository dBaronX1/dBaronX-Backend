"use client";

import { createClient } from "@supabase/supabase-js";

import {
  CUSTOMER_AUTH_UNAVAILABLE_MESSAGE,
  getBrowserPublicConfig,
  hasSupabasePublicConfig,
} from "@/lib/public-config";

let browserClient: ReturnType<typeof createClient> | null = null;
let browserClientKey = "";

export async function getSupabaseRuntimeBrowserClient() {
  const config = await getBrowserPublicConfig();
  if (!hasSupabasePublicConfig(config)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase auth public config is missing for the browser runtime.");
    }
    throw new Error(CUSTOMER_AUTH_UNAVAILABLE_MESSAGE);
  }

  const nextKey = `${config.supabaseUrl}|${config.supabaseAnonKey}`;
  if (!browserClient || browserClientKey !== nextKey) {
    browserClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    browserClientKey = nextKey;
  }
  return browserClient;
}
