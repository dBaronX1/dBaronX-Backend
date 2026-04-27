import { Injectable } from "@nestjs/common";
import { CacheTTLService } from "./cache-ttl.service";

@Injectable()
export class RedisCacheService {
  constructor(private readonly cache: CacheTTLService) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    this.cache.set<T>(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    this.cache.del(key);
  }
}
