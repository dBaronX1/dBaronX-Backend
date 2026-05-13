"use client";

import Image from "next/image";
import Link from "next/link";

import { useMedusaProducts } from "@/lib/hooks/useMedusaProducts";
import { productAvailabilityLabel, productDeliveryEstimate, productDisplayPrice, productPrimaryImage, type MedusaStoreProduct } from "@/lib/api/medusa-store-client";
import { RocketCard, rocketButtonStyle } from "@/components/rocket/RocketShell";

export function RocketProductGrid({ handle }: { handle?: string }) {
  const { products, loading, reason } = useMedusaProducts({ limit: handle ? 8 : 24, handle });
  const visible = handle ? products.filter((product) => product.handle === handle) : products;

  if (loading) return <RocketCard>Loading live store products…</RocketCard>;

  if (!visible.length) {
    return (
      <RocketCard>
        <h2 style={{ marginTop: 0 }}>Products are syncing</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
          Rocket UI is connected to the Medusa Store API. Product inventory is not visible yet{reason ? ` (${reason})` : ""}; customers see a safe launch message instead of raw server errors.
        </p>
        <Link href="/support" style={rocketButtonStyle}>Get launch support</Link>
      </RocketCard>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
      {visible.map((product) => <RocketProductCard key={product.id || product.handle || product.title} product={product} />)}
    </div>
  );
}

export function RocketProductCard({ product }: { product: MedusaStoreProduct }) {
  const image = productPrimaryImage(product) || "/assets/images/no_image.svg";
  const href = product.handle ? `/products/${product.handle}` : "/products";
  return (
    <RocketCard style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", minHeight: 230, background: "rgba(255,255,255,.06)" }}>
        <Image src={image} alt={product.title || "dBaronX product"} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} unoptimized={image.startsWith("http")} />
      </div>
      <div style={{ padding: 22, display: "grid", gap: 10 }}>
        <p style={{ margin: 0, color: "#fbbf24", fontWeight: 900 }}>{productAvailabilityLabel(product)}</p>
        <h2 style={{ margin: 0, fontSize: 24 }}>{product.title || "Launch product"}</h2>
        <p style={{ margin: 0, color: "#fed7aa", lineHeight: 1.6 }}>{product.description || "Verified supplier product prepared for Rocket checkout."}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 950 }}>{productDisplayPrice(product)}</p>
        <p style={{ margin: 0, color: "#fdba74" }}>Delivery: {productDeliveryEstimate(product)}</p>
        <Link href={href} style={rocketButtonStyle}>View product</Link>
      </div>
    </RocketCard>
  );
}
