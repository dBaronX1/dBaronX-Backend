import { Injectable, UnauthorizedException } from "@nestjs/common";
import { RedisCacheService } from "./cache.redis.service";
import { IdUtil } from "../utils/id.util";
import { HashUtil } from "../utils/hash.util";

export type AuthSessionRecord = {
  sessionId: string;
  userId: string;
  tokenHash: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
  userAgent: string | null;
  ip: string | null;
  metadata: Record<string, unknown>;
};

type CreateSessionInput = {
  userId: string;
  token: string;
  ttlSeconds?: number;
  userAgent?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class AuthSessionService {
  constructor(private readonly cache: RedisCacheService) {}

  private buildSessionKey(userId: string): string {
    return `auth:session:user:${userId}`;
  }

  private buildIndexKey(sessionId: string): string {
    return `auth:session:index:${sessionId}`;
  }

  private hashToken(token: string): string {
    return HashUtil.sha256(String(token || ""));
  }

  async createSession(input: CreateSessionInput): Promise<AuthSessionRecord> {
    const now = new Date();
    const ttlSeconds = Math.max(60, Number(input.ttlSeconds || DEFAULT_SESSION_TTL_SECONDS));
    const sessionId = IdUtil.prefixed("sess");
    const record: AuthSessionRecord = {
      sessionId,
      userId: String(input.userId),
      tokenHash: this.hashToken(input.token),
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      revokedAt: null,
      lastSeenAt: now.toISOString(),
      userAgent: input.userAgent || null,
      ip: input.ip || null,
      metadata: input.metadata || {},
    };

    await this.cache.set(this.buildSessionKey(record.userId), record, ttlSeconds);
    await this.cache.set(
      this.buildIndexKey(record.sessionId),
      { userId: record.userId },
      ttlSeconds,
    );

    return record;
  }

  async getSessionByUserId(userId: string): Promise<AuthSessionRecord | null> {
    return this.cache.get<AuthSessionRecord>(this.buildSessionKey(String(userId)));
  }

  async getSessionBySessionId(sessionId: string): Promise<AuthSessionRecord | null> {
    const index = await this.cache.get<{ userId: string }>(this.buildIndexKey(String(sessionId)));
    if (!index?.userId) return null;
    return this.getSessionByUserId(index.userId);
  }

  async validateActiveSession(userId: string, token: string): Promise<AuthSessionRecord> {
    const session = await this.getSessionByUserId(userId);

    if (!session) {
      throw new UnauthorizedException({
        code: "SESSION_NOT_FOUND",
        error: "Unauthorized",
        message: "Active session not found",
      });
    }

    if (session.revokedAt) {
      throw new UnauthorizedException({
        code: "SESSION_REVOKED",
        error: "Unauthorized",
        message: "Session has been revoked",
      });
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: "SESSION_EXPIRED",
        error: "Unauthorized",
        message: "Session has expired",
      });
    }

    if (session.tokenHash !== this.hashToken(token)) {
      throw new UnauthorizedException({
        code: "SESSION_TOKEN_MISMATCH",
        error: "Unauthorized",
        message: "Session token does not match active session",
      });
    }

    return session;
  }

  async touchSession(userId: string): Promise<void> {
    const session = await this.getSessionByUserId(userId);
    if (!session || session.revokedAt) return;

    const expiresAtMs = new Date(session.expiresAt).getTime();
    const remainingSeconds = Math.max(
      1,
      Math.floor((expiresAtMs - Date.now()) / 1000),
    );

    const updated: AuthSessionRecord = {
      ...session,
      lastSeenAt: new Date().toISOString(),
    };

    await this.cache.set(this.buildSessionKey(userId), updated, remainingSeconds);
    await this.cache.set(
      this.buildIndexKey(updated.sessionId),
      { userId: updated.userId },
      remainingSeconds,
    );
  }

  async revokeSession(userId: string): Promise<void> {
    const session = await this.getSessionByUserId(userId);
    if (!session) return;

    const revoked: AuthSessionRecord = {
      ...session,
      revokedAt: new Date().toISOString(),
    };

    await this.cache.del(this.buildSessionKey(userId));
    await this.cache.del(this.buildIndexKey(session.sessionId));

    const ttlSeconds = Math.max(
      60,
      Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
    );

    await this.cache.set(
      `auth:session:revoked:${session.sessionId}`,
      revoked,
      ttlSeconds,
    );
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const revoked = await this.cache.get<AuthSessionRecord>(
      `auth:session:revoked:${String(sessionId)}`,
    );
    return !!revoked;
  }
}
