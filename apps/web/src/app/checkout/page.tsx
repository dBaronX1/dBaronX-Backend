import Link from "next/link";

import { DbxCard, DbxVisualShell, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
import { StripeCheckoutPanel } from "@/components/dbx/StripeCheckoutPanel";
import { fetchServerStoreProducts } from "@/lib/store-products-server";
import { productPrimaryVariantId } from "@/lib/store-products";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ variant?: string; handle?: string }> }) {
  const params = await searchParams;
  const variant = String(params.variant || "").trim();
  const handle = String(params.handle || "").trim();
  const result = await fetchServerStoreProducts({ handle: handle || undefined, limit: handle ? 5 : 24 });
  const product = handle ? result.products.find((item) => item.handle === handle) || result.products[0] || null : result.products.find((item) => productPrimaryVariantId(item) === variant) || result.products[0] || null;
  const normalizedVariant = variant || productPrimaryVariantId(product);

  return (
    <DbxVisualShell title="Checkout" description="Enter your shipping details and continue to secure hosted payment.">
      {product && normalizedVariant ? (
        <StripeCheckoutPanel product={product} variantId={normalizedVariant} />
      ) : (
        <DbxCard>
          <h2 style={{ marginTop: 0 }}>Select a product first</h2>
          <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Checkout requires an available catalog product. Please choose a product and try again.</p>
          {result.reason ? <p style={{ color: "#fdba74" }}>Catalog status: {result.reason}</p> : null}
          <Link href="/products" style={dbxButtonStyle}>Browse products</Link>
        </DbxCard>
      )}
    </DbxVisualShell>
  );
}
