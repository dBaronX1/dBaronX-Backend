import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

type RequestStore = Record<string, unknown>;

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestStore>();

  run<T>(initial: RequestStore, callback: () => T): T {
    return this.storage.run({ ...(initial || {}) }, callback);
  }

  set(key: string, value: unknown): void {
    const store = this.storage.getStore();
    if (!store) return;
    store[key] = value;
  }

  get<T = unknown>(key: string): T | undefined {
    const store = this.storage.getStore();
    if (!store) return undefined;
    return store[key] as T | undefined;
  }

  all(): RequestStore {
    const store = this.storage.getStore();
    return store ? { ...store } : {};
  }

  clear(): void {
    const store = this.storage.getStore();
    if (!store) return;

    for (const key of Object.keys(store)) {
      delete store[key];
    }
  }
}
