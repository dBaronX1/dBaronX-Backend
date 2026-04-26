export interface WalletEntity {
  id?: string;
  userId: string;
  balance: number;
  lockedBalance: number;
  updatedAt?: string;
}

export interface WalletTransactionEntity {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
  reference?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
