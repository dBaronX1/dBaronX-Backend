import { HttpStatus } from "@nestjs/common";

export type PublicAuthErrorCode =
  | "AUTH_TEMPORARILY_UNAVAILABLE"
  | "AUTH_DATABASE_USER_CREATION_FAILED"
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "PASSWORD_MISMATCH"
  | "EMAIL_ALREADY_REGISTERED"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "PROFILE_CREATION_FAILED"
  | "VALIDATION_FAILED";

export type PublicAuthError = {
  status: number;
  errorCode: PublicAuthErrorCode;
  message: string;
};

export const ALLOWED_PUBLIC_AUTH_ERROR_CODES: PublicAuthErrorCode[] = [
  "AUTH_TEMPORARILY_UNAVAILABLE",
  "AUTH_DATABASE_USER_CREATION_FAILED",
  "INVALID_EMAIL",
  "WEAK_PASSWORD",
  "PASSWORD_MISMATCH",
  "EMAIL_ALREADY_REGISTERED",
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "SESSION_EXPIRED",
  "PROFILE_CREATION_FAILED",
  "VALIDATION_FAILED",
];

export const AUTH_SAFE_MESSAGES: Record<PublicAuthErrorCode, string> = {
  AUTH_TEMPORARILY_UNAVAILABLE:
    "Account service is temporarily unavailable. Please try again.",
  AUTH_DATABASE_USER_CREATION_FAILED:
    "Account service is temporarily unavailable. Please try again.",
  INVALID_EMAIL: "Please enter a valid email address.",
  WEAK_PASSWORD: "Your password is too weak. Please use a stronger password.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  EMAIL_ALREADY_REGISTERED:
    "This email is already registered. Please log in instead.",
  INVALID_CREDENTIALS:
    "We could not log you in. Please check your email and password.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  PROFILE_CREATION_FAILED:
    "We could not finish creating your profile. Please try again.",
  VALIDATION_FAILED: "Please check your details and try again.",
};

const providerMessageMatchers: Array<[RegExp, PublicAuthErrorCode, number]> = [
  [
    /database error creating new user|database.*creating.*user|error.*creating.*user/i,
    "AUTH_DATABASE_USER_CREATION_FAILED",
    HttpStatus.SERVICE_UNAVAILABLE,
  ],
  [
    /already|registered|exists|duplicate|email_exists/i,
    "EMAIL_ALREADY_REGISTERED",
    HttpStatus.CONFLICT,
  ],
  [
    /weak|password.*short|at least|characters/i,
    "WEAK_PASSWORD",
    HttpStatus.BAD_REQUEST,
  ],
  [
    /email.*not.*confirm|confirm.*email|not.*confirmed/i,
    "AUTH_TEMPORARILY_UNAVAILABLE",
    HttpStatus.SERVICE_UNAVAILABLE,
  ],
  [
    /invalid.*credential|invalid login|email or password|invalid.*password/i,
    "INVALID_CREDENTIALS",
    HttpStatus.UNAUTHORIZED,
  ],
  [/rate|too many/i, "RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS],
  [/jwt|expired|session/i, "SESSION_EXPIRED", HttpStatus.UNAUTHORIZED],
];

export function publicAuthError(
  errorCode: PublicAuthErrorCode,
  status = HttpStatus.BAD_REQUEST,
): PublicAuthError {
  return {
    status,
    errorCode,
    message: AUTH_SAFE_MESSAGES[errorCode],
  };
}

export function mapSupabaseAuthError(
  error: unknown,
  fallback: PublicAuthErrorCode,
): PublicAuthError {
  const message = extractProviderMessageForMappingOnly(error);
  for (const [pattern, code, status] of providerMessageMatchers) {
    if (pattern.test(message)) return publicAuthError(code, status);
  }

  if (fallback === "INVALID_CREDENTIALS") {
    return publicAuthError("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
  }

  if (fallback === "SESSION_EXPIRED") {
    return publicAuthError("SESSION_EXPIRED", HttpStatus.UNAUTHORIZED);
  }

  return publicAuthError(
    "AUTH_TEMPORARILY_UNAVAILABLE",
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

export function mapSupabaseLoginError(error: unknown): PublicAuthError {
  const message = extractProviderMessageForMappingOnly(error);

  if (/rate|too many/i.test(message))
    return publicAuthError("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS);

  if (/invalid.*credential|invalid login|email or password|invalid.*password/i.test(message))
    return publicAuthError("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);

  if (/email.*not.*confirm|confirm.*email|not.*confirmed/i.test(message))
    return publicAuthError("AUTH_TEMPORARILY_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);

  if (/jwt|expired|session/i.test(message))
    return publicAuthError("SESSION_EXPIRED", HttpStatus.UNAUTHORIZED);

  if (/already|registered|exists|duplicate|email_exists/i.test(message))
    return publicAuthError("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);

  return publicAuthError("AUTH_TEMPORARILY_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
}

export function authErrorResponse(error: PublicAuthError) {
  return {
    success: false,
    errorCode: error.errorCode,
    code: error.errorCode,
    message: error.message,
  };
}

function extractProviderMessageForMappingOnly(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error)
    return String((error as { message?: unknown }).message || "");
  return String(error);
}
