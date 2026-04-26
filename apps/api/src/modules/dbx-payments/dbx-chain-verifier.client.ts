import {
  BadGatewayException,
  Injectable,
} from "@nestjs/common";
import { DbxPaymentConfig } from "./dbx-payment.config";
import {
  DbxChainVerificationRequest,
  DbxChainVerificationResponse,
} from "./types/dbx-payment.types";

@Injectable()
export class DbxChainVerifierClient {
  constructor(private readonly config: DbxPaymentConfig) {}

  async verify(
    payload: DbxChainVerificationRequest,
  ): Promise<DbxChainVerificationResponse> {
    const response = await fetch(`${this.config.fastApiBaseUrl}/internal/dbx/verify-payment`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-service-token": this.config.internalServiceToken,
        "x-service-name": "dbaronx-api",
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      throw new BadGatewayException({
        code: "FASTAPI_DBX_VERIFY_UNREACHABLE",
        message: error instanceof Error ? error.message : "FastAPI verification unavailable",
      });
    });

    const json = (await response.json().catch(() => null)) as
      | DbxChainVerificationResponse
      | null;

    if (!response.ok || !json) {
      throw new BadGatewayException({
        code: "FASTAPI_DBX_VERIFY_FAILED",
        statusCode: response.status,
        message: "DBX chain verification service failed",
        details: json,
      });
    }

    return json;
  }
}
