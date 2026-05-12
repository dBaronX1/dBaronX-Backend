"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { RocketAuthShell } from "@/components/auth/RocketAuthShell";
import { appendReferralParams, captureReferralParams, referralMetadata } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { CUSTOMER_AUTH_UNAVAILABLE_MESSAGE, getBrowserPublicConfig, hasSupabasePublicConfig } from "@/lib/public-config";
import { authRedirectTo } from "@/lib/supabase/client";
import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";

function humanSignupError(message: string) {
  if (/password/i.test(message)) return "Password must meet the security requirements. Try at least 8 characters.";
  if (/already|registered|exists/i.test(message)) return "An account may already exist for this email. Try logging in.";
  if (/network|fetch/i.test(message)) return "Signup is temporarily unavailable. Please try again shortly or contact support.";
  return message && !/NEXT_PUBLIC|SUPABASE_|DATABASE_URL|SECRET|TOKEN/i.test(message)
    ? message
    : "Signup failed. Please try again.";
}

function RegisterForm() {
  const params = useSearchParams();
  const referral = useMemo(() => captureReferralParams(params), [params]);
  const nextPath = safeLocalPath(params.get("next"), "/onboarding");
  const metadata = useMemo(() => referralMetadata(referral), [referral]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getBrowserPublicConfig()
      .then((config) => {
        if (mounted) setConfigReady(hasSupabasePublicConfig(config));
      })
      .catch(() => {
        if (mounted) setConfigReady(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configReady) {
      setMessage(CUSTOMER_AUTH_UNAVAILABLE_MESSAGE);
      return;
    }
    setMessage("Creating your account…");
    try {
      const supabase = await getSupabaseRuntimeBrowserClient();
      const callbackPath = appendReferralParams(`/auth/callback?next=${encodeURIComponent(nextPath)}`, referral);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirectTo(callbackPath), data: metadata },
      });
      setMessage(error ? humanSignupError(error.message) : "Check your email to confirm your account, then continue to onboarding.");
    } catch (error) {
      setMessage(error instanceof Error ? humanSignupError(error.message) : "Signup failed. Please try again.");
    }
  }

  return (
    <RocketAuthShell
      mode="register"
      email={email}
      password={password}
      message={message}
      configReady={configReady}
      referral={referral}
      nextPath={nextPath}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading register…</main>}>
      <RegisterForm />
    </Suspense>
  );
}
