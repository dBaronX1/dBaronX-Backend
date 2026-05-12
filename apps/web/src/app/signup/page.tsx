"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authRedirectTo, getSupabaseBrowserClient } from "../../lib/supabase-client";

function SignupForm() {
  const params = useSearchParams();
  const referral = params.get("ref") || params.get("referral") || "";
  const initiation = params.get("init") || params.get("initiation") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const metadata = useMemo(() => ({ referral_code: referral || undefined, initiation_code: initiation || undefined }), [referral, initiation]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Creating your account…");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirectTo(`/auth/callback?next=/onboarding${referral ? `&ref=${encodeURIComponent(referral)}` : ""}`), data: metadata },
      });
      setMessage(error ? humanError(error.message) : "Check your email to confirm your account, then continue to onboarding.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed. Please try again.");
    }
  }

  return <main style={{ maxWidth: 520, margin: "4rem auto", padding: 24 }}>
    <h1>Create your dBaronX account</h1>
    <p>Use email/password signup. Referral and initiation codes are preserved automatically.</p>
    {referral ? <p><strong>Referral:</strong> {referral}</p> : null}
    {initiation ? <p><strong>Initiation:</strong> {initiation}</p> : null}
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button type="submit">Create account</button>
    </form>
    {message ? <p role="status">{message}</p> : null}
    <p>Already registered? <Link href={`/login${referral ? `?ref=${encodeURIComponent(referral)}` : ""}`}>Log in</Link></p>
  </main>;
}

function humanError(message: string) {
  if (/password/i.test(message)) return "Password must meet the security requirements. Try at least 8 characters.";
  if (/already/i.test(message)) return "An account may already exist for this email. Try logging in.";
  return message || "Signup failed. Please try again.";
}


export default function SignupPage() {
  return <Suspense fallback={<main style={{ padding: 24 }}>Loading signup…</main>}><SignupForm /></Suspense>;
}
