import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class PublicGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    if (req.user) {
      return true;
    }

    throw new UnauthorizedException("Authentication required");
  }
}
