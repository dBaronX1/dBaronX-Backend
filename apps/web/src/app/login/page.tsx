"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DbxAuthShell } from "@/components/auth/DbxAuthShell";
import { appendReferralParams, captureReferralParams } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { CUSTOMER_ACCESS_UNAVAILABLE_MESSAGE, getBrowserCustomerConfig, getCustomerAuthClient, hasCustomerAccessConfig } from "@/lib/auth/customer-auth-client";
import { customerAuthRedirectTo } from "@/lib/auth/customer-auth-routes";

function humanLoginError(message: string) {
  if (/invalid|credentials/i.test(message)) return "Email or password is incorrect.";
  if (/network|fetch/i.test(message)) return "Login is temporarily unavailable. Please try again shortly or contact support.";
  return message && !/NEXT_PUBLIC|CUSTOMER_AUTH_|DATABASE_URL|SECRET|TOKEN/i.test(message)
    ? message
    : "Login failed. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = safeLocalPath(params.get("next"), "/account");
  const referral = useMemo(() => captureReferralParams(params), [params]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getBrowserCustomerConfig()
      .then((config) => {
        if (mounted) setConfigReady(hasCustomerAccessConfig(config));
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
      setMessage("Login is temporarily unavailable. Please try again shortly or contact support.");
      return;
    }
    setMessage("Signing in…");
    try {
      const authClient = await getCustomerAuthClient();
      const { error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(humanLoginError(error.message));
        return;
      }
      router.push(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? humanLoginError(error.message) : "Login failed. Please try again.");
    }
  }

  async function magicLink() {
    if (!configReady) {
      setMessage(CUSTOMER_ACCESS_UNAVAILABLE_MESSAGE);
      return;
    }
    setMessage("Sending magic link…");
    try {
      const authClient = await getCustomerAuthClient();
      const callbackPath = appendReferralParams(`/auth/callback?next=${encodeURIComponent(nextPath)}`, referral);
      const { error } = await authClient.auth.signInWithOtp({ email, options: { emailRedirectTo: customerAuthRedirectTo(callbackPath) } });
      setMessage(error ? humanLoginError(error.message) : "Check your email for the magic login link.");
    } catch (error) {
      setMessage(error instanceof Error ? humanLoginError(error.message) : "Login failed. Please try again.");
    }
  }

  return (
    <DbxAuthShell
      mode="login"
      email={email}
      password={password}
      message={message}
      configReady={configReady}
      referral={referral}
      nextPath={nextPath}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
      onMagicLink={magicLink}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading login…</main>}>
      <LoginForm />
    </Suspense>
  );
}
