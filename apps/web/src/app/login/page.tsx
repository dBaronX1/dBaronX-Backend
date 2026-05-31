"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DbxAuthShell } from "@/components/auth/DbxAuthShell";
import { captureReferralParams } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { loginWithApi, safeAuthMessage } from "@/lib/auth/nest-auth-client";

function humanLoginError(message: string) {
  return safeAuthMessage(message, "We could not sign you in. Please check your email and password.");
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = safeLocalPath(params.get("next"), "/account");
  const referral = useMemo(() => captureReferralParams(params), [params]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [configReady] = useState(true);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Signing in…");
    try {
      await loginWithApi({ email, password });
      router.push(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? humanLoginError(error.message) : "We could not sign you in. Please check your email and password.");
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
