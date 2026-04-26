import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

type RequestUser = {
  id?: string;
  sub?: string;
  role?: string;
  permissions?: string[];
  [key: string]: unknown;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      context?: Record<string, unknown>;
    }>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    const role = String(user.role || "").trim().toLowerCase();

    if (!role) {
      throw new ForbiddenException("User role not found");
    }

    const normalizedRequired = requiredRoles.map((item) =>
      String(item).trim().toLowerCase(),
    );

    if (!normalizedRequired.includes(role)) {
      throw new ForbiddenException("Insufficient role permissions");
    }

    request.context = {
      ...(request.context || {}),
      authorizedRole: role,
    };

    return true;
  }
}
