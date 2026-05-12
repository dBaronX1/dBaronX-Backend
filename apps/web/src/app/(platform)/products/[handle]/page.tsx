import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/platform/SectionHeader";
import {
  fetchMedusaStoreProductByHandle,
  isVerifiedRealSupplierProduct,
  productAvailabilityLabel,
  productDeliveryEstimate,
  productDisplayPrice,
  productPrimaryImage,
} from "@/lib/medusa/store-client";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const { product, reason } = await fetchMedusaStoreProductByHandle(decodeURIComponent(handle));
  if (!product && !reason) notFound();

  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  const verified = isVerifiedRealSupplierProduct(product);
  const image = productPrimaryImage(product);
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  const sourceUrl = typeof metadata.sourceUrl === "string" && /^https?:\/\//.test(metadata.sourceUrl) ? metadata.sourceUrl : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="dBaronX Storefront"
        title={String(product?.title || "Product lookup")}
        description="Storefront product detail and first-checkout guidance. Checkout remains web/Stripe-hosted; Telegram stays read-only."
      />

      {reason ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Product lookup is not fully configured yet. Blocker: <code>{reason}</code>.
        </div>
      ) : null}

      {product ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            {image ? <img src={image} alt="" className="h-[520px] w-full object-cover" /> : <div className="flex h-[520px] items-center justify-center bg-neutral-100 text-neutral-500">Product image pending</div>}
          </div>

          <aside className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {verified ? "Verified real supplier product" : "Not ready for checkout"}
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">Supplier-backed fulfillment</span>
            </div>

            <div>
              <p className="text-3xl font-semibold text-neutral-950">{productDisplayPrice(product)}</p>
              <p className="mt-2 text-sm text-neutral-600">{String(product.description || "Real supplier product details are loaded from the Medusa Store API.")}</p>
            </div>

            <dl className="grid gap-3 rounded-2xl bg-neutral-50 p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Handle</dt><dd className="text-right font-medium text-neutral-900">{String(product.handle || handle)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">SKU</dt><dd className="text-right font-medium text-neutral-900">{String(metadata.supplierSku || variant?.sku || "not public")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Checkout status</dt><dd className="text-right font-medium text-neutral-900">{String(metadata.supplierVerificationStatus || "not verified")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Availability</dt><dd className="text-right font-medium text-neutral-900">{productAvailabilityLabel(product)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-500">Delivery estimate</dt><dd className="text-right font-medium text-neutral-900">{productDeliveryEstimate(product)}</dd></div>
            </dl>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-semibold">Checkout path</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Add this product to the storefront cart when checkout controls are enabled.</li>
                <li>Choose the visible shipping option for the US checkout path.</li>
                <li>Pay only through the Stripe-hosted checkout page.</li>
                <li>Payment is not treated as paid until a signed Stripe webhook creates durable backend proof.</li>
              </ol>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/products" className="rounded-full border border-neutral-300 px-4 py-3 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50">Back to products</Link>
              {verified ? (
                <a href="#checkout-path" className="rounded-full bg-neutral-950 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800">Add-to-cart / Stripe checkout path</a>
              ) : (
                <span className="rounded-full bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-900">Checkout blocked until supplier verification is complete</span>
              )}
              {sourceUrl ? <a href={sourceUrl} rel="noreferrer" target="_blank" className="text-center text-xs font-medium text-neutral-500 underline">Supplier source reference</a> : null}
            </div>
          </aside>
        </section>
      ) : null}

      <section id="checkout-path" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-950">First Stripe checkout proof requirements</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Use the approved backend Stripe checkout-session endpoint from the storefront or controlled smoke. Do not mark payment paid from the browser, Telegram, or Medusa metadata; settlement requires signed webhook proof.
        </p>
      </section>
    </main>
  );
}
