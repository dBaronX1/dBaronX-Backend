import { Injectable } from "@nestjs/common";

export type DurationMetric = {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  lastMs: number;
};

export type MetricsSnapshot = {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  durations: Record<
    string,
    DurationMetric & {
      avgMs: number;
    }
  >;
  capturedAt: string;
};

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly durations = new Map<string, DurationMetric>();

  inc(name: string, by = 1): number {
    const key = this.normalizeName(name);
    const amount = this.safeNumber(by, 1);
    const next = (this.counters.get(key) || 0) + amount;
    this.counters.set(key, next);
    return next;
  }

  dec(name: string, by = 1): number {
    const key = this.normalizeName(name);
    const amount = this.safeNumber(by, 1);
    const next = (this.counters.get(key) || 0) - amount;
    this.counters.set(key, next);
    return next;
  }

  counter(name: string): number {
    return this.counters.get(this.normalizeName(name)) || 0;
  }

  setGauge(name: string, value: number): void {
    if (!Number.isFinite(value)) return;
    this.gauges.set(this.normalizeName(name), value);
  }

  gauge(name: string): number | null {
    return this.gauges.get(this.normalizeName(name)) ?? null;
  }

  observeDuration(name: string, valueMs: number): void {
    if (!Number.isFinite(valueMs) || valueMs < 0) return;

    const key = this.normalizeName(name);
    const current = this.durations.get(key);

    if (!current) {
      this.durations.set(key, {
        count: 1,
        totalMs: valueMs,
        minMs: valueMs,
        maxMs: valueMs,
        lastMs: valueMs,
      });
      return;
    }

    current.count += 1;
    current.totalMs += valueMs;
    current.lastMs = valueMs;
    current.minMs = Math.min(current.minMs, valueMs);
    current.maxMs = Math.max(current.maxMs, valueMs);
  }

  time<T>(name: string, fn: () => T): T {
    const startedAt = Date.now();

    try {
      return fn();
    } finally {
      this.observeDuration(name, Date.now() - startedAt);
    }
  }

  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();

    try {
      return await fn();
    } finally {
      this.observeDuration(name, Date.now() - startedAt);
    }
  }

  snapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const durations: MetricsSnapshot["durations"] = {};

    for (const [key, value] of this.counters.entries()) {
      counters[key] = value;
    }

    for (const [key, value] of this.gauges.entries()) {
      gauges[key] = value;
    }

    for (const [key, value] of this.durations.entries()) {
      durations[key] = {
        ...value,
        avgMs: value.count > 0 ? value.totalMs / value.count : 0,
      };
    }

    return {
      counters,
      gauges,
      durations,
      capturedAt: new Date().toISOString(),
    };
  }

  reset(name?: string): void {
    if (!name) {
      this.counters.clear();
      this.gauges.clear();
      this.durations.clear();
      return;
    }

    const key = this.normalizeName(name);
    this.counters.delete(key);
    this.gauges.delete(key);
    this.durations.delete(key);
  }

  private normalizeName(name: string): string {
    return String(name || "unknown")
      .trim()
      .replace(/[^a-zA-Z0-9_.:-]/g, "_")
      .slice(0, 160);
  }

  private safeNumber(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }
}
