"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DbxAuthShell } from "@/components/auth/DbxAuthShell";
import { captureReferralParams } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { loginWithApi, safeAuthMessage } from "@/lib/auth/nest-auth-client";

function humanLoginError(message: string) {
  return safeAuthMessage(message, "We could not sign you in. Please check your email and password.");
}

function LoginForm() {
  const router = useRouter();
  const [params, setParams] = useState(() => new URLSearchParams());
  const nextPath = safeLocalPath(params.get("next"), "/profile");
  const referral = useMemo(() => captureReferralParams(params), [params]);

  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [configReady] = useState(true);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage("Please enter your email and password to sign in.");
      return;
    }
    setSubmitting(true);
    setMessage("Signing in…");
    try {
      await loginWithApi({ email: normalizedEmail, password });
      setMessage(nextPath === "/profile" ? "Signed in. Opening your profile…" : "Signed in. Opening your account…");
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? humanLoginError(error.message) : "We could not sign you in. Please check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DbxAuthShell
      mode="login"
      email={email}
      password={password}
      message={message}
      configReady={configReady}
      submitting={submitting}
      referral={referral}
      nextPath={nextPath}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
    />
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
