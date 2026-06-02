"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { logoutWithApi, updateProfileWithApi } from "@/lib/auth/nest-auth-client";
import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"] as const;
const PRONOUN_OPTIONS = ["He", "She", "Prefer not to say"] as const;
const COUNTRY_OPTIONS = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Nigeria", "Ghana", "South Africa", "Prefer not to say"] as const;
const PHONE_CODE_OPTIONS = ["+1", "+44", "+49", "+61", "+233", "+234", "+27", "Prefer not to say"] as const;
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "German", "Portuguese", "Prefer not to say"] as const;
const PHOTO_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionValue(value: unknown, options: readonly string[], fallback: string) {
  const text = textValue(value);
  return options.includes(text) ? text : fallback;
}

function shortUserReference(value: string) {
  if (!value) return "Not available";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function safeProfileMetadata(input: Record<string, unknown>, updates: Record<string, unknown>) {
  return {
    referral_code: textValue(input.referral_code),
    referralCode: textValue(input.referralCode),
    ref: textValue(input.ref),
    reference: textValue(input.reference),
    reference_id: textValue(input.reference_id),
    full_name: textValue(updates.full_name),
    display_name: textValue(updates.display_name),
    avatar_url: textValue(updates.avatar_url),
    gender: textValue(updates.gender),
    pronouns: textValue(updates.pronouns),
    country: textValue(updates.country),
    phone_code: textValue(updates.phone_code),
    language: textValue(updates.language),
  };
}

const fieldStyle = { border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800, width: "100%" } as const;
const labelStyle = { display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 } as const;

function SelectField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} style={labelStyle}>
      {label}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} style={fieldStyle}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function CustomerAccountPanel({ mode = "account" }: { mode?: "account" | "profile" | "dashboard" }) {
  const { session, loading, error, signedIn, refreshSession } = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customerEmail = session?.user?.email || "";
  const metadata = useMemo(() => session?.user?.user_metadata || {}, [session?.user?.user_metadata]);
  const initialFullName = textValue(metadata.full_name) || textValue(metadata.name) || textValue(metadata.display_name);
  const initialDisplayName = textValue(metadata.display_name) || initialFullName || customerEmail || "dBaronX customer";
  const initialAvatarUrl = textValue(metadata.avatar_url) || textValue(metadata.picture);
  const [editing, setEditing] = useState(mode === "profile");
  const [fullNameDraft, setFullNameDraft] = useState(initialFullName);
  const [displayNameDraft, setDisplayNameDraft] = useState(initialDisplayName);
  const [genderDraft, setGenderDraft] = useState(optionValue(metadata.gender, GENDER_OPTIONS, "Prefer not to say"));
  const [pronounsDraft, setPronounsDraft] = useState(optionValue(metadata.pronouns, PRONOUN_OPTIONS, "Prefer not to say"));
  const [countryDraft, setCountryDraft] = useState(optionValue(metadata.country, COUNTRY_OPTIONS, "United States"));
  const [phoneCodeDraft, setPhoneCodeDraft] = useState(optionValue(metadata.phone_code || metadata.phoneCode, PHONE_CODE_OPTIONS, "+1"));
  const [languageDraft, setLanguageDraft] = useState(optionValue(metadata.language, LANGUAGE_OPTIONS, "English"));
  const [photoPreview, setPhotoPreview] = useState(initialAvatarUrl);
  const [photoUploadUrl, setPhotoUploadUrl] = useState(initialAvatarUrl);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setFullNameDraft(initialFullName);
    setDisplayNameDraft(initialDisplayName);
    setGenderDraft(optionValue(metadata.gender, GENDER_OPTIONS, "Prefer not to say"));
    setPronounsDraft(optionValue(metadata.pronouns, PRONOUN_OPTIONS, "Prefer not to say"));
    setCountryDraft(optionValue(metadata.country, COUNTRY_OPTIONS, "United States"));
    setPhoneCodeDraft(optionValue(metadata.phone_code || metadata.phoneCode, PHONE_CODE_OPTIONS, "+1"));
    setLanguageDraft(optionValue(metadata.language, LANGUAGE_OPTIONS, "English"));
    setPhotoPreview(initialAvatarUrl);
    setPhotoUploadUrl(initialAvatarUrl);
  }, [initialFullName, initialDisplayName, initialAvatarUrl, metadata]);

  const referralReference = useMemo(() => {
    return textValue(metadata.referral_code) || textValue(metadata.referralCode) || textValue(metadata.ref) || textValue(metadata.reference) || textValue(metadata.reference_id);
  }, [metadata]);
  const referralLink = referralReference && typeof window !== "undefined" ? `${window.location.origin}/register?ref=${encodeURIComponent(referralReference)}` : "";

  async function chooseProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PHOTO_ACCEPT.split(",").includes(file.type)) {
      setStatus("Profile photo must be a JPG, PNG, or WEBP image.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoUploadUrl(photoUploadUrl || initialAvatarUrl);
    setStatus("Profile photo preview ready. Photo saving is temporarily unavailable, but your other profile details can still be saved.");
  }

  async function updateProfile() {
    const nextFullName = fullNameDraft.trim();
    const nextDisplayName = displayNameDraft.trim() || nextFullName;
    if (!nextFullName && !nextDisplayName) {
      setStatus("Please enter a display name before saving.");
      return;
    }
    setStatus("Updating profile…");
    try {
      const safeData = safeProfileMetadata(metadata, {
        full_name: nextFullName || nextDisplayName,
        display_name: nextDisplayName || nextFullName,
        avatar_url: photoUploadUrl,
        gender: genderDraft,
        pronouns: pronounsDraft,
        country: countryDraft,
        phone_code: phoneCodeDraft,
        language: languageDraft,
      });
      await updateProfileWithApi({
        fullName: String(safeData.full_name || ""),
        displayName: String(safeData.display_name || ""),
        avatarUrl: String(safeData.avatar_url || ""),
        gender: String(safeData.gender || "Prefer not to say"),
        pronouns: String(safeData.pronouns || "Prefer not to say"),
        country: String(safeData.country || ""),
        phoneCode: String(safeData.phone_code || ""),
        language: String(safeData.language || ""),
      });
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
      await logoutWithApi();
      window.location.href = "/home";
    } catch {
      setStatus("We could not sign you out. Please try again or contact support.");
    }
  }

  const accountStatus = status || (signedIn && error ? "Account service is temporarily unavailable. Showing your saved profile while we retry." : "");

  if (loading) return <DbxCard>Loading secure customer session…</DbxCard>;

  if (!signedIn) {
    return (
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>Sign in to continue</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          {error ? "We could not load the current session. Please sign in again or contact support." : "Access profile details, referrals, orders, and support after login."}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={`/login?next=/${mode}`} style={dbxButtonStyle}>Login</Link>
          <Link href={`/register?next=/${mode}`} style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Create account</Link>
        </div>
      </DbxCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account / Profile</p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "rgba(251,191,36,.16)", border: "1px solid rgba(251,191,36,.35)", display: "grid", placeItems: "center", color: "#fbbf24", fontWeight: 950 }}>
            {photoPreview ? <img src={photoPreview} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (initialDisplayName || customerEmail).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{initialDisplayName}</h2>
            <p style={{ color: "#fdba74", marginTop: 8 }}>Masked profile reference: {shortUserReference(session?.user?.id || "")}</p>
          </div>
        </div>
        {editing ? (
          <div style={{ display: "grid", gap: 12 }}>
            <input ref={fileInputRef} type="file" accept={PHOTO_ACCEPT} onChange={chooseProfilePhoto} style={{ display: "none" }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...dbxButtonStyle, cursor: "pointer", border: 0 }}>Upload / Change Photo</button>
            <label style={labelStyle} htmlFor="dbx-profile-full-name">Full name<input id="dbx-profile-full-name" autoComplete="name" value={fullNameDraft} onChange={(event) => setFullNameDraft(event.target.value)} style={fieldStyle} /></label>
            <label style={labelStyle} htmlFor="dbx-profile-email">Email<input id="dbx-profile-email" autoComplete="email" value={customerEmail} readOnly style={fieldStyle} /></label>
            <label style={labelStyle} htmlFor="dbx-profile-phone">Phone<input id="dbx-profile-phone" autoComplete="tel" value="" placeholder="Add phone during checkout or support update" readOnly style={fieldStyle} /></label>
            <SelectField id="dbx-profile-gender" label="Gender" value={genderDraft} options={GENDER_OPTIONS} onChange={setGenderDraft} />
            <SelectField id="dbx-profile-pronouns" label="Pronouns" value={pronounsDraft} options={PRONOUN_OPTIONS} onChange={setPronounsDraft} />
            <SelectField id="dbx-profile-country" label="Country" value={countryDraft} options={COUNTRY_OPTIONS} onChange={setCountryDraft} />
            <SelectField id="dbx-profile-phone-code" label="Phone code" value={phoneCodeDraft} options={PHONE_CODE_OPTIONS} onChange={setPhoneCodeDraft} />
            <SelectField id="dbx-profile-language" label="Language" value={languageDraft} options={LANGUAGE_OPTIONS} onChange={setLanguageDraft} />
            <button type="button" onClick={updateProfile} style={{ ...dbxButtonStyle, cursor: "pointer", border: 0 }}>Save profile</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} style={{ ...dbxButtonStyle, cursor: "pointer", border: 0 }}>Edit profile</button>
        )}
        {accountStatus ? <p role="status" style={{ color: accountStatus.includes("unavailable") ? "#fecaca" : "#fed7aa", lineHeight: 1.6 }}>{accountStatus}</p> : null}
      </DbxCard>
      <DbxCard>
        <p style={{ marginTop: 0, color: "#fbbf24", fontWeight: 900 }}>Account actions</p>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Manage customer-safe profile details, orders, referrals, support requests, and account preferences.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/orders" style={dbxButtonStyle}>Orders</Link>
          <Link href="/profile" style={dbxButtonStyle}>Profile</Link>
          <Link href="/wallet" style={dbxButtonStyle}>Wallet</Link>
          <Link href="/support?topic=delete-account" style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Delete account request</Link>
          <button type="button" onClick={signOut} style={{ ...dbxButtonStyle, cursor: "pointer", border: 0 }}>Sign out</button>
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
