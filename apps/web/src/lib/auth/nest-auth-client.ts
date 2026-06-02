import { getBrowserPublicConfig } from "@/lib/public-config";

export type AuthSession = {
  accessToken?: string;
  supabaseAccessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
  referralCode?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  country?: string | null;
  phoneCode?: string | null;
  language?: string | null;
};

export type AuthResponse = {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  errorCode?: string;
  message?: string;
};

const AUTH_SESSION_STORAGE_KEY = "dbx.auth.session.v1";

const SAFE_AUTH_MESSAGES: Record<string, string> = {
  AUTH_TEMPORARILY_UNAVAILABLE: "Account service is temporarily unavailable. Please try again.",
  INVALID_EMAIL: "We could not create your account right now. Please check your details and try again.",
  WEAK_PASSWORD: "Your password is too weak. Please use a stronger password.",
  PASSWORD_MISMATCH: "We could not create your account right now. Please check your details and try again.",
  EMAIL_ALREADY_REGISTERED: "This email is already registered. Please sign in instead.",
  INVALID_CREDENTIALS: "We could not sign you in. Please check your email and password.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SESSION_EXPIRED: "We could not sign you in. Please check your email and password.",
  PROFILE_CREATION_FAILED: "We could not create your account right now. Please check your details and try again.",
  VALIDATION_FAILED: "We could not create your account right now. Please check your details and try again.",
};

const RAW_BACKEND_ERROR_PATTERN = /auth_service_unavailable|supabase_error|database_error|internal_service_error|service_role_missing|jwt_error|unexpected_error|failed_to_fetch|typeerror|networkerror|stack trace|supabase|database_url|service_role|jwt_secret|cookie_secret|internal_service_token|stripe_secret_key|medusa_publishable_key|\bat\s+\w+\s*\(/i;

export function safeAuthMessage(input: unknown, fallback: string) {
  const raw = typeof input === "string" ? input : input && typeof input === "object" && "errorCode" in input ? String((input as { errorCode?: unknown }).errorCode || "") : "";
  const upper = raw.trim().toUpperCase();
  if (upper && SAFE_AUTH_MESSAGES[upper]) return SAFE_AUTH_MESSAGES[upper];
  const message = typeof input === "string" ? input : input && typeof input === "object" && "message" in input ? String((input as { message?: unknown }).message || "") : "";
  if (RAW_BACKEND_ERROR_PATTERN.test(message) || RAW_BACKEND_ERROR_PATTERN.test(raw)) return fallback;
  return message || fallback;
}

export function storeAuthSession(session: AuthSession | undefined) {
  if (typeof window === "undefined" || !session?.accessToken) {
    throw new Error("AUTH_TEMPORARILY_UNAVAILABLE");
  }
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

async function apiBaseUrl() {
  const config = await getBrowserPublicConfig();
  return config.apiBaseUrl.replace(/\/+$/, "");
}

async function authFetch(path: string, init: RequestInit = {}) {
  const base = await apiBaseUrl();
  if (!base) throw new Error("AUTH_TEMPORARILY_UNAVAILABLE");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    credentials: "omit",
  });
  const payload = (await response.json().catch(() => ({}))) as AuthResponse;
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errorCode || payload.message || "AUTH_TEMPORARILY_UNAVAILABLE");
  }
  return payload;
}

export async function registerWithApi(input: { email: string; password: string; confirmPassword: string; fullName?: string; referralCode?: string }) {
  const payload = await authFetch("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  storeAuthSession(payload.session);
  return payload;
}

export async function loginWithApi(input: { email: string; password: string }) {
  const payload = await authFetch("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  storeAuthSession(payload.session);
  return payload;
}

export async function updateProfileWithApi(input: { fullName?: string; displayName?: string; avatarUrl?: string; gender?: string; pronouns?: string; country?: string; phoneCode?: string; language?: string }) {
  const session = readAuthSession();
  if (!session?.accessToken) throw new Error("SESSION_EXPIRED");
  return authFetch("/api/auth/profile", { method: "POST", headers: { authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify(input) });
}

export async function meWithApi() {
  const session = readAuthSession();
  if (!session?.accessToken) return null;
  return authFetch("/api/auth/me", { method: "GET", headers: { authorization: `Bearer ${session.accessToken}` } });
}

export async function logoutWithApi() {
  try {
    await authFetch("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
  } finally {
    clearAuthSession();
  }
}
