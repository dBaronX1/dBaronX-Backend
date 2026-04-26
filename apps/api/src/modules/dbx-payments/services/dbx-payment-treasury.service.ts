import { Injectable } from "@nestjs/common";
import { DbxPaymentConfig } from "../dbx-payment.config";
import { DbxWalletValidator } from "../validators/dbx-wallet.validator";
import { DBX_PAYMENT_CONSTANTS } from "../constants/dbx-payment.constants";

@Injectable()
export class DbxPaymentTreasuryService {
  constructor(
    private readonly config: DbxPaymentConfig,
    private readonly walletValidator: DbxWalletValidator,
  ) {}

  treasuryWallet(): string {
    return this.walletValidator.assertWallet(
      this.config.treasuryWallet,
      "DBX_TREASURY_WALLET",
    );
  }

  mintAddress(): string {
    return this.walletValidator.assertWallet(
      this.config.mintAddress || DBX_PAYMENT_CONSTANTS.MINT_ADDRESS,
      "DBX_MINT_ADDRESS",
    );
  }

  tokenIdentity() {
    return {
      name: DBX_PAYMENT_CONSTANTS.TOKEN_NAME,
      symbol: DBX_PAYMENT_CONSTANTS.TOKEN_SYMBOL,
      network: DBX_PAYMENT_CONSTANTS.NETWORK,
      mintAddress: this.mintAddress(),
      decimals: DBX_PAYMENT_CONSTANTS.DECIMALS,
      treasuryWallet: this.treasuryWallet(),
    };
  }
}