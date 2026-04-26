import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StorefrontCatalogCards } from "@/components/platform/StorefrontCatalogCards";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getStorefrontCatalogSummary } from "@/lib/storefront/storefront-api";

export const dynamic = "force-dynamic";

export default async function StorefrontCatalogPage() {
  const summary = await getStorefrontCatalogSummary();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Storefront Catalog"
        title="Catalog Readiness Surface"
        description="Frontend catalog surface for mirrored products, variants, and launch-grade storefront hardening."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/storefront-catalog", label: "Catalog" },
          { href: "/ecommerce-dashboard", label: "Dashboard" },
          { href: "/storefront-launch", label: "Launch" },
          { href: "/orders", label: "Orders" },
        ]}
      />

      <StorefrontCatalogCards summary={summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Recent Products" payload={summary.recentProducts} />
        <JsonPanel title="Recent Variants" payload={summary.recentVariants} />
      </section>
    </main>
  );
}
