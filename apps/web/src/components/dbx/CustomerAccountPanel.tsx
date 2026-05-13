"use client";

import Link from "next/link";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export function CustomerAccountPanel({ mode = "account" }: { mode?: "account" | "profile" | "dashboard" }) {
  const { session, loading, error, signedIn } = useAuthSession();
  const customerEmail = session?.user?.email || "";
  const displayName = String(session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || customerEmail || "dBaronX customer");

  if (loading) return <DbxCard>Loading secure customer session…</DbxCard>;

  if (!signedIn) {
    return (
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>Sign in to continue</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          {error ? "We could not load the current session. Please sign in again or contact support." : "Access orders, profile details, referrals, wallet status, and support after login."}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={`/login?next=/${mode}`} style={dbxButtonStyle}>Login</Link>
          <Link href={`/register?next=/${mode}`} style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Create account</Link>
        </div>
      </DbxCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Signed in</p>
        <h2 style={{ margin: 0 }}>{displayName}</h2>
        <p style={{ color: "#fed7aa" }}>{customerEmail}</p>
      </DbxCard>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account actions</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Manage your dBaronX profile, orders, rewards, referrals, support requests, and account preferences.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/orders" style={dbxButtonStyle}>Orders</Link>
          <Link href="/profile" style={dbxButtonStyle}>Profile</Link>
          <Link href="/wallet" style={dbxButtonStyle}>Wallet</Link>
        </div>
      </DbxCard>
    </div>
  );
}
