import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

export type RequestContextStore = {
  requestId?: string;
  startedAt?: number;
  ip?: string;
  forwardedFor?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  actor?: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
    source?: string | null;
  } | null;
  [key: string]: unknown;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(initial: RequestContextStore, callback: () => T): T {
    return this.storage.run({ ...(initial || {}) }, callback);
  }

  set<K extends keyof RequestContextStore>(key: K, value: RequestContextStore[K]): void {
    const store = this.storage.getStore();
    if (!store) return;
    store[key] = value;
  }

  setMany(values: RequestContextStore): void {
    const store = this.storage.getStore();
    if (!store) return;

    for (const [key, value] of Object.entries(values)) {
      store[key] = value;
    }
  }

  get<T = unknown>(key: string): T | undefined {
    const store = this.storage.getStore();
    if (!store) return undefined;
    return store[key] as T | undefined;
  }

  getOrDefault<T = unknown>(key: string, fallback: T): T {
    const value = this.get<T>(key);
    return value === undefined ? fallback : value;
  }

  all(): RequestContextStore {
    const store = this.storage.getStore();
    return store ? { ...store } : {};
  }

  requestId(): string | null {
    return this.get<string>("requestId") || null;
  }

  actorId(): string | null {
    const actor = this.get<RequestContextStore["actor"]>("actor");
    return actor?.id ? String(actor.id) : null;
  }

  clear(): void {
    const store = this.storage.getStore();
    if (!store) return;

    for (const key of Object.keys(store)) {
      delete store[key];
    }
  }
}
