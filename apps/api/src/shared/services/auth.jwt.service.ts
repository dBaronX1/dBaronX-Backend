import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";

export type DbxJwtPayload = {
  sub: string;
  id?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  typ?: "access";
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
};

@Injectable()
export class AuthJwtService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get<string>("JWT_SECRET") ||
      process.env.JWT_SECRET ||
      "dbx-local-dev-secret";

    this.expiresIn =
      this.config.get<string>("JWT_EXPIRES") ||
      process.env.JWT_EXPIRES ||
      "7d";

    this.issuer =
      this.config.get<string>("app.name") ||
      process.env.APP_NAME ||
      "dbaronx-api";

    this.audience =
      this.config.get<string>("FRONTEND_URL") ||
      process.env.FRONTEND_URL ||
      "dbaronx";
  }

  sign(
    payload: Omit<DbxJwtPayload, "iat" | "exp" | "iss" | "aud" | "typ">,
  ): string {
    const normalized: DbxJwtPayload = {
      ...payload,
      sub: String(payload.sub || payload.id || "").trim(),
      id: String(payload.sub || payload.id || "").trim(),
      role: String(payload.role || "user").trim().toLowerCase(),
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      typ: "access",
      iss: this.issuer,
      aud: this.audience,
    };

    return jwt.sign(normalized, this.secret, {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: "HS256",
    });
  }

  verify(token: string): DbxJwtPayload {
    return jwt.verify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ["HS256"],
    }) as DbxJwtPayload;
  }

  decode(token: string): DbxJwtPayload | null {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded === "object"
      ? (decoded as DbxJwtPayload)
      : null;
  }
}
