"use client";

import Image from "next/image";
import Link from "next/link";

import { productAvailabilityLabel, productDeliveryEstimate, productDisplayPrice, productPrimaryImage, productPrimaryVariantId, type StoreProduct, useStoreProducts } from "@/lib/store-products";
import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export function DbxProductGrid({ handle, initialProducts = [] }: { handle?: string; initialProducts?: StoreProduct[] }) {
  const { products, loading, reason, attemptedEndpoint } = useStoreProducts({ limit: handle ? 8 : 24, handle, initialProducts });
  const visible = handle ? products.filter((product) => product.handle === handle) : products;

  if (loading) return <DbxCard>Loading dBaronX products…</DbxCard>;

  if (!visible.length) {
    const fallbackMessage = reason ? "We could not load products right now. Please try again shortly or contact dBaronX support." : "Products are being prepared for launch. Please check back shortly or contact support.";
    return (
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>dBaronX products</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          {fallbackMessage}
        </p>
        {attemptedEndpoint ? (
          <p style={{ color: "#fdba74", lineHeight: 1.7, wordBreak: "break-word" }}>
            Attempted catalog endpoint: <code>{attemptedEndpoint}</code>
          </p>
        ) : null}
        <Link href="/support" style={dbxButtonStyle}>Contact support</Link>
      </DbxCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
      {visible.map((product) => <DbxProductCard key={product.id || product.handle || product.title} product={product} />)}
    </div>
  );
}

export function DbxProductCard({ product }: { product: StoreProduct }) {
  const image = productPrimaryImage(product) || "/assets/images/no_image.svg";
  const variantId = productPrimaryVariantId(product);
  const href = product.handle ? `/products/${product.handle}${variantId ? `?variant=${encodeURIComponent(variantId)}` : ""}` : "/products";
  return (
    <DbxCard style={{ padding: 0, overflow: "hidden" }} data-product-handle={product.handle || ""} data-product-variant-id={variantId}>
      <div style={{ position: "relative", minHeight: 230, background: "rgba(255,255,255,.06)" }}>
        <Image src={image} alt={product.title || "dBaronX product"} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} unoptimized={image.startsWith("http")} />
      </div>
      <div style={{ padding: 22, display: "grid", gap: 10 }}>
        <p style={{ margin: 0, color: "#fbbf24", fontWeight: 900 }}>{productAvailabilityLabel(product)}</p>
        <h2 style={{ margin: 0, fontSize: 24 }}>{product.title || "dBaronX product"}</h2>
        <p style={{ margin: 0, color: "#fed7aa", lineHeight: 1.6 }}>{product.description || "Verified dBaronX product."}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 950 }}>{productDisplayPrice(product)}</p>
        <p style={{ margin: 0, color: "#fdba74" }}>Handle: {product.handle || "product"}</p>
        <p style={{ margin: 0, color: "#fdba74" }}>Variant: {variantId || "Unavailable for checkout"}</p>
        <p style={{ margin: 0, color: "#fdba74" }}>Delivery: {productDeliveryEstimate(product)}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={href} style={dbxButtonStyle}>View product</Link>
          {variantId ? (
            <>
              <Link href={`/cart?variant=${encodeURIComponent(variantId)}&handle=${encodeURIComponent(String(product.handle || ""))}`} style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }} data-default-variant-id={variantId}>Add to Cart</Link>
              <Link href={`/checkout?variant=${encodeURIComponent(variantId)}&handle=${encodeURIComponent(String(product.handle || ""))}`} style={{ ...dbxButtonStyle, background: "rgba(251,191,36,.18)", color: "#fff7ed", border: "1px solid rgba(251,191,36,.35)" }} data-default-variant-id={variantId}>Buy Now</Link>
            </>
          ) : (
            <span style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fed7aa", border: "1px solid rgba(255,255,255,.16)", cursor: "not-allowed" }} data-default-variant-id="">Unavailable for checkout</span>
          )}
        </div>
      </div>
    </DbxCard>
  );
}
