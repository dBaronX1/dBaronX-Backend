import { requireServerEnv, serverEnvNumber } from "@/server/runtime/server-env";

export interface NestApiConfig {
  baseUrl: string;
  timeoutMs: number;
  serviceName: string;
}

export function getNestApiConfig(): NestApiConfig {
  return {
    baseUrl: requireServerEnv([
      "NEST_API_URL",
      "NEXT_PUBLIC_NEST_API_URL",
      "NEXT_PUBLIC_API_URL",
    ]).replace(/\/+$/, ""),
    timeoutMs: serverEnvNumber("NEST_API_TIMEOUT_MS", 20000),
    serviceName: process.env.SERVICE_NAME || "dbaronx-web",
  };
}