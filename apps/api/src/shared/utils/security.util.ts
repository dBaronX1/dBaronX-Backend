import * as crypto from "crypto";

export class SecurityUtil {
  static maskEmail(email: string): string {
    const [name, domain] = String(email || "").split("@");
    if (!name || !domain) return email;

    if (name.length <= 2) {
      return `**@${domain}`;
    }

    return `${name.slice(0, 2)}***@${domain}`;
  }

  static sanitizeText(value: string): string {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\u0000/g, "")
      .trim();
  }

  static safeCompare(a: string, b: string): boolean {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));

    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  }

  static sha256(value: string): string {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex");
  }

  static redactObject(payload: Record<string, unknown>): Record<string, unknown> {
    const blocked = [
      "password",
      "token",
      "authorization",
      "secret",
      "cookie",
      "set-cookie",
      "x-internal-token",
    ];

    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload || {})) {
      const lower = key.toLowerCase();

      if (blocked.some((needle) => lower.includes(needle))) {
        out[key] = "[REDACTED]";
        continue;
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = this.redactObject(value as Record<string, unknown>);
        continue;
      }

      out[key] = value;
    }

    return out;
  }

  static hashFingerprint(parts: Array<string | undefined | null>): string {
    const normalized = parts
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");

    return this.sha256(normalized);
  }
}
