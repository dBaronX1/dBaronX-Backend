const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_NESTJS_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_NEST_API_URL ||
    "",
  medusaBackendUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "",
  medusaPublishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getPublicEnv() {
  return {
    ...publicEnv,
    siteUrl: cleanBaseUrl(publicEnv.siteUrl),
    apiBaseUrl: cleanBaseUrl(publicEnv.apiBaseUrl),
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
