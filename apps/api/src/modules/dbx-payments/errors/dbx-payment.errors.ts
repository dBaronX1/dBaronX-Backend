import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

export class DbxPaymentIntentNotFoundError extends NotFoundException {
  constructor(reference?: string) {
    super({
      code: "DBX_PAYMENT_INTENT_NOT_FOUND",
      error: "NotFound",
      message: "DBX payment intent not found",
      details: reference ? { reference } : undefined,
    });
  }
}

export class DbxPaymentInvalidTransitionError extends ConflictException {
  constructor(from: string, to: string) {
    super({
      code: "DBX_PAYMENT_INVALID_TRANSITION",
      error: "Conflict",
      message: `Invalid DBX payment status transition: ${from} → ${to}`,
      details: { from, to },
    });
  }
}

export class DbxPaymentExpiredError extends BadRequestException {
  constructor(reference: string, expiresAt: string) {
    super({
      code: "DBX_PAYMENT_INTENT_EXPIRED",
      error: "BadRequest",
      message: "DBX payment intent has expired",
      details: { reference, expiresAt },
    });
  }
}

export class DbxPaymentDuplicateSignatureError extends ConflictException {
  constructor(signature: string) {
    super({
      code: "DBX_PAYMENT_SIGNATURE_ALREADY_USED",
      error: "Conflict",
      message: "This Solana transaction signature is already attached to another DBX payment",
      details: { signature },
    });
  }
}

export class DbxPaymentVerificationFailedError extends BadRequestException {
  constructor(reason: string, details?: Record<string, unknown>) {
    super({
      code: "DBX_PAYMENT_VERIFICATION_FAILED",
      error: "BadRequest",
      message: "DBX payment verification failed",
      reason,
      details,
    });
  }
}

export class DbxPaymentRiskBlockedError extends ForbiddenException {
  constructor(reasons: string[], score?: number) {
    super({
      code: "DBX_PAYMENT_RISK_BLOCKED",
      error: "Forbidden",
      message: "DBX payment was blocked by risk policy",
      details: {
        reasons,
        score,
      },
    });
  }
}

export class DbxPaymentProviderUnavailableError extends ServiceUnavailableException {
  constructor(provider: string, details?: Record<string, unknown>) {
    super({
      code: "DBX_PAYMENT_PROVIDER_UNAVAILABLE",
      error: "ServiceUnavailable",
      message: `${provider} is unavailable`,
      details,
    });
  }
}