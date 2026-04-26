export class HttpUtil {
  static isSuccessStatus(status: number): boolean {
    return status >= 200 && status < 300;
  }

  static isRetryableStatus(status: number): boolean {
    return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
  }

  static bearer(token: string): string {
    return `Bearer ${token}`;
  }

  static jsonHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(extra || {}),
    };
  }

  static buildQuery(params: Record<string, unknown>): string {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(key, String(value));
    }

    const query = search.toString();
    return query ? `?${query}` : "";
  }

  static redactHeaders(
    headers: Record<string, unknown>,
    secrets: string[] = ["authorization", "x-internal-token", "cookie"],
  ): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers || {})) {
      output[key] = secrets.includes(key.toLowerCase()) ? "[REDACTED]" : value;
    }

    return output;
  }
}
