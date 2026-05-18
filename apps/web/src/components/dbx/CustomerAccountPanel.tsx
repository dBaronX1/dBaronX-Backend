"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { getSupabaseRuntimeBrowserClient } from "@/lib/supabase/runtime-client";
import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function shortUserReference(value: string) {
  if (!value) return "Not available";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function CustomerAccountPanel({ mode = "account" }: { mode?: "account" | "profile" | "dashboard" }) {
  const { session, loading, error, signedIn, refreshSession } = useAuthSession();
  const customerEmail = session?.user?.email || "";
  const metadata = session?.user?.user_metadata || {};
  const initialFullName = textValue(metadata.full_name) || textValue(metadata.name) || textValue(metadata.display_name);
  const initialDisplayName = textValue(metadata.display_name) || initialFullName || customerEmail || "dBaronX customer";
  const [editing, setEditing] = useState(mode === "profile");
  const [fullNameDraft, setFullNameDraft] = useState(initialFullName);
  const [displayNameDraft, setDisplayNameDraft] = useState(initialDisplayName);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setFullNameDraft(initialFullName);
    setDisplayNameDraft(initialDisplayName);
  }, [initialFullName, initialDisplayName]);

  const referralReference = useMemo(() => {
    return textValue(metadata.referral_code) || textValue(metadata.referralCode) || textValue(metadata.ref) || textValue(metadata.reference) || textValue(metadata.reference_id);
  }, [metadata]);
  const referralLink = referralReference && typeof window !== "undefined" ? `${window.location.origin}/register?ref=${encodeURIComponent(referralReference)}` : "";

  async function updateProfile() {
    const nextFullName = fullNameDraft.trim();
    const nextDisplayName = displayNameDraft.trim() || nextFullName;
    if (!nextFullName && !nextDisplayName) {
      setStatus("Please enter a display name before saving.");
      return;
    }
    setStatus("Updating profile…");
    try {
      const supabase = await getSupabaseRuntimeBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          full_name: nextFullName || nextDisplayName,
          display_name: nextDisplayName || nextFullName,
        },
      });
      if (updateError) {
        setStatus("We could not update your profile. Please try again or contact support.");
        return;
      }
      await refreshSession();
      setStatus("Profile updated. Your saved account details are now active.");
      setEditing(false);
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
          {error ? "We could not load the current session. Please sign in again or contact support." : "Access profile details, referrals, orders, wallet links, and support after login."}
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
        <h2 style={{ margin: 0 }}>{initialDisplayName}</h2>
        <p style={{ color: "#fed7aa", marginBottom: 8 }}>{customerEmail}</p>
        <p style={{ color: "#fdba74", marginTop: 0 }}>Customer reference: {shortUserReference(session?.user?.id || "")}</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.6 }}>
          Profile storage is powered by Supabase Auth metadata. If an extended profile table is not enabled yet, these safe account fields remain editable here.
        </p>
        {editing ? (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ color: "#fed7aa", fontWeight: 800 }} htmlFor="dbx-profile-full-name">Full name</label>
            <input
              id="dbx-profile-full-name"
              autoComplete="name"
              value={fullNameDraft}
              onChange={(event) => setFullNameDraft(event.target.value)}
              style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800 }}
            />
            <label style={{ color: "#fed7aa", fontWeight: 800 }} htmlFor="dbx-profile-display-name">Display name</label>
            <input
              id="dbx-profile-display-name"
              autoComplete="nickname"
              value={displayNameDraft}
              onChange={(event) => setDisplayNameDraft(event.target.value)}
              style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800 }}
            />
            <p style={{ color: "#fdba74", lineHeight: 1.6, margin: 0 }}>Email changes require a secure confirmation flow. Contact support if you need help changing your login email.</p>
            <button type="button" onClick={updateProfile} style={{ ...dbxButtonStyle, cursor: "pointer" }}>Save profile</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} style={{ ...dbxButtonStyle, cursor: "pointer" }}>Edit profile</button>
        )}
        {status ? <p role="status" style={{ color: "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      </DbxCard>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account actions</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Manage customer-safe profile details, orders, rewards, referrals, support requests, and account preferences.</p>
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
          {referralReference ? `Your referral code: ${referralReference}` : "Referral details will appear here when available for your account."}
        </p>
        {referralLink ? <p style={{ color: "#fdba74", lineHeight: 1.6, overflowWrap: "anywhere" }}>Referral link: {referralLink}</p> : null}
        <Link href="/referrals" style={dbxButtonStyle}>Open referrals</Link>
      </DbxCard>
    </div>
  );
}
