import { Injectable } from "@nestjs/common";

type CacheEntry<T = unknown> = {
  value: T;
  expiresAt: number;
  createdAt: number;
};

@Injectable()
export class CacheTTLService {
  private readonly store = new Map<string, CacheEntry>();

  get<T = unknown>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlSeconds = 60): void {
    const ttlMs = Math.max(1, ttlSeconds) * 1000;
    const now = Date.now();

    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
    });

    this.cleanupIfNeeded();
  }

  del(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  remember<T>(key: string, ttlSeconds: number, factory: () => T): T {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const value = factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  async rememberAsync<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    this.cleanup();
    return this.store.size;
  }

  keys(): string[] {
    this.cleanup();
    return Array.from(this.store.keys());
  }

  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        count += 1;
      }
    }

    return count;
  }

  private cleanupIfNeeded(): void {
    if (this.store.size < 5000) return;
    this.cleanup();
  }
}
