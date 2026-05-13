export const REFERRAL_QUERY_KEYS = ["ref", "invite", "init"] as const;
export const AUTH_QUERY_KEYS = ["ref", "invite", "init", "next"] as const;
export type ReferralQueryKey = (typeof REFERRAL_QUERY_KEYS)[number];
export type ReferralCapture = Partial<Record<ReferralQueryKey, string>>;

export function captureReferralParams(params: Pick<URLSearchParams, "get">): ReferralCapture {
  return Object.fromEntries(
    REFERRAL_QUERY_KEYS.map((key) => [key, params.get(key)?.trim() || ""]).filter(([, value]) => value),
  ) as ReferralCapture;
}

export function referralMetadata(referral: ReferralCapture) {
  return {
    referral_code: referral.ref || undefined,
    invite_code: referral.invite || undefined,
    initiation_code: referral.init || undefined,
  };
}

export function appendReferralParams(path: string, referral: ReferralCapture) {
  const [pathname, rawQuery = ""] = path.split("?");
  const params = new URLSearchParams(rawQuery);
  for (const key of REFERRAL_QUERY_KEYS) {
    const value = referral[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function referralSearch(referral: ReferralCapture) {
  const params = new URLSearchParams();
  for (const key of REFERRAL_QUERY_KEYS) {
    const value = referral[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
