export class StringUtil {
  static slugify(value: string): string {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  static truncate(value: string, length = 120): string {
    const text = String(value || "");
    if (text.length <= length) return text;
    return `${text.slice(0, length)}...`;
  }

  static random(length = 8): string {
    return Math.random().toString(36).slice(2, 2 + length);
  }

  static nonEmpty(value: unknown, fallback = ""): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  static oneLine(value: string): string {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  static compact(value: unknown): string {
    return String(value ?? "").replace(/\s+/g, "").trim();
  }

  static normalizeEmail(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
  }
}
