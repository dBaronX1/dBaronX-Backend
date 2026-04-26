import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "dbx:is_public";

/**
 * Marks a route or controller as publicly accessible.
 *
 * Canonical rule:
 * - Public routes bypass JWT guard enforcement
 * - Internal guards still apply if explicitly used on the handler
 * - Intended for health, webhooks, public catalog, public discovery, and auth entrypoints
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
