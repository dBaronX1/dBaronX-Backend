export type StripeSecretKeyMode = "test" | "live" | "unknown" | "missing";

export function detectStripeSecretKeyMode(secretKey?: string | null): StripeSecretKeyMode {
  const normalizedSecretKey = String(secretKey || "").trim();
  if (!normalizedSecretKey) return "missing";
  if (normalizedSecretKey.startsWith("sk_test_")) return "test";
  if (normalizedSecretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}
