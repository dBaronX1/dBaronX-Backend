import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "dbx:roles";

/**
 * Role gate metadata for coarse-grained route access.
 * Fine-grained permission checks should still happen inside services or policies.
 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
