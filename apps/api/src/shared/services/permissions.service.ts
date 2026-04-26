import { ForbiddenException, Injectable } from "@nestjs/common";

export type PermissionSubject = {
  role?: string;
  permissions?: string[];
  blocked?: boolean;
  [key: string]: unknown;
};

@Injectable()
export class PermissionsService {
  private normalizePermission(permission: string): string {
    return String(permission || "").trim().toLowerCase();
  }

  private normalizePermissions(permissions: unknown): string[] {
    if (!Array.isArray(permissions)) return [];
    return permissions
      .map((item) => this.normalizePermission(String(item)))
      .filter(Boolean);
  }

  isBlocked(subject: PermissionSubject | null | undefined): boolean {
    return Boolean(subject?.blocked);
  }

  isAdmin(subject: PermissionSubject | null | undefined): boolean {
    return String(subject?.role || "").trim().toLowerCase() === "admin";
  }

  hasPermission(
    subject: PermissionSubject | null | undefined,
    permission: string,
  ): boolean {
    if (!subject) return false;
    if (this.isAdmin(subject)) return true;

    const required = this.normalizePermission(permission);
    if (!required) return false;

    return this.normalizePermissions(subject.permissions).includes(required);
  }

  hasAnyPermission(
    subject: PermissionSubject | null | undefined,
    permissions: string[],
  ): boolean {
    return permissions.some((permission) =>
      this.hasPermission(subject, permission),
    );
  }

  hasAllPermissions(
    subject: PermissionSubject | null | undefined,
    permissions: string[],
  ): boolean {
    return permissions.every((permission) =>
      this.hasPermission(subject, permission),
    );
  }

  assertNotBlocked(subject: PermissionSubject | null | undefined): void {
    if (this.isBlocked(subject)) {
      throw new ForbiddenException({
        code: "USER_BLOCKED",
        error: "Forbidden",
        message: "This account is blocked",
      });
    }
  }

  requirePermission(
    subject: PermissionSubject | null | undefined,
    permission: string,
  ): true {
    this.assertNotBlocked(subject);

    if (!this.hasPermission(subject, permission)) {
      throw new ForbiddenException({
        code: "PERMISSION_DENIED",
        error: "Forbidden",
        message: `Missing required permission: ${permission}`,
      });
    }

    return true;
  }

  requireAnyPermission(
    subject: PermissionSubject | null | undefined,
    permissions: string[],
  ): true {
    this.assertNotBlocked(subject);

    if (!this.hasAnyPermission(subject, permissions)) {
      throw new ForbiddenException({
        code: "PERMISSION_DENIED",
        error: "Forbidden",
        message: "Missing one of the required permissions",
      });
    }

    return true;
  }
}
