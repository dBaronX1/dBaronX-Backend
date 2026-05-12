import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { REFERRAL_QUERY_KEYS } from "@/lib/auth/referral-capture";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";


  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  const redirectUrl = new URL(next, url.origin);
  for (const key of REFERRAL_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (value) redirectUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(redirectUrl);
}
