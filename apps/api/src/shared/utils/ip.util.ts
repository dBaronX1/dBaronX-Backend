export class IpUtil {
  static extract(
    headers: Record<string, unknown>,
    fallback = "",
  ): string {
    const forwarded = headers["x-forwarded-for"];
    const realIp = headers["x-real-ip"];
    const cfConnectingIp = headers["cf-connecting-ip"];

    const candidates = [
      cfConnectingIp,
      realIp,
      forwarded,
      fallback,
    ];

    for (const candidate of candidates) {
      const value = this.firstHeaderValue(candidate);
      if (!value) continue;

      const first = value.split(",")[0]?.trim();
      if (first) return first;
    }

    return "";
  }

  static normalize(raw: string): string {
    const value = String(raw || "").trim();

    if (!value) {
      return "";
    }

    if (value === "::1") {
      return "127.0.0.1";
    }

    if (value.startsWith("::ffff:")) {
      return value.replace("::ffff:", "");
    }

    return value;
  }

  static isPrivate(ip: string): boolean {
    const value = this.normalize(ip);

    return (
      value === "127.0.0.1" ||
      value.startsWith("10.") ||
      value.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(value)
    );
  }

  static firstHeaderValue(value: unknown): string {
    if (Array.isArray(value)) {
      return String(value[0] || "").trim();
    }

    return String(value || "").trim();
  }

  static fingerprintIp(ip: string): string {
    const normalized = this.normalize(ip);

    if (!normalized) {
      return "unknown";
    }

    const parts = normalized.split(".");

    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }

    return normalized.slice(0, 32);
  }
}