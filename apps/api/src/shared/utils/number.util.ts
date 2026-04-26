export class NumberUtil {
  static toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static toInteger(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  static round(value: number, decimals = 2): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    const factor = 10 ** Math.max(0, decimals);
    return Math.round(value * factor) / factor;
  }

  static centsToAmount(cents: number): number {
    return this.round(this.toInteger(cents, 0) / 100, 2);
  }

  static amountToCents(amount: number): number {
    return Math.round(this.toNumber(amount, 0) * 100);
  }

  static percentOf(value: number, percent: number): number {
    return this.round((this.toNumber(value, 0) * this.toNumber(percent, 0)) / 100, 2);
  }

  static basisPointsOf(value: number, basisPoints: number): number {
    return this.round((this.toNumber(value, 0) * this.toNumber(basisPoints, 0)) / 10_000, 2);
  }

  static integerString(value: unknown): string {
    const raw = String(value ?? "").trim();

    if (/^\d+$/.test(raw)) {
      return raw;
    }

    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return "0";
    }

    return Math.floor(parsed).toString();
  }

  static compareIntegerStrings(a: string, b: string): number {
    const left = BigInt(this.integerString(a));
    const right = BigInt(this.integerString(b));

    if (left > right) return 1;
    if (left < right) return -1;
    return 0;
  }

  static addIntegerStrings(a: string, b: string): string {
    return (BigInt(this.integerString(a)) + BigInt(this.integerString(b))).toString();
  }

  static subtractIntegerStrings(a: string, b: string): string {
    const result = BigInt(this.integerString(a)) - BigInt(this.integerString(b));
    return result < BigInt(0) ? "0" : result.toString();
  }
}