import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type CurrentUserShape = {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  [key: string]: unknown;
};

/**
 * Canonical current user extractor.
 *
 * Resolution order:
 * 1. request.user (set by JWT guard)
 * 2. request.auth.user
 *
 * Special behavior:
 * - If a property key is supplied, returns that property
 * - If absent, returns the full user object
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserShape | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserShape | undefined =
      request?.user || request?.auth?.user || undefined;

    if (!user) {
      return data ? undefined : null;
    }

    if (!data) {
      return user;
    }

    if (data === "id") {
      return user.id || user.sub || undefined;
    }

    return user[data];
  },
);
