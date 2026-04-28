import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
const FASTAPI_BASE = "https://dbaronx-fastapi.onrender.com";
const CORE_API = "https://dbaronx-nestjs-api.onrender.com";

// ==========================
// AFFILIATE ENGINE (FASTAPI)
// ==========================

export async function fetchAds(token) {
  const res = await fetch(`${FASTAPI_BASE}/ads`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch ads");

  return await res.json();
}

export async function confirmAd(ad_id, captcha_token, token) {
  const res = await fetch(`${FASTAPI_BASE}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ad_id, captcha_token }),
  });

  if (!res.ok) throw new Error("Ad confirmation failed");

  return await res.json();
}

// ==========================
// CORE SYSTEM (NESTJS)
// ==========================

export async function getUserProfile(token) {
  const res = await fetch(`${CORE_API}/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch profile");

  return await res.json();
}