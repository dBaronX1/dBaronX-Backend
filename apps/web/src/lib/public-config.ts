import { getPublicEnv } from "@/lib/env";

export type PublicRuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
  siteUrl: string;
  webBaseUrl: string;
  stripePublicKey: string;
  telegramBotUsername: string;
  telegramBotLink: string;
};

export const PUBLIC_CONFIG_KEYS = [
  "supabaseUrl",
  "supabaseAnonKey",
  "apiBaseUrl",
  "siteUrl",
  "webBaseUrl",
  "stripePublicKey",
  "telegramBotUsername",
  "telegramBotLink",
] as const satisfies readonly (keyof PublicRuntimeConfig)[];

export const CUSTOMER_AUTH_UNAVAILABLE_MESSAGE =
  "Signup is temporarily unavailable. Please try again shortly or contact support.";

let browserConfigPromise: Promise<PublicRuntimeConfig> | null = null;

function clean(value: string | undefined) {
  return (value || "").trim();
}

function cleanBaseUrl(value: string | undefined) {
  return clean(value).replace(/\/+$/, "");
}

export function getBuildTimePublicConfig(): PublicRuntimeConfig {
  const env = getPublicEnv();
  return {
    supabaseUrl: cleanBaseUrl(env.supabaseUrl),
    supabaseAnonKey: clean(env.supabaseAnonKey),
    apiBaseUrl: cleanBaseUrl(env.apiBaseUrl),
    siteUrl: cleanBaseUrl(env.siteUrl),
    webBaseUrl: cleanBaseUrl(env.webBaseUrl),
    stripePublicKey: clean(env.stripePublicKey),
    telegramBotUsername: clean(env.telegramBotUsername),
    telegramBotLink: clean(env.telegramBotLink),
  };
}

export function getRuntimePublicConfigFromEnv(): PublicRuntimeConfig {
  const buildTime = getBuildTimePublicConfig();
  return {
    supabaseUrl: buildTime.supabaseUrl,
    supabaseAnonKey: buildTime.supabaseAnonKey,
    apiBaseUrl: buildTime.apiBaseUrl,
    siteUrl: buildTime.siteUrl,
    webBaseUrl: buildTime.webBaseUrl,
    stripePublicKey: buildTime.stripePublicKey,
    telegramBotUsername: buildTime.telegramBotUsername,
    telegramBotLink: buildTime.telegramBotLink,
  };
}

export function hasSupabasePublicConfig(config: Pick<PublicRuntimeConfig, "supabaseUrl" | "supabaseAnonKey">) {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export function isSafePublicConfigPayload(value: unknown): value is PublicRuntimeConfig {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value);
  return keys.every((key) => (PUBLIC_CONFIG_KEYS as readonly string[]).includes(key));
}

async function fetchRuntimePublicConfig(): Promise<PublicRuntimeConfig> {
  const response = await fetch("/api/public-config", {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(CUSTOMER_AUTH_UNAVAILABLE_MESSAGE);
  const payload: unknown = await response.json();
  if (!isSafePublicConfigPayload(payload)) throw new Error(CUSTOMER_AUTH_UNAVAILABLE_MESSAGE);
  return payload;
}

export async function getBrowserPublicConfig(): Promise<PublicRuntimeConfig> {
  const buildTime = getBuildTimePublicConfig();
  if (hasSupabasePublicConfig(buildTime)) return buildTime;
  if (typeof window === "undefined") return buildTime;
  browserConfigPromise ||= fetchRuntimePublicConfig().catch((error) => {
    browserConfigPromise = null;
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase public runtime config could not be loaded for auth.", error);
    }
    throw error;
  });
  return browserConfigPromise;
}
