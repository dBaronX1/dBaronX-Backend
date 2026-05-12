"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authRedirectTo, getSupabaseBrowserClient } from "../../lib/supabase-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const referral = params.get("ref") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Signing in…");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(/invalid/i.test(error.message) ? "Email or password is incorrect." : error.message);
      return;
    }
    router.push(next);
  }

  async function magicLink() {
    setMessage("Sending magic link…");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirectTo(`/auth/callback?next=${encodeURIComponent(next)}${referral ? `&ref=${encodeURIComponent(referral)}` : ""}`) } });
    setMessage(error ? error.message : "Check your email for the magic login link.");
  }

  return <main style={{ maxWidth: 520, margin: "4rem auto", padding: 24 }}>
    <h1>Log in to dBaronX</h1>
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button type="submit">Log in</button>
      <button type="button" onClick={magicLink} disabled={!email}>Email me a magic link</button>
    </form>
    {message ? <p role="status">{message}</p> : null}
    <p>New here? <Link href={`/signup${referral ? `?ref=${encodeURIComponent(referral)}` : ""}`}>Create account</Link></p>
  </main>;
}


export default function LoginPage() {
  return <Suspense fallback={<main style={{ padding: 24 }}>Loading login…</main>}><LoginForm /></Suspense>;
}
