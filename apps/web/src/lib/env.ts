const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_NESTJS_BASE_URL || "",
  nestjsBaseUrl: process.env.NEXT_PUBLIC_NESTJS_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "",
  fastapiBaseUrl: process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "",
  medusaBackendUrl: process.env.NEXT_PUBLIC_MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "",
  medusaPublishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || "",
  webBaseUrl: process.env.NEXT_PUBLIC_WEB_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
  telegramBotUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "",
  telegramBotLink: process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK || "",
};

const PUBLIC_ENV_NAMES = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_NESTJS_BASE_URL",
  "NEXT_PUBLIC_FASTAPI_BASE_URL",
  "NEXT_PUBLIC_MEDUSA_BASE_URL",
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLIC_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_WEB_BASE_URL",
  "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME",
  "NEXT_PUBLIC_TELEGRAM_BOT_LINK",
] as const;

let loggedMissingPublicEnv = false;

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function logMissingPublicEnvInDevelopment() {
  if (loggedMissingPublicEnv || typeof window === "undefined" || process.env.NODE_ENV !== "development") return;
  const missing = PUBLIC_ENV_NAMES.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.info("dBaronX public environment values not configured for local development:", missing.join(", "));
  }
  loggedMissingPublicEnv = true;
}

export function getPublicEnv() {
  logMissingPublicEnvInDevelopment();
  return {
    ...publicEnv,
    siteUrl: cleanBaseUrl(publicEnv.siteUrl),
    webBaseUrl: cleanBaseUrl(publicEnv.webBaseUrl),
    apiBaseUrl: cleanBaseUrl(publicEnv.apiBaseUrl),
    nestjsBaseUrl: cleanBaseUrl(publicEnv.nestjsBaseUrl),
    fastapiBaseUrl: cleanBaseUrl(publicEnv.fastapiBaseUrl),
    medusaBackendUrl: cleanBaseUrl(publicEnv.medusaBackendUrl),
  };
}

export function requirePublicEnv(name: keyof ReturnType<typeof getPublicEnv>) {
  const value = getPublicEnv()[name];
  if (!value) throw new Error(`Missing required public env: ${name}`);
  return value;
}

export function getBrowserOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function resolveAuthRedirect(path = "/auth/callback") {
  const env = getPublicEnv();
  const base = env.siteUrl || getBrowserOrigin();
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
