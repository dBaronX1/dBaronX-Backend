import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createRegionsWorkflow, createShippingProfilesWorkflow, linkSalesChannelsToStockLocationWorkflow, updateInventoryLevelsWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows";

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H";
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ";

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


  const salesChannelsRes = await query.graph({ entity: "sales_channel", fields: ["id", "name", "is_default", "stock_locations.id"], pagination: { take: 50 } });
  const salesChannels = (salesChannelsRes.data || []) as any[];
  const salesChannel =
    salesChannels.find((sc: any) => sc?.id === TARGET_SALES_CHANNEL_ID) ||
    salesChannels.find((sc: any) => sc?.is_default) ||
    salesChannels.find((sc: any) => String(sc?.name || "").toLowerCase().includes("default")) ||
    salesChannels[0];

  if (salesChannel?.id) existing.push("sales_channel");
  else blockers.push("sales_channel_missing");
  if (salesChannel?.id !== TARGET_SALES_CHANNEL_ID) blockers.push("sales_channel_mismatch");

  if (salesChannel?.id && stockLocation?.id) {
    const linked = (Array.isArray(salesChannel?.stock_locations) ? salesChannel.stock_locations : []).some((location: any) => location?.id === stockLocation.id);

    if (!linked) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: salesChannel.id, add: [stockLocation.id] } });
      created.push("sales_channel_stock_location_link");
    } else {
      existing.push("sales_channel_stock_location_link");
    }
  } else {
    blockers.push("sales_channel_stock_location_link_missing");
  }

  let inventoryItemId: string | null = null;
  let inventoryLevelReady = false;
  let salesChannelStockLocationLinked = false;

  if (salesChannel?.id && stockLocation?.id) {
    salesChannelStockLocationLinked = (Array.isArray(salesChannel?.stock_locations) ? salesChannel.stock_locations : []).some((location: any) => location?.id === stockLocation.id);
  }

  const variantRes = await query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.id"],
    filters: { id: TARGET_VARIANT_ID },
    pagination: { take: 1 },
  });
  const variant = (variantRes.data || [])[0] as { id: string; inventory_items?: { id: string }[] } | undefined;
  if (!variant?.id) blockers.push("variant_missing");
  inventoryItemId = variant?.inventory_items?.[0]?.id ?? null;
  if (!inventoryItemId) blockers.push("inventory_item_missing");

  if (inventoryItemId && stockLocation?.id) {
    const levelRes = await query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id", "stock_location_id"],
      filters: { inventory_item_id: inventoryItemId, stock_location_id: stockLocation.id },
      pagination: { take: 1 },
    });
    if (!(levelRes.data || [])[0]?.id) {
      await updateInventoryLevelsWorkflow(container).run({
        input: [{ inventory_item_id: inventoryItemId, location_id: stockLocation.id, stocked_quantity: 100 }],
      });
    }
    const verifyRes = await query.graph({
      entity: "inventory_level",
      fields: ["id"],
      filters: { inventory_item_id: inventoryItemId, stock_location_id: stockLocation.id },
      pagination: { take: 1 },
    });
    inventoryLevelReady = Boolean((verifyRes.data || [])[0]?.id);
    if (!inventoryLevelReady) blockers.push("inventory_level_missing");
  }

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

  console.log(JSON.stringify({ success: blockers.length === 0, salesChannelId: salesChannel?.id ?? null, stockLocationId: stockLocation?.id ?? null, variantId: TARGET_VARIANT_ID, inventoryItemId, inventoryLevelReady, salesChannelStockLocationLinked, created, existing, blockers, regionId: region?.id ?? null, shippingOptionId: shippingOption?.id ?? null, productCount, variantCount, priceReady, stockReady, supplierMetadataReady }, null, 2));
}
