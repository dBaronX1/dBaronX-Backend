import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createRegionsWorkflow, createShippingProfilesWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows";

export default async function ensureCommercePrerequisites({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const created: string[] = [];
  const existing: string[] = [];
  const blockers: string[] = [];

  const regionsRes = await query.graph({ entity: "region", fields: ["id", "name", "currency_code"], pagination: { take: 50 } });
  let region: any = (regionsRes.data || []).find((r: any) => String(r?.currency_code || "").toLowerCase() === "usd") || (regionsRes.data || [])[0];
  if (!region?.id) {
    const createdRegion = await createRegionsWorkflow(container).run({ input: { regions: [{ name: "dBaronX Launch Region", currency_code: "usd", countries: ["us"], payment_providers: ["pp_system_default"] }] } });
    region = createdRegion.result?.[0];
    if (region?.id) created.push("region");
  } else existing.push("region");

  if (region?.id) {
    await updateStoresWorkflow(container).run({ input: { selector: {}, update: { default_region_id: region.id, supported_currencies: [{ currency_code: "usd", is_default: true }] } } });
  } else blockers.push("region_missing");

  const stockRes = await query.graph({ entity: "stock_location", fields: ["id", "name"], pagination: { take: 20 } });
  const stockLocation = (stockRes.data || [])[0];
  if (stockLocation?.id) existing.push("stock_location");
  else blockers.push("stock_location_missing");

  const profilesRes = await query.graph({ entity: "shipping_profile", fields: ["id", "name", "type"], pagination: { take: 20 } });
  let shippingProfile: any = (profilesRes.data || []).find((p: any) => p?.type === "default") || (profilesRes.data || [])[0];
  if (!shippingProfile?.id) {
    const createdProfiles = await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: "Default Shipping Profile", type: "default" }] } });
    shippingProfile = createdProfiles.result?.[0];
    if (shippingProfile?.id) created.push("shipping_profile");
  } else existing.push("shipping_profile");

  const shippingOptionsRes = await query.graph({ entity: "shipping_option", fields: ["id", "name"], pagination: { take: 20 } });
  const shippingOption: any = (shippingOptionsRes.data || [])[0];
  if (shippingOption?.id) existing.push("shipping_option");
  else blockers.push("shipping_option_missing");

  const productsRes = await query.graph({ entity: "product", fields: ["id", "title", "metadata", "variants.id", "variants.metadata", "variants.prices.id", "variants.prices.amount", "variants.prices.currency_code", "variants.inventory_quantity", "variants.manage_inventory"], pagination: { take: 100 } });

  const products = (productsRes.data || []) as any[];
  const variants = products.flatMap((product) => (Array.isArray(product?.variants) ? product.variants : []));
  const productCount = products.length;
  const variantCount = variants.length;

  if (productCount === 0) blockers.push("products_missing");
  if (variantCount === 0) blockers.push("variant_missing");

  const priceReady = variants.every((variant) =>
    Array.isArray(variant?.prices) && variant.prices.some((price: any) => Number(price?.amount || 0) > 0 && String(price?.currency_code || "").toLowerCase() === "usd"),
  );
  if (!priceReady) blockers.push("price_pending");

  const stockReady = variants.some((variant) => {
    const qty = Number(variant?.inventory_quantity ?? -1);
    const managed = Boolean(variant?.manage_inventory ?? false);
    return managed ? qty > 0 : true;
  });
  if (!stockReady) blockers.push("out_of_stock");

  const supplierMetadataReady = products.every((product) => {
    const pMeta = (product?.metadata || {}) as Record<string, unknown>;
    const hasProductSupplier = Boolean(pMeta.supplierRef || pMeta.supplier || pMeta.supplier_ref);
    const hasVariantSupplier = (Array.isArray(product?.variants) ? product.variants : []).some((variant: any) => {
      const vMeta = (variant?.metadata || {}) as Record<string, unknown>;
      return Boolean(vMeta.supplierRef || vMeta.supplier || vMeta.supplier_ref);
    });
    return hasProductSupplier || hasVariantSupplier;
  });
  if (!supplierMetadataReady) blockers.push("supplier_na");

  console.log(JSON.stringify({ success: blockers.length === 0, created, existing, blockers, regionId: region?.id ?? null, shippingOptionId: shippingOption?.id ?? null, stockLocationId: stockLocation?.id ?? null, productCount, variantCount, priceReady, stockReady, supplierMetadataReady }, null, 2));
}
