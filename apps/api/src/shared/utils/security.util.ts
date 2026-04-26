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

  static hashFingerprint(parts: Array<string | undefined | null>): string {
    const normalized = parts
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");

    return crypto.createHash("sha256").update(normalized).digest("hex");
  }
}
