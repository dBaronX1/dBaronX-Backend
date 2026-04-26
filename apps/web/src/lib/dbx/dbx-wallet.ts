const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function isBase58(value: string, minLength = 1, maxLength = 128): boolean {
  const clean = String(value || "").trim();

  if (clean.length < minLength || clean.length > maxLength) {
    return false;
  }

  for (const char of clean) {
    if (!BASE58_ALPHABET.includes(char)) {
      return false;
    }
  }

  return true;
}

export function isSolanaWallet(value: string): boolean {
  return isBase58(value, 32, 44);
}

export function normalizeSolanaWallet(value: string): string {
  return String(value || "").trim();
}

export function shortSolanaWallet(value: string, left = 6, right = 6): string {
  const wallet = normalizeSolanaWallet(value);

  if (!wallet) return "";
  if (wallet.length <= left + right + 3) return wallet;

  return `${wallet.slice(0, left)}...${wallet.slice(-right)}`;
}

export function assertSolanaWallet(value: string, fieldName = "Wallet"): string {
  const wallet = normalizeSolanaWallet(value);

  if (!isSolanaWallet(wallet)) {
    throw new Error(`${fieldName} must be a valid Solana wallet address.`);
  }

  return wallet;
}