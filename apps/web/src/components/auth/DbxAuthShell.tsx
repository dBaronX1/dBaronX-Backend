"use client";

import type { FormEvent } from "react";
import Link from "next/link";

import type { ReferralCapture } from "@/lib/auth/referral-capture";

const supportHref = "mailto:support@dbaronx.com";

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    background:
      "radial-gradient(circle at top left, rgba(244, 63, 94, 0.34), transparent 30%), radial-gradient(circle at 80% 10%, rgba(56, 189, 248, 0.28), transparent 28%), linear-gradient(135deg, #09090b 0%, #111827 45%, #240b36 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  wrap: {
    width: "min(1120px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "32px 0",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 42,
  },
  brand: { display: "flex", alignItems: "center", gap: 12, color: "#fff", textDecoration: "none", fontWeight: 900 },
  mark: {
    display: "grid",
    placeItems: "center",
    width: 44,
    height: 44,
    borderRadius: 16,
    background: "linear-gradient(135deg, #f97316, #e11d48, #7c3aed)",
    boxShadow: "0 16px 48px rgba(225, 29, 72, .36)",
  },
  social: { display: "flex", gap: 10, flexWrap: "wrap" as const, justifyContent: "flex-end" },
  socialLink: {
    color: "#cbd5e1",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    padding: "8px 12px",
    background: "rgba(255,255,255,.06)",
    backdropFilter: "blur(12px)",
    fontSize: 13,
  },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 440px)", gap: 32, alignItems: "center" },
  hero: { display: "grid", gap: 22 },
  eyebrow: {
    width: "fit-content",
    border: "1px solid rgba(251, 191, 36, .35)",
    background: "rgba(251, 191, 36, .1)",
    color: "#fde68a",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: ".08em",
    textTransform: "uppercase" as const,
  },
  title: { margin: 0, fontSize: "clamp(42px, 8vw, 86px)", lineHeight: .9, letterSpacing: "-.07em", fontWeight: 950 },
  gradientText: {
    background: "linear-gradient(90deg, #fbbf24, #fb7185, #a78bfa, #38bdf8)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },
  lead: { margin: 0, maxWidth: 650, color: "#cbd5e1", fontSize: 18, lineHeight: 1.7 },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, maxWidth: 620 },
  stat: { border: "1px solid rgba(255,255,255,.12)", borderRadius: 22, background: "rgba(255,255,255,.07)", padding: 16 },
  statValue: { display: "block", fontSize: 24, fontWeight: 950 },
  statLabel: { display: "block", color: "#94a3b8", fontSize: 12, marginTop: 4 },
  card: {
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 30,
    background: "linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.08))",
    boxShadow: "0 30px 100px rgba(0,0,0,.38)",
    backdropFilter: "blur(22px)",
    padding: 28,
  },
  form: { display: "grid", gap: 14 },
  label: { display: "grid", gap: 8, color: "#e2e8f0", fontSize: 13, fontWeight: 800 },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 16,
    background: "rgba(15,23,42,.72)",
    color: "#fff",
    padding: "14px 16px",
    outline: "none",
    fontSize: 15,
  },
  fieldError: { color: "#fecdd3", fontSize: 12, fontWeight: 800 },
  button: {
    border: 0,
    borderRadius: 18,
    background: "linear-gradient(135deg, #f97316, #e11d48, #7c3aed)",
    color: "#fff",
    padding: "15px 18px",
    fontWeight: 950,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 18px 48px rgba(225,29,72,.35)",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 18,
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    padding: "13px 18px",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
  },
  message: { borderRadius: 18, background: "rgba(15,23,42,.72)", border: "1px solid rgba(255,255,255,.14)", padding: 14, color: "#e2e8f0" },
  chips: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  chip: { borderRadius: 999, background: "rgba(56,189,248,.12)", color: "#bae6fd", padding: "7px 10px", fontSize: 12, fontWeight: 800 },
  foot: { color: "#cbd5e1", fontSize: 14, lineHeight: 1.6 },
  link: { color: "#fbbf24", fontWeight: 900, textDecoration: "none" },
};

export type DbxAuthShellProps = {
  mode: "register" | "login";
  email: string;
  password: string;
  message: string;
  configReady: boolean;
  referral: ReferralCapture;
  nextPath: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  fullName?: string;
  confirmPassword?: string;
  referralCode?: string;
  fieldErrors?: Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;
  submitting?: boolean;
  onFullNameChange?: (value: string) => void;
  onConfirmPasswordChange?: (value: string) => void;
  onReferralCodeChange?: (value: string) => void;
  onMagicLink?: () => void;
  children?: JSX.Element | JSX.Element[] | string | null;
};

export function DbxAuthShell({
  mode,
  email,
  password,
  message,
  configReady,
  referral,
  nextPath,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  fullName = "",
  confirmPassword = "",
  referralCode = "",
  fieldErrors = {},
  submitting = false,
  onFullNameChange,
  onConfirmPasswordChange,
  onReferralCodeChange,
  onMagicLink,
  children,
}: DbxAuthShellProps) {
  const isRegister = mode === "register";
  const submitDisabled = !configReady || submitting;
  const params = new URLSearchParams();
  for (const key of ["ref", "invite", "init"] as const) {
    const value = referral[key];
    if (value) params.set(key, value);
  }
  if (nextPath) params.set("next", nextPath);
  const authSearch = params.toString() ? `?${params.toString()}` : "";

  return (
    <main style={styles.page} data-dbx-visual-ui="preserved">
      <div style={styles.wrap}>
        <nav style={styles.nav} aria-label="dBaronX auth navigation">
          <Link href="/" style={styles.brand}>
            <span style={styles.mark}>✦</span>
            <span>dBaronX</span>
          </Link>
          <div style={styles.social} aria-label="dBaronX social links">
            <a style={styles.socialLink} href="https://x.com/dbaronx" rel="noreferrer" target="_blank">X</a>
            <a style={styles.socialLink} href="https://instagram.com/dbaronx" rel="noreferrer" target="_blank">Instagram</a>
            <a style={styles.socialLink} href="https://www.tiktok.com/@dbaronx" rel="noreferrer" target="_blank">TikTok</a>
          </div>
        </nav>

        <section style={styles.grid}>
          <div style={styles.hero}>
            <div style={styles.eyebrow}>dBaronX customer access</div>
            <h1 style={styles.title}>
              {isRegister ? "Launch your" : "Welcome back to"} <span style={styles.gradientText}>dBaronX</span>
            </h1>
            <p style={styles.lead}>
              {isRegister
                ? "Create your account for the dBaronX storefront, onboarding, referrals, products, and customer dashboard."
                : "Log in to continue to the dBaronX dashboard, customer commerce tools, referrals, and checkout flow."}
            </p>
            <div style={styles.stats} aria-label="dBaronX readiness highlights">
              <span style={styles.stat}><strong style={styles.statValue}>Secure</strong><span style={styles.statLabel}>Account access</span></span>
              <span style={styles.stat}><strong style={styles.statValue}>Shop</strong><span style={styles.statLabel}>Products</span></span>
              <span style={styles.stat}><strong style={styles.statValue}>DBX</strong><span style={styles.statLabel}>Rewards + control</span></span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              <div style={styles.eyebrow}>{isRegister ? "Create account" : "Customer login"}</div>
              <h2 style={{ margin: 0, fontSize: 30, letterSpacing: "-.04em" }}>
                {isRegister ? "Join dBaronX" : "Login securely"}
              </h2>
            </div>

            <div style={styles.chips}>
              {referral.ref ? <span style={styles.chip}>Referral: {referral.ref}</span> : null}
              {referral.invite ? <span style={styles.chip}>Invite: {referral.invite}</span> : null}
              {referral.init ? <span style={styles.chip}>Init: {referral.init}</span> : null}
            </div>

            <form onSubmit={onSubmit} style={{ ...styles.form, marginTop: 18 }} noValidate>
              {isRegister ? (
                <label style={styles.label}>
                  Full Name
                  <input required minLength={2} type="text" autoComplete="name" value={fullName} onChange={(event) => onFullNameChange?.(event.target.value)} style={styles.input} aria-invalid={Boolean(fieldErrors.fullName)} />
                  {fieldErrors.fullName ? <span style={styles.fieldError}>{fieldErrors.fullName}</span> : null}
                </label>
              ) : null}
              <label style={styles.label}>
                Email
                <input required type="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} style={styles.input} aria-invalid={Boolean(fieldErrors.email)} />
                {fieldErrors.email ? <span style={styles.fieldError}>{fieldErrors.email}</span> : null}
              </label>
              <label style={styles.label}>
                Password
                <input required minLength={isRegister ? 8 : undefined} type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => onPasswordChange(event.target.value)} style={styles.input} aria-invalid={Boolean(fieldErrors.password)} />
                {fieldErrors.password ? <span style={styles.fieldError}>{fieldErrors.password}</span> : null}
              </label>
              {isRegister ? (
                <>
                  <label style={styles.label}>
                    Confirm Password
                    <input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => onConfirmPasswordChange?.(event.target.value)} style={styles.input} aria-invalid={Boolean(fieldErrors.confirmPassword)} />
                    {fieldErrors.confirmPassword ? <span style={styles.fieldError}>{fieldErrors.confirmPassword}</span> : null}
                  </label>
                  <label style={styles.label}>
                    Referral Code <span style={{ color: "#94a3b8", fontWeight: 700 }}>(optional)</span>
                    <input type="text" autoComplete="off" value={referralCode} onChange={(event) => onReferralCodeChange?.(event.target.value)} style={styles.input} />
                  </label>
                  <input type="hidden" name="invite" value={referral.invite || ""} />
                  <input type="hidden" name="init" value={referral.init || ""} />
                </>
              ) : null}
              <button type="submit" disabled={submitDisabled} style={{ ...styles.button, opacity: submitDisabled ? .55 : 1, cursor: submitDisabled ? "not-allowed" : "pointer" }}>
                {submitting ? (isRegister ? "Creating account…" : "Logging in…") : isRegister ? "Create Free Account" : "Log in"}
              </button>
              {onMagicLink ? (
                <button type="button" onClick={onMagicLink} disabled={!configReady || !email || submitting} style={{ ...styles.secondaryButton, opacity: configReady && email && !submitting ? 1 : .55, cursor: configReady && email && !submitting ? "pointer" : "not-allowed" }}>
                  Email me a magic link
                </button>
              ) : null}
            </form>

            {message ? <p role="status" style={styles.message}>{message}</p> : null}
            {!configReady ? (
              <p role="alert" style={styles.message}>
                Signup is temporarily unavailable. Please try again shortly or <a href={supportHref} style={styles.link}>contact support</a>.
              </p>
            ) : null}
            {children}
            <p style={styles.foot}>
              {isRegister ? "Already registered? " : "New here? "}
              <Link href={`${isRegister ? "/login" : "/register"}${authSearch}`} style={styles.link}>
                {isRegister ? "Log in" : "Create account"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
