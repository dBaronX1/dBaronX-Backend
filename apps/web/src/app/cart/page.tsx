import { CartClient } from "@/components/dbx/CartClient";
import { DbxVisualShell } from "@/components/dbx/DbxVisualShell";
import { fetchServerStoreProducts } from "@/lib/store-products-server";
import { productPrimaryVariantId } from "@/lib/store-products";

export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ variant?: string; handle?: string }> }) {
  const params = await searchParams;
  const variant = String(params.variant || "").trim();
  const handle = String(params.handle || "").trim();
  const result = variant || handle ? await fetchServerStoreProducts({ handle: handle || undefined, limit: handle ? 5 : 24 }) : { products: [] };
  const product = "products" in result ? (handle ? result.products.find((item) => item.handle === handle) || result.products[0] || null : result.products.find((item) => productPrimaryVariantId(item) === variant) || null) : null;

  return (
    <DbxVisualShell title="Cart" description="Review cart images, quantities, selected items, and subtotals before secure checkout.">
      <CartClient initialItem={product} />
    </DbxVisualShell>
  );
}
