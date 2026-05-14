"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";
import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export function CustomerAccountPanel({ mode = "account" }: { mode?: "account" | "profile" | "dashboard" }) {
  const { session, loading, error, signedIn } = useAuthSession();
  const customerEmail = session?.user?.email || "";
  const metadata = session?.user?.user_metadata || {};
  const displayName = String(metadata.full_name || metadata.name || metadata.display_name || customerEmail || "dBaronX customer");
  const [editing, setEditing] = useState(mode === "profile");
  const [nameDraft, setNameDraft] = useState(displayName);
  const [status, setStatus] = useState("");
  const referralReference = useMemo(() => {
    return String(metadata.referral_code || metadata.referralCode || metadata.ref || metadata.reference || metadata.reference_id || "");
  }, [metadata]);

  async function updateProfile() {
    setStatus("Updating profile…");
    try {
      const supabase = await getSupabaseRuntimeBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...metadata, full_name: nameDraft.trim(), display_name: nameDraft.trim() },
      });
      setStatus(updateError ? "We could not update your profile. Please try again or contact support." : "Profile updated.");
      if (!updateError) setEditing(false);
    } catch {
      setStatus("We could not update your profile. Please try again or contact support.");
    }
  }

  async function signOut() {
    setStatus("Signing out…");
    try {
      const supabase = await getSupabaseRuntimeBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/home";
    } catch {
      setStatus("We could not sign you out. Please try again or contact support.");
    }
  }

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
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account / Profile</p>
        <h2 style={{ margin: 0 }}>{displayName}</h2>
        <p style={{ color: "#fed7aa" }}>{customerEmail}</p>
        {editing ? (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ color: "#fed7aa", fontWeight: 800 }} htmlFor="dbx-profile-name">Name</label>
            <input
              id="dbx-profile-name"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800 }}
            />
            <button type="button" onClick={updateProfile} style={{ ...dbxButtonStyle, cursor: "pointer" }}>Update profile</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} style={{ ...dbxButtonStyle, cursor: "pointer" }}>Edit profile</button>
        )}
        {status ? <p role="status" style={{ color: "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      </DbxCard>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account actions</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Manage your dBaronX profile, orders, rewards, referrals, support requests, and account preferences.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/orders" style={dbxButtonStyle}>Orders</Link>
          <Link href="/profile" style={dbxButtonStyle}>Profile</Link>
          <Link href="/wallet" style={dbxButtonStyle}>Wallet</Link>
          <Link href="/support?topic=delete-account" style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Delete account request</Link>
          <button type="button" onClick={signOut} style={{ ...dbxButtonStyle, cursor: "pointer" }}>Sign out</button>
        </div>
      </DbxCard>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Referral / Reference</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          {referralReference ? `Your reference: ${referralReference}` : "Referral details will appear here when available for your account."}
        </p>
        <Link href="/referrals" style={dbxButtonStyle}>Open referrals</Link>
      </DbxCard>
    </div>
  );
}
