import { HttpStatus } from "@nestjs/common";

export type PublicAuthErrorCode =
  | "AUTH_TEMPORARILY_UNAVAILABLE"
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

export const AUTH_SAFE_MESSAGES: Record<PublicAuthErrorCode, string> = {
  AUTH_TEMPORARILY_UNAVAILABLE: "Account service is temporarily unavailable. Please try again.",
  INVALID_EMAIL: "We could not create your account right now. Please check your details and try again.",
  WEAK_PASSWORD: "Your password is too weak. Please use a stronger password.",
  PASSWORD_MISMATCH: "We could not create your account right now. Please check your details and try again.",
  EMAIL_ALREADY_REGISTERED: "This email is already registered. Please sign in instead.",
  INVALID_CREDENTIALS: "We could not sign you in. Please check your email and password.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SESSION_EXPIRED: "We could not sign you in. Please check your email and password.",
  PROFILE_CREATION_FAILED: "We could not create your account right now. Please check your details and try again.",
  VALIDATION_FAILED: "We could not create your account right now. Please check your details and try again.",
};

const providerMessageMatchers: Array<[RegExp, PublicAuthErrorCode, number]> = [
  [/already|registered|exists|duplicate/i, "EMAIL_ALREADY_REGISTERED", HttpStatus.CONFLICT],
  [/weak|password.*short|at least|characters/i, "WEAK_PASSWORD", HttpStatus.BAD_REQUEST],
  [/invalid.*credential|invalid login|email or password|invalid.*password/i, "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED],
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

export function mapSupabaseAuthError(error: unknown, fallback: PublicAuthErrorCode): PublicAuthError {
  const message = extractMessage(error);
  for (const [pattern, code, status] of providerMessageMatchers) {
    if (pattern.test(message)) return publicAuthError(code, status);
  }
  return publicAuthError(
    fallback === "INVALID_CREDENTIALS" ? "INVALID_CREDENTIALS" : "AUTH_TEMPORARILY_UNAVAILABLE",
    fallback === "INVALID_CREDENTIALS" ? HttpStatus.UNAUTHORIZED : HttpStatus.SERVICE_UNAVAILABLE,
  );
}

export function authErrorResponse(error: PublicAuthError) {
  return {
    success: false,
    errorCode: error.errorCode,
    message: error.message,
  };
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message || "");
  return String(error);
}
