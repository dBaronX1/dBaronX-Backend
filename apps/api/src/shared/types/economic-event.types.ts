export type EconomicEventDirection = "credit" | "debit";
export type EconomicEventStatus = "pending" | "verified" | "settled" | "failed";

export type EconomicEventVerifierEvidence = {
  verifier: "stripe" | "dbx" | "manual";
  reference: string;
  verifiedAt: string;
};

export type EconomicEventInput = {
  eventType: string;
  sourceModule: "commerce" | "payments" | "wallet" | "affiliate" | "supplier" | string;
  paymentRail: "stripe" | "dbx" | string;
  status: EconomicEventStatus;
  direction: EconomicEventDirection;
  amount: number;
  currency: string;
  referenceId: string;
  idempotencyKey: string;
  metadata: {
    verifierEvidence: EconomicEventVerifierEvidence;
    [key: string]: unknown;
  };
};

export type EconomicEventPersistenceResult = {
  ready: boolean;
  persisted: boolean;
  duplicate: boolean;
  eventId: string | null;
  blockers: string[];
};
