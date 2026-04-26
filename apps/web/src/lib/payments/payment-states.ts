export type FrontendPaymentState =
  | "preflight"
  | "authorized"
  | "captured"
  | "settled"
  | "refunded"
  | "failed"
  | "review";

export interface PaymentStateDescriptor {
  key: FrontendPaymentState;
  label: string;
  helper: string;
  healthy: boolean;
}

export const PAYMENT_STATE_DESCRIPTORS: PaymentStateDescriptor[] = [
  {
    key: "preflight",
    label: "Preflight",
    helper: "Payment risk and policy checks are still running.",
    healthy: true,
  },
  {
    key: "authorized",
    label: "Authorized",
    helper: "Funds are authorized and waiting for capture/settlement.",
    healthy: true,
  },
  {
    key: "captured",
    label: "Captured",
    helper: "Payment was captured successfully.",
    healthy: true,
  },
  {
    key: "settled",
    label: "Settled",
    helper: "Payment is fully settled into backend accounting.",
    healthy: true,
  },
  {
    key: "refunded",
    label: "Refunded",
    helper: "Payment amount was returned to the customer.",
    healthy: false,
  },
  {
    key: "failed",
    label: "Failed",
    helper: "Payment failed and requires retry or intervention.",
    healthy: false,
  },
  {
    key: "review",
    label: "Under Review",
    helper: "Payment requires manual or automated risk review.",
    healthy: false,
  },
];

export function getPaymentStateDescriptor(
  state: string | null | undefined,
): PaymentStateDescriptor {
  return (
    PAYMENT_STATE_DESCRIPTORS.find((item) => item.key === state) ?? {
      key: "failed",
      label: String(state || "Unknown"),
      helper: "Unknown payment state returned by backend.",
      healthy: false,
    }
  );
}
