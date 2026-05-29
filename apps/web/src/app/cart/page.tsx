import Link from "next/link";

import { DbxCard, DbxVisualShell, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ variant?: string; handle?: string }> }) {
  const params = await searchParams;
  const variant = String(params.variant || "").trim();
  const handle = String(params.handle || "").trim();
  const checkoutHref = variant
    ? `/checkout?variant=${encodeURIComponent(variant)}&handle=${encodeURIComponent(handle)}`
    : "/products";
  return (
    <DbxVisualShell title="Cart" description="Review your selected dBaronX product before checkout.">
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>Cart review</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          Cart and checkout stay connected to the backend/Medusa product variant. Rocket does not set fake stock, fake prices, fake payments, or fulfillment state.
        </p>
        {variant ? (
          <>
            <p style={{ color: "#fdba74", wordBreak: "break-word" }}>Selected variant: <code>{variant}</code></p>
            {handle ? <p style={{ color: "#fdba74", wordBreak: "break-word" }}>Product handle: <code>{handle}</code></p> : null}
            <Link href={checkoutHref} style={dbxButtonStyle}>Continue to checkout</Link>
          </>
        ) : (
          <>
            <p style={{ color: "#fdba74" }}>No variant is selected yet.</p>
            <Link href="/products" style={dbxButtonStyle}>Browse products</Link>
          </>
        )}
      </DbxCard>
    </DbxVisualShell>
  );
}
