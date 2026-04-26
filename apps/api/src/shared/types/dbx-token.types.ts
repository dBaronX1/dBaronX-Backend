export type DbxNetwork = "solana";
export type DbxTokenSymbol = "DBX";

export interface DbxTokenIdentity {
  name: "dBaronX";
  symbol: DbxTokenSymbol;
  network: DbxNetwork;
  mintAddress: string;
  decimals: 9;
}

export interface DbxTokenAmount {
  baseUnits: string;
  decimals: 9;
  displayAmount: string;
  symbol: DbxTokenSymbol;
}

export interface DbxTreasuryConfig {
  treasuryWallet: string;
  mintAddress: string;
  decimals: 9;
  rpcUrl?: string;
}

export interface DbxSolanaTransfer {
  signature: string;
  mint: string;
  sender?: string | null;
  receiver: string;
  amountBaseUnits: string;
  decimals?: number | null;
  slot?: number | null;
  confirmationStatus?: "processed" | "confirmed" | "finalized" | string | null;
  err?: unknown;
}

export interface DbxPaymentInstruction {
  network: DbxNetwork;
  tokenSymbol: DbxTokenSymbol;
  tokenMint: string;
  decimals: 9;
  treasuryWallet: string;
  amountBaseUnits: string;
  amountDisplay: string;
  reference: string;
  expiresAt: string;
}