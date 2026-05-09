import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { timingSafeEqual } from "crypto";
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

    const providedToken = this.extractHeader(
      request.headers,
      "x-internal-token",
    );

    const expectedToken = EnvUtil.getString("INTERNAL_SERVICE_TOKEN", "").trim();

    if (!expectedToken) {
      throw new UnauthorizedException("Internal auth not configured");
    }

    if (!providedToken) {
      throw new UnauthorizedException("Missing internal token");
    }

    if (!this.safeCompare(providedToken, expectedToken)) {
      throw new UnauthorizedException("Invalid internal token");
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

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
