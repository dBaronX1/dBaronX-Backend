export class PublicReferenceUtil {
  static fromRequestId(requestId: string): string {
    const normalized = String(requestId || "").replace(/[^a-zA-Z0-9]/g, "");
    const suffix = normalized.slice(-12) || `${Date.now()}`;

    return `ref_${suffix}`;
  }

  static normalize(value: string): string {
    const text = String(value || "").trim();
    if (!text) return this.fromRequestId("");

    const legacy = text.match(/^ref[-_:]?([a-z0-9]{1,64})$/i);
    if (legacy?.[1]) {
      return `ref_${legacy[1]}`;
    }

    return this.fromRequestId(text);
  }
}
