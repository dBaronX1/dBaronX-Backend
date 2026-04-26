import type { DbxPaymentStatus } from "../types/dbx-payment.types";

export class DbxPaymentInstructionDto {
  network!: "solana";
  tokenSymbol!: "DBX";
  tokenMint!: string;
  decimals!: 9;
  treasuryWallet!: string;
  amountBaseUnits!: string;
  amountDisplay!: string;
  reference!: string;
  expiresAt!: string;
}

export class DbxPaymentIntentResponseDto {
  id!: string;
  reference!: string;
  status!: DbxPaymentStatus;
  provider!: "dbx_solana";
  cartId!: string;
  medusaOrderId!: string | null;
  expectedUsdCents!: number;
  expectedDbxBaseUnits!: string;
  expectedDbxDisplay!: string;
  dbxMint!: string;
  treasuryWallet!: string;
  senderWallet!: string | null;
  transactionSignature!: string | null;
  expiresAt!: string;
  verifiedAt!: string | null;
  completedAt!: string | null;
  failureReason!: string | null;
  createdAt!: string;
  updatedAt!: string;
  instructions!: DbxPaymentInstructionDto;
}

export class DbxPaymentStatusResponseDto {
  reference!: string;
  status!: DbxPaymentStatus;
  transactionSignature!: string | null;
  verifiedAt!: string | null;
  completedAt!: string | null;
  failureReason!: string | null;
  expiresAt!: string;
}

export class DbxPaymentListResponseDto {
  items!: DbxPaymentIntentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasNextPage!: boolean;
}