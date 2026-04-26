import { requireServerEnv, serverEnvString } from "@/server/runtime/server-env";

export interface DbxProxyConfig {
  nestApiBaseUrl: string;
  requestTimeoutMs: number;
  maxBodyBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  allowGuestCheckout: boolean;
  dbxProxyEnabled: boolean;
}

export function getDbxProxyConfig(): DbxProxyConfig {
  return {
    nestApiBaseUrl: requireServerEnv([
      "NEST_API_URL",
      "NEXT_PUBLIC_NEST_API_URL",
      "NEXT_PUBLIC_API_URL",
    ]).replace(/\/+$/, ""),
    requestTimeoutMs: Number(serverEnvString("DBX_PROXY_TIMEOUT_MS", "20000")),
    maxBodyBytes: Number(serverEnvString("DBX_PROXY_MAX_BODY_BYTES", "65536")),
    rateLimitMax: Number(serverEnvString("DBX_PROXY_RATE_LIMIT_MAX", "60")),
    rateLimitWindowMs: Number(serverEnvString("DBX_PROXY_RATE_LIMIT_WINDOW_MS", "60000")),
    allowGuestCheckout: serverEnvString("DBX_PROXY_ALLOW_GUEST_CHECKOUT", "true") === "true",
    dbxProxyEnabled: serverEnvString("DBX_PROXY_ENABLED", "true") === "true",
  };
}