import type { DbxPaymentInstruction } from "@/types/dbx/dbx-payment.types";
import { DbxCopyButton } from "@/components/dbx/DbxCopyButton";
import { shortSolanaWallet } from "@/lib/dbx/dbx-wallet";
import { buildDbxInstructionText, buildMintExplorerUrl } from "@/lib/dbx/dbx-payment-copy";

interface DbxWalletInstructionProps {
  instruction: DbxPaymentInstruction;
  className?: string;
}

export function DbxWalletInstruction({
  instruction,
  className = "",
}: DbxWalletInstructionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-white/60">Treasury Wallet</span>
          <DbxCopyButton
            value={instruction.treasuryWallet}
            copyKey="dbx-treasury-wallet"
            ariaLabel="Copy DBX treasury wallet"
          />
        </div>
        <code className="block break-all text-xs text-white">
          {instruction.treasuryWallet}
        </code>
        <p className="mt-2 text-[11px] text-white/45">
          Short: {shortSolanaWallet(instruction.treasuryWallet)}
        </p>
      </div>

      <div className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-white/60">DBX Mint</span>
          <DbxCopyButton
            value={instruction.tokenMint}
            copyKey="dbx-mint"
            ariaLabel="Copy DBX token mint"
          />
        </div>
        <code className="block break-all text-xs text-white">{instruction.tokenMint}</code>
        <a
          href={buildMintExplorerUrl(instruction.tokenMint)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-[11px] font-semibold text-[#C084FC] underline-offset-4 hover:underline"
          aria-label="Open DBX mint on Solscan"
        >
          View token on Solscan
        </a>
      </div>

      <DbxCopyButton
        value={buildDbxInstructionText(instruction)}
        copyKey="dbx-full-instruction"
        label="Copy full payment instruction"
        copiedLabel="Instruction copied"
        className="w-full justify-center rounded-xl py-3 text-sm"
        ariaLabel="Copy full DBX payment instruction"
      />
    </div>
  );
}