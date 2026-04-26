import type { DbxPaymentStatus } from "../types/dbx-payment.types";

export interface DbxPaymentReadModel {
  id: string;
  reference: string;
  status: DbxPaymentStatus;
  userId: string | null;
  email: string;
  customerName: string;
  cartId: string;
  medusaOrderId: string | null;
  expectedUsdCents: number;
  expectedDbxBaseUnits: string;
  dbxMint: string;
  treasuryWallet: string;
  senderWallet: string | null;
  transactionSignature: string | null;
  expiresAt: string;
  verifiedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DbxPaymentReadModelQuery {
  reference?: string;
  cartId?: string;
  medusaOrderId?: string;
  email?: string;
  status?: DbxPaymentStatus;
  transactionSignature?: string;
  page: number;
  limit: number;
  sortBy: "created_at" | "updated_at" | "expires_at" | "status";
  sortDirection: "asc" | "desc";
}

export interface DbxPaymentReadModelPage {
  items: DbxPaymentReadModel[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}