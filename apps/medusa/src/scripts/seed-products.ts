import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

type InputVariant = { title: string; sku: string; priceAmount: number; currencyCode: string; inventoryQuantity?: number };
type InputProduct = {
  title: string; description: string; handle: string; thumbnail?: string; images?: string[];
  categoryHandle?: string; collectionHandle?: string; variant: InputVariant;
  supplierRef?: string; delivery?: Record<string, unknown>; ecoTags?: string[];
};

type QueryGraphFn = (input: {
  entity: string;
  fields: string[];
  filters?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
}) => Promise<{ data: any[] }>;

const demoData: InputProduct[] = [
  { title: "Amonkyi Natural Soap (DEMO SEED)", description: "Demo seed product for soap lifecycle validation.", handle: "amonkyi-natural-soap-demo", thumbnail: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec", variant: { title: "Classic", sku: "DBX-DEMO-SOAP-001", priceAmount: 1200, currencyCode: "usd", inventoryQuantity: 50 }, supplierRef: "supplier-amonkyi-demo", delivery: { term: "standard", etaDays: 3 }, ecoTags: ["soap", "eco"] },
  { title: "dBaronX Eco Farm Product (DEMO SEED)", description: "Demo seed product for eco farm catalog wiring.", handle: "dbaronx-eco-farm-product-demo", thumbnail: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf", variant: { title: "Default", sku: "DBX-DEMO-FARM-001", priceAmount: 2200, currencyCode: "usd", inventoryQuantity: 30 }, supplierRef: "supplier-ecofarm-demo", delivery: { term: "cold_chain", etaDays: 2 }, ecoTags: ["farm", "eco"] },
  { title: "Recycled Eco Product (DEMO SEED)", description: "Demo seed product for recycling category visibility.", handle: "recycled-eco-product-demo", thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b", variant: { title: "Default", sku: "DBX-DEMO-RECYCLE-001", priceAmount: 1800, currencyCode: "usd", inventoryQuantity: 20 }, supplierRef: "supplier-recycle-demo", delivery: { term: "ground", etaDays: 5 }, ecoTags: ["recycling", "eco"] },
];

function parseProductsArg(): { products: InputProduct[]; source: string } {
  const fileArg = process.argv.find((x) => x.startsWith("--file="));
  if (!fileArg) return { products: demoData, source: "internal-demo-seed" };
  const fs = require("node:fs");
  const filePath = fileArg.split("=")[1];
  const raw = fs.readFileSync(filePath, "utf8");
  return { products: JSON.parse(raw), source: filePath };
}

export default async function seedProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve<QueryGraphFn>(ContainerRegistrationKeys.QUERY);
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun") || process.env.DRY_RUN === "true";
  const { products, source } = parseProductsArg();

  const existingProducts = await query({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: products.map((p) => p.handle) },
    pagination: { take: products.length || 100 },
  });

  const existingHandles = new Set(existingProducts.data.map((p: any) => p.handle));
  const candidates = products.filter((p) => !existingHandles.has(p.handle));

  if (!candidates.length) {
    logger.info(`No products to seed. Source=${source}. Existing handles matched all inputs.`);
    console.log(JSON.stringify({ success: true, source, createdCount: 0, skippedCount: products.length }, null, 2));
    return;
  }

  const salesChannels = await query({
    entity: "sales_channel",
    fields: ["id", "name", "is_default"],
    pagination: { take: 20 },
  });

  const defaultSalesChannel =
    salesChannels.data.find((sc: any) => sc.is_default) || salesChannels.data[0] || null;

  const shippingProfiles = await query({
    entity: "shipping_profile",
    fields: ["id", "name", "type"],
    pagination: { take: 20 },
  });
  const shippingProfile =
    shippingProfiles.data.find((sp: any) => sp.type === "default") || shippingProfiles.data[0] || null;

  const stockLocations = await query({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { take: 20 },
  });
  const stockLocation = stockLocations.data[0] || null;

  const normalized = candidates.map((p) => ({
    title: p.title,
    description: p.description,
    handle: p.handle,
    thumbnail: p.thumbnail,
    images: (p.images || (p.thumbnail ? [p.thumbnail] : [])).map((url) => ({ url })),
    status: "published" as const,
    sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : [],
    shipping_profile_id: shippingProfile?.id,
    options: [{ title: "Variant", values: [p.variant.title] }],
    metadata: {
      seedType: source === "internal-demo-seed" ? "demo" : "external-import",
      supplierRef: p.supplierRef || null,
      categoryHandle: p.categoryHandle || null,
      collectionHandle: p.collectionHandle || null,
      delivery: p.delivery || null,
      ecoTags: p.ecoTags || [],
    },
    variants: [{ title: p.variant.title, sku: p.variant.sku, manage_inventory: true, prices: [{ amount: p.variant.priceAmount, currency_code: p.variant.currencyCode.toLowerCase() }], options: { Variant: p.variant.title } }],
  }));

  if (dryRun) {
    logger.info(`Dry run only. Source=${source}. ToCreate=${normalized.length}. Skipped=${products.length - normalized.length}`);
    console.log(JSON.stringify({ dryRun: true, source, toCreateCount: normalized.length, skippedCount: products.length - normalized.length, products: normalized }, null, 2));
    return;
  }

  const created = await createProductsWorkflow(container).run({ input: { products: normalized } });
  const inventoryLevels = created.result.flatMap((product: any, idx: number) => (product.variants || []).map((variant: any) => ({ inventory_item_id: variant.inventory_items?.[0]?.id, location_id: stockLocation?.id, stocked_quantity: candidates[idx].variant.inventoryQuantity || 0 }))).filter((x: any) => x.inventory_item_id && x.location_id);
  if (inventoryLevels.length) await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: inventoryLevels } });

  console.log(JSON.stringify({ success: true, source, createdCount: created.result.length, skippedCount: products.length - normalized.length }, null, 2));
}
