import { isBase58 } from "@/lib/dbx/dbx-wallet";

export function normalizeSolanaSignature(value: string): string {
  return String(value || "").trim();
}

export function isSolanaSignature(value: string): boolean {
  return isBase58(normalizeSolanaSignature(value), 64, 128);
}

export function assertSolanaSignature(value: string): string {
  const signature = normalizeSolanaSignature(value);

  if (!isSolanaSignature(signature)) {
    throw new Error("Enter a valid Solana transaction signature.");
  }

  return signature;
}

export function shortSolanaSignature(value: string, left = 8, right = 8): string {
  const signature = normalizeSolanaSignature(value);

  if (!signature) return "";
  if (signature.length <= left + right + 3) return signature;

  return `${signature.slice(0, left)}...${signature.slice(-right)}`;
}