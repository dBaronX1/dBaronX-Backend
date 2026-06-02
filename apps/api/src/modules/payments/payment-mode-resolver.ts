export type PaymentMode = "test" | "live" | "missing";
export type PaymentProviderName = "stripe" | "paystack";

export type PaymentModeResolution = {
  provider: PaymentProviderName;
  mode: PaymentMode;
  configured: boolean;
  secretKey: string;
  secretKeySource: string | null;
  testKeyPresent: boolean;
  liveKeyPresent: boolean;
  liveAllowed: boolean;
  blockers: string[];
};

type EnvReader = (key: string) => string | undefined | null;

const PAYMENT_SECRET_ENV_CONTRACT = [
  "STRIPE_TEST_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_LIVE_SECRET_KEY",
  "PAYSTACK_TEST_SECRET_KEY",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_LIVE_SECRET_KEY",
] as const;

function clean(value: unknown) {
  return String(value || "").trim();
}

function isTestKey(value: string) {
  return value.startsWith("sk_test_");
}

function isLiveKey(value: string) {
  return value.startsWith("sk_live_");
}

function paymentModeOverride(read: EnvReader): "test" | "live" | null {
  const mode = clean(read("DBX_PAYMENT_MODE")).toLowerCase();
  return mode === "test" || mode === "live" ? mode : null;
}

function liveCheckoutAllowed(read: EnvReader) {
  return clean(read("DBX_ALLOW_LIVE_CHECKOUT")).toLowerCase() === "true";
}

export function resolvePaymentMode(provider: PaymentProviderName, read: EnvReader): PaymentModeResolution {
  void PAYMENT_SECRET_ENV_CONTRACT;
  const prefix = provider.toUpperCase();
  const testKey = clean(read(`${prefix}_TEST_SECRET_KEY`));
  const sharedKey = clean(read(`${prefix}_SECRET_KEY`));
  const liveKey = clean(read(`${prefix}_LIVE_SECRET_KEY`));
  const override = paymentModeOverride(read);
  const liveAllowed = liveCheckoutAllowed(read);

  const sharedIsTest = isTestKey(sharedKey);
  const sharedIsLive = isLiveKey(sharedKey);
  const testKeyPresent = Boolean(testKey || sharedIsTest);
  const liveKeyPresent = Boolean(liveKey || sharedIsLive);
  const blockers: string[] = [];

  let mode: PaymentMode = "missing";
  let secretKey = "";
  let secretKeySource: string | null = null;

  if (override === "live") {
    if (testKeyPresent && !liveAllowed) blockers.push(`${provider}_live_checkout_requires_explicit_allowance_with_test_key_present`);
    if (liveKey) {
      mode = "live";
      secretKey = liveKey;
      secretKeySource = `${prefix}_LIVE_SECRET_KEY`;
    } else if (sharedIsLive) {
      mode = "live";
      secretKey = sharedKey;
      secretKeySource = `${prefix}_SECRET_KEY`;
    } else if (testKey || sharedIsTest) {
      mode = "test";
      secretKey = testKey || sharedKey;
      secretKeySource = testKey ? `${prefix}_TEST_SECRET_KEY` : `${prefix}_SECRET_KEY`;
      blockers.push(`${provider}_live_key_missing`);
    }
  } else if (override === "test") {
    if (testKey || sharedIsTest) {
      mode = "test";
      secretKey = testKey || sharedKey;
      secretKeySource = testKey ? `${prefix}_TEST_SECRET_KEY` : `${prefix}_SECRET_KEY`;
    } else if (liveKey || sharedIsLive) {
      mode = "live";
      secretKey = liveKey || sharedKey;
      secretKeySource = liveKey ? `${prefix}_LIVE_SECRET_KEY` : `${prefix}_SECRET_KEY`;
      blockers.push(`${provider}_test_key_missing_live_key_present`);
    }
  } else if (testKey) {
    mode = "test";
    secretKey = testKey;
    secretKeySource = `${prefix}_TEST_SECRET_KEY`;
  } else if (sharedIsTest) {
    mode = "test";
    secretKey = sharedKey;
    secretKeySource = `${prefix}_SECRET_KEY`;
  } else if (liveKey) {
    mode = "live";
    secretKey = liveKey;
    secretKeySource = `${prefix}_LIVE_SECRET_KEY`;
  } else if (sharedIsLive) {
    mode = "live";
    secretKey = sharedKey;
    secretKeySource = `${prefix}_SECRET_KEY`;
  } else if (sharedKey) {
    mode = "test";
    secretKey = sharedKey;
    secretKeySource = `${prefix}_SECRET_KEY`;
  }

  if (!secretKey) blockers.push(`${provider}_secret_key_missing`);

  return {
    provider,
    mode,
    configured: Boolean(secretKey) && blockers.length === 0,
    secretKey,
    secretKeySource,
    testKeyPresent,
    liveKeyPresent,
    liveAllowed,
    blockers: [...new Set(blockers)],
  };
}
