#!/usr/bin/env node
const required = {
  eventType: "commerce.checkout.payment_verified",
  sourceModule: "commerce",
  paymentRail: "stripe",
  status: "verified",
  direction: "credit",
  metadata: {
    verifierEvidence: {
      verifier: "stripe",
      reference: "evt_or_pi_reference",
      verifiedAt: new Date().toISOString(),
    },
  },
};
console.log(JSON.stringify({ success: true, contract: required }, null, 2));
