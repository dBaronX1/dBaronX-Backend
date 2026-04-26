import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthJwtService } from "../services/auth.jwt.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

type JwtPayloadShape = {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: AuthJwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      user?: JwtPayloadShape;
      context?: Record<string, unknown>;
    }>();

    const authHeader = this.extractAuthorizationHeader(request.headers);

    if (!authHeader) {
      throw new UnauthorizedException("Missing authorization header");
    }

    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      throw new UnauthorizedException("Invalid authorization scheme");
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let decoded: JwtPayloadShape;
    try {
      decoded = this.jwt.verify(token) as JwtPayloadShape;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const normalizedUser: JwtPayloadShape = {
      ...decoded,
      id: String(decoded.sub || decoded.id || ""),
      sub: String(decoded.sub || decoded.id || ""),
      email: decoded.email ? String(decoded.email) : undefined,
      role: decoded.role ? String(decoded.role) : "user",
      permissions: Array.isArray(decoded.permissions)
        ? decoded.permissions.map((item) => String(item))
        : [],
    };

    if (!normalizedUser.id) {
      throw new UnauthorizedException("Token missing subject");
    }

    request.user = normalizedUser;
    request.context = {
      ...(request.context || {}),
      authType: "jwt",
      userId: normalizedUser.id,
      userRole: normalizedUser.role || "user",
    };

    return true;
  }

  private extractAuthorizationHeader(headers: Record<string, unknown>): string {
    const raw =
      headers.authorization ??
      headers.Authorization ??
      "";

    if (Array.isArray(raw)) {
      return String(raw[0] || "").trim();
    }

    return String(raw || "").trim();
  }
}
