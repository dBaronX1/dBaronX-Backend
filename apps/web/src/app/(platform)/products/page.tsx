import Link from "next/link";

import { SectionHeader } from "@/components/platform/SectionHeader";
import { fetchMedusaStoreProducts, isVerifiedRealSupplierProduct, productDisplayPrice, productPrimaryImage } from "@/lib/medusa/store-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { products, reason } = await fetchMedusaStoreProducts({ limit: 20 });
  const realProducts = products.filter(isVerifiedRealSupplierProduct);
  const visibleProducts = realProducts.length ? realProducts : products;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="dBaronX Storefront"
        title="Products"
        description="Customer-safe product discovery backed by the Medusa Store API. Only verified real supplier products are promoted for first checkout."
      />

      {reason ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Product feed is not fully configured yet. Blocker: <code>{reason}</code>.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => {
          const verified = isVerifiedRealSupplierProduct(product);
          const image = productPrimaryImage(product);
          const href = `/products/${encodeURIComponent(String(product.handle || product.id || ""))}`;
          return (
            <article key={String(product.id || product.handle)} className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              {image ? <img src={image} alt="" className="h-64 w-full object-cover" /> : <div className="flex h-64 items-center justify-center bg-neutral-100 text-sm text-neutral-500">Image pending</div>}
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {verified ? "REAL SUPPLIER • CHECKOUT READY" : "NOT READY FOR CHECKOUT"}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">{productDisplayPrice(product)}</span>
                </div>
                <h2 className="text-lg font-semibold text-neutral-950">{String(product.title || product.handle || "Untitled product")}</h2>
                <p className="line-clamp-3 text-sm text-neutral-600">{String(product.description || "Open the product page for checkout guidance and supplier-readiness details.")}</p>
                <Link className="rounded-full bg-neutral-950 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-neutral-800" href={href}>
                  View product and checkout path
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      {!visibleProducts.length ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
          No Store API products are currently visible. Seed and verify the CJ first product before sending a customer to checkout.
        </div>
      ) : null}
    </main>
  );
}
