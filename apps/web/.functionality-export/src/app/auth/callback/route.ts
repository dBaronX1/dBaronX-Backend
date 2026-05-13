import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { REFERRAL_QUERY_KEYS } from "@/lib/auth/referral-capture";
import { getRuntimePublicConfigFromEnv, hasSupabasePublicConfig } from "@/lib/public-config";

export const dynamic = "force-dynamic";

function safeLocalPath(value: string | null | undefined, fallback: string) {
  const candidate = (value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const parsed = new URL(candidate, "https://dbaronx.local");
    if (parsed.origin !== "https://dbaronx.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeLocalPath(url.searchParams.get("next"), "/onboarding");

  if (code) {
    const config = getRuntimePublicConfigFromEnv();
    if (hasSupabasePublicConfig(config)) {
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
