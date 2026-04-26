import { Injectable } from "@nestjs/common";
import { DbxPaymentMapper } from "../mappers/dbx-payment.mapper";
import type { DbxPaymentIntentRecord } from "../types/dbx-payment.types";
import { DBX_PAYMENT_CONSTANTS } from "../constants/dbx-payment.constants";

@Injectable()
export class DbxPaymentPresenter {
  constructor(private readonly mapper: DbxPaymentMapper) {}

  intent(intent: DbxPaymentIntentRecord) {
    const view = this.mapper.toIntentView(intent);

    return {
      ...view,
      provider: DBX_PAYMENT_CONSTANTS.PROVIDER,
      instructions: {
        network: DBX_PAYMENT_CONSTANTS.NETWORK,
        tokenSymbol: DBX_PAYMENT_CONSTANTS.TOKEN_SYMBOL,
        tokenMint: view.dbxMint,
        decimals: DBX_PAYMENT_CONSTANTS.DECIMALS,
        treasuryWallet: view.treasuryWallet,
        amountBaseUnits: view.expectedDbxBaseUnits,
        amountDisplay: view.expectedDbxDisplay,
        reference: view.reference,
        expiresAt: view.expiresAt,
      },
    };
  }

  status(intent: DbxPaymentIntentRecord) {
    const view = this.mapper.toIntentView(intent);

    return {
      reference: view.reference,
      status: view.status,
      transactionSignature: view.transactionSignature,
      verifiedAt: view.verifiedAt,
      completedAt: view.completedAt,
      failureReason: view.failureReason,
      expiresAt: view.expiresAt,
    };
  }

  publicSummary(intent: DbxPaymentIntentRecord) {
    const view = this.mapper.toIntentView(intent);

    return {
      reference: view.reference,
      status: view.status,
      expectedDbxDisplay: view.expectedDbxDisplay,
      expiresAt: view.expiresAt,
      verifiedAt: view.verifiedAt,
      completedAt: view.completedAt,
    };
  }
}