export class EnvUtil {
  static getString(key: string, fallback = ""): string {
    const value = process.env[key];
    return typeof value === "string" ? value : fallback;
  }

  static getNumber(key: string, fallback = 0): number {
    const raw = process.env[key];
    if (raw === undefined || raw === null || raw === "") return fallback;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static getBoolean(key: string, fallback = false): boolean {
    const raw = String(process.env[key] ?? "").trim().toLowerCase();

    if (!raw) return fallback;
    if (["1", "true", "yes", "on"].includes(raw)) return true;
    if (["0", "false", "no", "off"].includes(raw)) return false;

    return fallback;
  }

  static getArray(key: string, delimiter = ","): string[] {
    const raw = this.getString(key, "");
    return raw
      .split(delimiter)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  static require(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  static requireNumber(key: string): number {
    const value = this.require(key);
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }

    return parsed;
  }
}
