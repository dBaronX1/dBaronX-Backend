import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class DbxWalletValidator {
  private readonly base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;

  assertWallet(value: string, fieldName = "wallet"): string {
    const wallet = String(value || "").trim();

    if (!this.isValidWallet(wallet)) {
      throw new BadRequestException({
        code: "INVALID_SOLANA_WALLET",
        error: "BadRequest",
        message: `${fieldName} must be a valid Solana base58 wallet address`,
      });
    }

    return wallet;
  }

  optionalWallet(value?: string | null, fieldName = "wallet"): string | null {
    if (!value) return null;
    return this.assertWallet(value, fieldName);
  }

  isValidWallet(value: string): boolean {
    const wallet = String(value || "").trim();

    if (wallet.length < 32 || wallet.length > 44) {
      return false;
    }

    return this.base58Regex.test(wallet);
  }
}