"use client";

import Link from "next/link";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { RocketCard, rocketButtonStyle } from "@/components/rocket/RocketShell";

export function CustomerAccountPanel({ mode = "account" }: { mode?: "account" | "profile" | "dashboard" }) {
  const { session, loading, error, signedIn } = useAuthSession();
  const customerEmail = session?.user?.email || "";
  const displayName = String(session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || customerEmail || "Rocket customer");

  if (loading) return <RocketCard>Loading secure customer session…</RocketCard>;

  if (!signedIn) {
    return (
      <RocketCard>
        <h2 style={{ marginTop: 0 }}>Sign in to continue</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          {error ? "We could not load the current session. Please sign in again or contact support." : "Access orders, profile details, referrals, wallet status, and Rocket checkout history after login."}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={`/login?next=/${mode}`} style={rocketButtonStyle}>Login</Link>
          <Link href={`/register?next=/${mode}`} style={{ ...rocketButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Create account</Link>
        </div>
      </RocketCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
      <RocketCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Signed in</p>
        <h2 style={{ margin: 0 }}>{displayName}</h2>
        <p style={{ color: "#fed7aa" }}>{customerEmail}</p>
      </RocketCard>
      <RocketCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account actions</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Rocket production keeps customer session behavior on Supabase Auth while avoiding secret exposure and raw runtime errors in the frontend.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/orders" style={rocketButtonStyle}>Orders</Link>
          <Link href="/profile" style={rocketButtonStyle}>Profile</Link>
          <Link href="/wallet" style={rocketButtonStyle}>Wallet</Link>
        </div>
      </RocketCard>
    </div>
  );
}
