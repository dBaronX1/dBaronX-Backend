import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { REFERRAL_QUERY_KEYS } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { getRuntimeCustomerConfigFromEnv, hasCustomerAccessConfig } from "@/lib/auth/callback-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeLocalPath(url.searchParams.get("next"), "/onboarding");

  if (code) {
    const config = getRuntimeCustomerConfigFromEnv();
    if (hasCustomerAccessConfig(config)) {
      const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      await supabase.auth.exchangeCodeForSession(code);
    } else if (process.env.NODE_ENV === "development") {
      console.warn("Customer access is temporarily unavailable for the auth callback runtime.");
    }
  }

  const redirectUrl = new URL(next, url.origin);
  for (const key of REFERRAL_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (value) redirectUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(redirectUrl);
}
