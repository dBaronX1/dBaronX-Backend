"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DbxAuthShell } from "@/components/auth/DbxAuthShell";
import { captureReferralParams } from "@/lib/auth/referral-capture";
import { safeLocalPath } from "@/lib/auth/routes";
import { registerWithApi, safeAuthMessage } from "@/lib/auth/nest-auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_MESSAGE = "Account created. Redirecting to your account.";

type FieldErrors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;

function humanSignupError(message: string) {
  return safeAuthMessage(message, "We could not create your account right now. Please check your details and try again.");
}

function validateSignup(fullName: string, email: string, password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (confirmPassword !== password) errors.confirmPassword = "Passwords must match.";
  return errors;
}

function RegisterForm() {
  const router = useRouter();
  const [params, setParams] = useState(() => new URLSearchParams());
  const referral = useMemo(() => captureReferralParams(params), [params]);
  const nextPath = safeLocalPath(params.get("next"), "/account");

  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);
  const initialReferralCode = referral.ref || "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [configReady] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  useEffect(() => {
    setReferralCode(referral.ref || "");
  }, [referral.ref]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationPending(false);
    const errors = validateSignup(fullName, email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMessage("Please fix the highlighted fields and try again.");
      return;
    }
    setSubmitting(true);
    setMessage("Creating your account…");
    try {
      await registerWithApi({
        email: email.trim(),
        password,
        confirmPassword,
        fullName: fullName.trim(),
        referralCode: referralCode.trim() || referral.ref || "",
      });
      setPassword("");
      setConfirmPassword("");
      setConfirmationPending(true);
      setMessage(CONFIRMATION_MESSAGE);
      router.push(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? humanSignupError(error.message) : "We could not create your account right now. Please check your details and try again.");
    } finally {
      setSubmitting(false);
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
        <p role="status" style={{ marginTop: 14, color: "#e2e8f0", lineHeight: 1.6 }}>{CONFIRMATION_MESSAGE}</p>
      ) : null}
    </DbxAuthShell>
  );
}

export default function RegisterPage() {
  return <RegisterForm />;
}
