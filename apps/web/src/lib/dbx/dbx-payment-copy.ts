import type { DbxPaymentInstruction } from "@/types/dbx/dbx-payment.types";

export function buildDbxInstructionText(instruction: DbxPaymentInstruction): string {
  return [
    "dBaronX DBX payment instruction",
    `Network: Solana`,
    `Token: DBX`,
    `Mint: ${instruction.tokenMint}`,
    `Treasury wallet: ${instruction.treasuryWallet}`,
    `Amount: ${instruction.amountDisplay} DBX`,
    `Base units: ${instruction.amountBaseUnits}`,
    `Reference: ${instruction.reference}`,
    `Expires: ${instruction.expiresAt}`,
  ].join("\n");
}

export function buildDbxWalletMemo(instruction: DbxPaymentInstruction): string {
  return `DBX payment ${instruction.reference}`;
}

export function buildExplorerUrl(signature: string): string {
  const clean = String(signature || "").trim();

  if (!clean) {
    return "";
  }

  return `https://solscan.io/tx/${encodeURIComponent(clean)}`;
}

export function buildMintExplorerUrl(mint: string): string {
  const clean = String(mint || "").trim();

  if (!clean) {
    return "";
  }

  return `https://solscan.io/token/${encodeURIComponent(clean)}`;
}