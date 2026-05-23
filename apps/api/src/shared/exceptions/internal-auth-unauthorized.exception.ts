import { UnauthorizedException } from "@nestjs/common";

export type InternalAuthUnauthorizedSafePayload = {
  success: false;
  blocker: "unauthorized_internal_token";
  diagnostics: {
    expectedTokenConfigured: boolean;
    expectedTokenSource: string;
    configuredAliases: string[];
    aliasConflictPossible: boolean;
    receivedInternalHeader: boolean;
    receivedDbxInternalHeader: boolean;
    receivedBearerHeader: boolean;
    receivedAnyAcceptedHeader: boolean;
    normalizedHeaderNonEmpty: boolean;
    tokenMatched: false;
    diagnosticsMode: "custom_exception_v2";
    guardClass: "InternalAuthGuard";
    exceptionClass: "InternalAuthUnauthorizedException";
  };
};

export class InternalAuthUnauthorizedException extends UnauthorizedException {
  readonly safePayload: InternalAuthUnauthorizedSafePayload;

  constructor(safePayload: InternalAuthUnauthorizedSafePayload) {
    super(safePayload);
    this.safePayload = safePayload;
  }
}
