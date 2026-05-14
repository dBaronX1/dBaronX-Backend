"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DbxAuthShell } from "@/components/auth/DbxAuthShell";
import { appendReferralParams, captureReferralParams, referralMetadata } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { CUSTOMER_ACCESS_UNAVAILABLE_MESSAGE, getBrowserCustomerConfig, getCustomerAuthClient, hasCustomerAccessConfig } from "@/lib/auth/customer-auth-client";

const supportHref = "mailto:support@dbaronx.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_MESSAGE = "Account created. Please check your email to confirm your account.";

type FieldErrors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;

function humanSignupError(message: string) {
  if (/password/i.test(message)) return "Password must meet the security requirements. Try at least 8 characters.";
  if (/already|registered|exists/i.test(message)) return "An account may already exist for this email. Try logging in.";
  if (/rate|limit/i.test(message)) return "Please wait a few minutes before trying again.";
  if (/network|fetch/i.test(message)) return "We could not complete signup. Please try again or contact support.";
  return message && !/NEXT_PUBLIC|CUSTOMER_AUTH_|DATABASE_URL|SECRET|TOKEN/i.test(message)
    ? message
    : "We could not complete signup. Please try again or contact support.";
}

function validateSignup(fullName: string, email: string, password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (confirmPassword !== password) errors.confirmPassword = "Passwords must match.";
  return errors;
}

function resolveEmailRedirect(siteUrl: string, callbackPath: string) {
  const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return callbackPath;
  return `${base.replace(/\/+$/, "")}${callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`}`;
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const referral = useMemo(() => captureReferralParams(params), [params]);
  const nextPath = safeLocalPath(params.get("next"), "/onboarding");
  const initialReferralCode = referral.ref || "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [configReady, setConfigReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    setReferralCode(referral.ref || "");
  }, [referral.ref]);

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

  function buildCallbackPath() {
    return appendReferralParams(`/auth/callback?next=${encodeURIComponent(nextPath)}`, referral);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendMessage("");
    setConfirmationPending(false);
    const errors = validateSignup(fullName, email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMessage("Please fix the highlighted fields and try again.");
      return;
    }
    if (!configReady) {
      setMessage(CUSTOMER_ACCESS_UNAVAILABLE_MESSAGE);
      return;
    }
    setSubmitting(true);
    setMessage("Creating your account…");
    try {
      const [authClient, config] = await Promise.all([getCustomerAuthClient(), getBrowserCustomerConfig()]);
      const metadata = {
        ...referralMetadata({ ...referral, ref: referralCode.trim() || referral.ref }),
        full_name: fullName.trim(),
        display_name: fullName.trim(),
        source: "rocket_web",
        onboarding_target: "/onboarding",
      };
      const { data, error } = await authClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: resolveEmailRedirect(config.siteUrl, buildCallbackPath()),
          data: metadata,
        },
      });
      if (error) {
        setMessage(humanSignupError(error.message));
        return;
      }
      if (data.session && data.user) {
        router.push(nextPath);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setConfirmationPending(true);
      setMessage(CONFIRMATION_MESSAGE);
    } catch (error) {
      setMessage(error instanceof Error ? humanSignupError(error.message) : "We could not complete signup. Please try again or contact support.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    if (!configReady || !email.trim()) return;
    setResending(true);
    setResendMessage("Sending confirmation email…");
    try {
      const [authClient, config] = await Promise.all([getCustomerAuthClient(), getBrowserCustomerConfig()]);
      if (typeof authClient.auth.resend !== "function") {
        setResendMessage("Please try again in a few minutes or contact support.");
        return;
      }
      const { error } = await authClient.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: resolveEmailRedirect(config.siteUrl, buildCallbackPath()) },
      });
      setResendMessage(error ? humanSignupError(error.message) : "Confirmation email resent. Please check your inbox, spam, or promotions folder.");
    } catch {
      setResendMessage("Please try again in a few minutes or contact support.");
    } finally {
      setResending(false);
    }
  }

  return (
    <DbxAuthShell
      mode="register"
      email={email}
      password={password}
      message={message}
      configReady={configReady}
      referral={referral}
      nextPath={nextPath}
      fullName={fullName}
      confirmPassword={confirmPassword}
      referralCode={referralCode}
      fieldErrors={fieldErrors}
      submitting={submitting}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onFullNameChange={setFullName}
      onConfirmPasswordChange={setConfirmPassword}
      onReferralCodeChange={setReferralCode}
      onSubmit={submit}
    >
      {confirmationPending ? (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <p style={{ margin: 0, color: "#e2e8f0", lineHeight: 1.6 }}>
            Didn’t get the email? Resend confirmation. If it still does not arrive, check spam or promotions, then <a href={supportHref} style={{ color: "#fbbf24", fontWeight: 900, textDecoration: "none" }}>contact support</a>.
          </p>
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={!configReady || resending}
            style={{
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 18,
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              padding: "13px 18px",
              fontWeight: 900,
              fontSize: 14,
              cursor: configReady && !resending ? "pointer" : "not-allowed",
              opacity: configReady && !resending ? 1 : .55,
            }}
          >
            {resending ? "Resending…" : "Resend confirmation email"}
          </button>
          {resendMessage ? <p role="status" style={{ margin: 0, color: "#e2e8f0" }}>{resendMessage}</p> : null}
        </div>
      ) : null}
    </DbxAuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading register…</main>}>
      <RegisterForm />
    </Suspense>
  );
}
