export type PaymentProvider =
  | "stripe"
  | "paystack"
  | "flutterwave"
  | "paypal"
  | "binance_pay"
  | "coinbase"
  | "manual";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface PaymentEntity {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference?: string | null;
  rawResponse?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
}
