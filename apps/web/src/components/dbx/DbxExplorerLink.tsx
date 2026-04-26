import { buildExplorerUrl, buildMintExplorerUrl } from "@/lib/dbx/dbx-payment-copy";
import {
  shortSolanaSignature,
} from "@/lib/dbx/dbx-signature";
import { shortSolanaWallet } from "@/lib/dbx/dbx-wallet";

interface DbxExplorerLinkProps {
  value: string;
  type: "tx" | "token" | "address";
  label?: string;
  className?: string;
}

export function DbxExplorerLink({
  value,
  type,
  label,
  className = "",
}: DbxExplorerLinkProps) {
  const clean = String(value || "").trim();

  if (!clean) {
    return null;
  }

  const href =
    type === "tx"
      ? buildExplorerUrl(clean)
      : type === "token"
        ? buildMintExplorerUrl(clean)
        : `https://solscan.io/account/${encodeURIComponent(clean)}`;

  const display =
    label ||
    (type === "tx"
      ? shortSolanaSignature(clean)
      : shortSolanaWallet(clean));

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 text-xs font-semibold text-[#C084FC] underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 focus:ring-[#C084FC] ${className}`}
      aria-label={`Open ${type === "tx" ? "transaction" : type === "token" ? "token" : "wallet"} on Solscan`}
    >
      {display}
      <span aria-hidden="true">↗</span>
    </a>
  );
}