import { CheckoutSessionPanel } from "@/components/dbx/CheckoutSessionPanel";
import { DbxVisualShell } from "@/components/dbx/DbxVisualShell";
import { fetchRocketStoreProducts } from "@/lib/store-products-server";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ variant?: string; handle?: string }> }) {
  const params = await searchParams;
  const handle = String(params.handle || "").trim();
  const variant = String(params.variant || "").trim();
  const result = handle ? await fetchRocketStoreProducts({ handle, limit: 5 }) : await fetchRocketStoreProducts({ limit: 1 });
  const product = handle ? result.products.find((item) => item.handle === handle) || result.products[0] || null : result.products[0] || null;

  return (
    <DbxVisualShell title="Checkout" description="Rocket sends normalized product and variant details to the NestJS API checkout session route.">
      <CheckoutSessionPanel product={product} requestedVariant={variant} />
    </DbxVisualShell>
  );
}
