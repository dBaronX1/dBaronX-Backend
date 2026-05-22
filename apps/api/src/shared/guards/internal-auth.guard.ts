import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash, timingSafeEqual } from "crypto";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { EnvUtil } from "../utils/env.util";

export const INTERNAL_AUTH_REQUIRED_KEY = "dbx:internal_auth_required";

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const internalAuthRequired = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_AUTH_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic && !internalAuthRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      context?: Record<string, unknown>;
    }>();

    const expectedToken = this.getExpectedToken();
    const providedInternal = this.extractHeader(request.headers, "x-internal-token")
      || this.extractHeader(request.headers, "x-dbxi-internal-token");
    const providedBearer = this.extractBearerToken(request.headers);
    const providedToken = providedInternal || providedBearer;

    if (!expectedToken || !providedToken || !this.safeCompare(providedToken, expectedToken)) {
      throw new UnauthorizedException({
        success: false,
        blocker: "unauthorized_internal_token",
        diagnostics: {
          expectedTokenConfigured: Boolean(expectedToken),
          receivedInternalHeader: Boolean(providedInternal),
          receivedBearerHeader: Boolean(providedBearer),
        },
      });
    }

    request.context = {
      ...(request.context || {}),
      authType: "internal",
    };

    return true;
  }

  private extractHeader(
    headers: Record<string, unknown>,
    name: string,
  ): string {
    const direct = headers[name];
    const fallback = headers[name.toLowerCase()];
    const raw = direct ?? fallback ?? "";

    if (Array.isArray(raw)) {
      return String(raw[0] || "").trim();
    }

    return String(raw || "").trim();
  }

  private getExpectedToken(): string {
    const aliases = ["INTERNAL_SERVICE_TOKEN", "DBX_INTERNAL_SERVICE_TOKEN", "API_INTERNAL_SERVICE_TOKEN", "NESTJS_INTERNAL_SERVICE_TOKEN"];
    for (const key of aliases) {
      const value = EnvUtil.getString(key, "").trim();
      if (value) return value;
    }
    return "";
  }

  private extractBearerToken(headers: Record<string, unknown>): string {
    const auth = this.extractHeader(headers, "authorization");
    if (!auth.toLowerCase().startsWith("bearer ")) return "";
    return auth.slice(7).trim();
  }

  private safeCompare(a: string, b: string): boolean {
    const aHash = createHash("sha256").update(a).digest();
    const bHash = createHash("sha256").update(b).digest();
    return timingSafeEqual(aHash, bHash);
  }
}
