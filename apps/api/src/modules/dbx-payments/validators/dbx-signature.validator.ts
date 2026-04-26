import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class DbxSignatureValidator {
  private readonly base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;

  assertSignature(value: string): string {
    const signature = String(value || "").trim();

    if (!this.isValidSignature(signature)) {
      throw new BadRequestException({
        code: "INVALID_SOLANA_SIGNATURE",
        error: "BadRequest",
        message: "transactionSignature must be a valid Solana transaction signature",
      });
    }

    return signature;
  }

  isValidSignature(value: string): boolean {
    const signature = String(value || "").trim();

    if (signature.length < 64 || signature.length > 128) {
      return false;
    }

    return this.base58Regex.test(signature);
  }
}