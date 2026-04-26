import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

type LockEntry = {
  token: string;
  expiresAt: number;
  owner?: string | null;
};

export type LockAcquireResult = {
  acquired: boolean;
  token?: string;
  expiresAt?: number;
  retryAfterMs?: number;
};

@Injectable()
export class LockService {
  private readonly locks = new Map<string, LockEntry>();

  acquire(key: string, ttlMs = 5_000, owner?: string | null): LockAcquireResult {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && now < existing.expiresAt) {
      return {
        acquired: false,
        retryAfterMs: Math.max(1, existing.expiresAt - now),
      };
    }

    const token = randomUUID();
    const expiresAt = now + Math.max(100, ttlMs);

    this.locks.set(key, {
      token,
      expiresAt,
      owner: owner || null,
    });

    return {
      acquired: true,
      token,
      expiresAt,
    };
  }

  refresh(key: string, token: string, ttlMs = 5_000): boolean {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (!existing) return false;
    if (existing.token !== token) return false;
    if (now >= existing.expiresAt) {
      this.locks.delete(key);
      return false;
    }

    existing.expiresAt = now + Math.max(100, ttlMs);
    return true;
  }

  release(key: string, token?: string): boolean {
    const existing = this.locks.get(key);
    if (!existing) return false;

    if (token && existing.token !== token) {
      return false;
    }

    this.locks.delete(key);
    return true;
  }

  isLocked(key: string): boolean {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (!existing) return false;

    if (now >= existing.expiresAt) {
      this.locks.delete(key);
      return false;
    }

    return true;
  }

  get(key: string): LockEntry | null {
    const existing = this.locks.get(key);
    if (!existing) return null;

    if (Date.now() >= existing.expiresAt) {
      this.locks.delete(key);
      return null;
    }

    return { ...existing };
  }

  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, lock] of this.locks.entries()) {
      if (now >= lock.expiresAt) {
        this.locks.delete(key);
        count += 1;
      }
    }

    return count;
  }

  size(): number {
    this.cleanup();
    return this.locks.size;
  }
}
