export interface LedgerEntryEntity {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
  reference?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
