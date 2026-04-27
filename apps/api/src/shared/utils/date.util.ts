export class DateUtil {
  static now(): Date {
    return new Date();
  }

  static nowIso(): string {
    return new Date().toISOString();
  }

  static todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }

  static startOfUtcDay(date: Date = new Date()): string {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  static endOfUtcDay(date: Date = new Date()): string {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d.toISOString();
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static isSameUtcDay(a: Date | string, b: Date | string): boolean {
    return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
  }

  static diffMs(a: Date | string | number, b: Date | string | number): number {
    return new Date(b).getTime() - new Date(a).getTime();
  }

  static diffSeconds(a: Date | string | number, b: Date | string | number): number {
    return Math.floor(this.diffMs(a, b) / 1000);
  }

  static isExpired(expiresAt: Date | string | number): boolean {
    return new Date(expiresAt).getTime() <= Date.now();
  }
}
