const DBX_DECIMALS = 9;

export function sanitizeIntegerString(value: string | number | bigint): string {
  const raw = String(value ?? "").trim();

  if (/^\d+$/.test(raw)) {
    return raw.replace(/^0+(?=\d)/, "") || "0";
  }

  return "0";
}

export function formatDbxBaseUnits(
  baseUnits: string | number | bigint,
  decimals = DBX_DECIMALS,
): string {
  const clean = sanitizeIntegerString(baseUnits);
  const padded = clean.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals).replace(/^0+(?=\d)/, "") || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

export function dbxDisplayAmount(
  baseUnits: string | number | bigint,
  options?: {
    decimals?: number;
    maxFractionDigits?: number;
    symbol?: boolean;
  },
): string {
  const decimals = options?.decimals ?? DBX_DECIMALS;
  const maxFractionDigits = options?.maxFractionDigits ?? 4;
  const formatted = formatDbxBaseUnits(baseUnits, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const visibleFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  const amount = visibleFraction ? `${whole}.${visibleFraction}` : whole;

  return options?.symbol === false ? amount : `${amount} DBX`;
}

export function compareDbxBaseUnits(
  left: string | number | bigint,
  right: string | number | bigint,
): number {
  const a = BigInt(sanitizeIntegerString(left));
  const b = BigInt(sanitizeIntegerString(right));

  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

export function isPositiveDbxBaseUnits(value: string | number | bigint): boolean {
  try {
    return BigInt(sanitizeIntegerString(value)) > BigInt(0);
  } catch {
    return false;
  }
}