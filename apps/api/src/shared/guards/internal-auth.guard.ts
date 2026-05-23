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
  static readonly TOKEN_ALIASES = [
    "INTERNAL_SERVICE_TOKEN",
    "DBX_INTERNAL_SERVICE_TOKEN",
    "API_INTERNAL_SERVICE_TOKEN",
    "NESTJS_INTERNAL_SERVICE_TOKEN",
  ] as const;

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

    const expected = this.getExpectedToken();
    const receivedInternalHeader = this.extractHeader(request.headers, "x-internal-token");
    const receivedDbxInternalHeader = this.extractHeader(request.headers, "x-dbxi-internal-token");
    const providedInternal = receivedInternalHeader || receivedDbxInternalHeader;
    const providedBearer = this.extractBearerToken(request.headers);
    const providedToken = providedInternal || providedBearer;
    const matched = Boolean(expected.token && providedToken && this.safeCompare(providedToken, expected.token));

    if (!matched) {
      throw new UnauthorizedException({
        success: false,
        blocker: "unauthorized_internal_token",
        diagnostics: {
          expectedTokenConfigured: Boolean(expected.token),
          expectedTokenSource: expected.source,
          configuredAliases: expected.configuredAliases,
          aliasConflictPossible: expected.aliasConflictPossible,
          receivedInternalHeader: Boolean(receivedInternalHeader),
          receivedDbxInternalHeader: Boolean(receivedDbxInternalHeader),
          receivedBearerHeader: Boolean(providedBearer),
          receivedAnyAcceptedHeader: Boolean(providedInternal || providedBearer),
          normalizedHeaderNonEmpty: Boolean(providedToken),
          tokenMatched: false,
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

  static inspectTokenConfig(): {
    token: string;
    source: string;
    configuredAliases: string[];
    aliasConflictPossible: boolean;
  } {
    const configured = InternalAuthGuard.TOKEN_ALIASES
      .map((key) => ({ key, value: EnvUtil.getString(key, "").trim() }))
      .filter((entry) => Boolean(entry.value));
    const selected = configured[0];
    const selectedToken = selected?.value || "";
    const selectedSource = selected?.key || "none";
    const aliasConflictPossible = selectedSource === "INTERNAL_SERVICE_TOKEN"
      && configured.some((entry) => entry.key !== "INTERNAL_SERVICE_TOKEN" && entry.value !== selectedToken);
    return {
      token: selectedToken,
      source: selectedSource,
      configuredAliases: configured.map((entry) => entry.key),
      aliasConflictPossible,
    };
  }

  private getExpectedToken() {
    return InternalAuthGuard.inspectTokenConfig();
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
