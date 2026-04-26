export function serverEnvString(key: string, fallback = ""): string {
  const value = process.env[key];

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).trim();
}

export function serverEnvNumber(key: string, fallback: number): number {
  const value = Number(serverEnvString(key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

export function serverEnvBoolean(key: string, fallback = false): boolean {
  const raw = serverEnvString(key, "").toLowerCase();

  if (!raw) return fallback;
  if (["1", "true", "yes", "on", "enabled"].includes(raw)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(raw)) return false;

  return fallback;
}

export function requireServerEnv(keys: string[]): string {
  for (const key of keys) {
    const value = serverEnvString(key, "");
    if (value) return value;
  }

  throw new Error(`Missing required server environment variable. Expected one of: ${keys.join(", ")}`);
}