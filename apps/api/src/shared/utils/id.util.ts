import { randomBytes, randomUUID } from "crypto";

export class IdUtil {
  static uuid(): string {
    return randomUUID();
  }

  static compactUuid(): string {
    return randomUUID().replace(/-/g, "");
  }

  static prefixed(prefix: string): string {
    const cleanPrefix = String(prefix || "id")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_:-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return `${cleanPrefix || "id"}_${this.compactUuid()}`;
  }

  static entropy(bytes = 12): string {
    return randomBytes(Math.max(8, bytes)).toString("hex");
  }

  static reference(prefix: string, bytes = 8): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${String(prefix || "REF").toUpperCase()}-${date}-${this.entropy(bytes).toUpperCase()}`;
  }

  static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim(),
    );
  }

  static isSafeExternalId(value: string): boolean {
    const text = String(value || "").trim();
    return text.length > 0 && text.length <= 160 && /^[a-zA-Z0-9._:@/-]+$/.test(text);
  }
}