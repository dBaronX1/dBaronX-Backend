import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createProductsWorkflow, updateProductsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

const CONFIRM_ENV = "DBX_CONFIRM_CJ_PRODUCT_BATCH_SEED";

type BatchProduct = {
  title: string; handle: string; description: string; priceMinor: number; costMinor: number;
  supplier: "cj"; supplierProductId: string; supplierSku: string; sourceUrl: string; imageUrl: string;
  stockQty: number; shippingCountries: string[]; deliveryEstimate: string;
};

const DEFAULT_PRODUCTS: BatchProduct[] = [
  { title: "Men's Cotton Linen Long Sleeve Casual Shirt", handle: "mens-cotton-linen-long-sleeve-casual-shirt", description: "A breathable cotton linen long sleeve casual shirt for men's spring and autumn outfits.", priceMinor: 1999, costMinor: 419, supplier: "cj", supplierProductId: "2408300732091605000", supplierSku: "CJDS212420104DW", sourceUrl: "https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html", imageUrl: "https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp", stockQty: 32, shippingCountries: ["US"], deliveryEstimate: "7-15 business days" },
  { title: "Men's Solid Color Casual Drawstring Shorts", handle: "mens-solid-color-casual-drawstring-shorts", description: "Lightweight drawstring shorts designed for daily summer wear.", priceMinor: 2499, costMinor: 689, supplier: "cj", supplierProductId: "1714447731981490176", supplierSku: "CJNSXZDK00566-Black-M", sourceUrl: "https://cjdropshipping.com/product/mens-solid-color-casual-drawstring-shorts-p-1714447731981490176.html", imageUrl: "https://oss-cf.cjdropshipping.com/product/2023/09/28/08/4f8a640d-f9f4-4f95-92b8-3e4f1e704ff5.jpg", stockQty: 18, shippingCountries: ["US"], deliveryEstimate: "7-15 business days" },
  { title: "Men's Minimalist PU Crossbody Sling Bag", handle: "mens-minimalist-pu-crossbody-sling-bag", description: "Compact minimalist sling bag for daily essentials and travel.", priceMinor: 2999, costMinor: 913, supplier: "cj", supplierProductId: "1712715799554897920", supplierSku: "CJBHNSNS09227-Black", sourceUrl: "https://cjdropshipping.com/product/mens-minimalist-pu-crossbody-sling-bag-p-1712715799554897920.html", imageUrl: "https://oss-cf.cjdropshipping.com/product/2023/09/25/09/5b8a2aa7-24f7-4207-8cb0-f8a91c95991f.jpg", stockQty: 27, shippingCountries: ["US"], deliveryEstimate: "7-15 business days" },
];

const demoPattern = /\b(demo|mock|sample|test)\b/i;
const metadataOf = (p: BatchProduct) => ({ supplier: "cj", supplierProductId: p.supplierProductId, supplierSku: p.supplierSku, sourceUrl: p.sourceUrl, imageUrl: p.imageUrl, supplierCostAmount: p.costMinor, supplierCostCurrency: "usd", supplierCostUsdMinor: p.costMinor, realSupplierProduct: true, demo: false, supplierVerificationStatus: "verified_for_checkout", supplierVerificationBlockers: [], blockers: [], shippingCountries: p.shippingCountries, deliveryEstimate: p.deliveryEstimate });

function fail(error: string, details: Record<string, unknown> = {}): never { console.error(JSON.stringify({ success: false, error, ...details }, null, 2)); process.exit(1); }
function parseInput(): BatchProduct[] {
  if (process.env[CONFIRM_ENV] !== "true") fail("DBX_CONFIRM_CJ_PRODUCT_BATCH_SEED_required", { requiredEnv: `${CONFIRM_ENV}=true` });
  if (!process.env.DBX_CJ_VERIFIED_PRODUCTS_JSON) return DEFAULT_PRODUCTS;
  let parsed: unknown;
  try { parsed = JSON.parse(process.env.DBX_CJ_VERIFIED_PRODUCTS_JSON); } catch { fail("DBX_CJ_VERIFIED_PRODUCTS_JSON_invalid_json"); }
  if (!Array.isArray(parsed)) fail("DBX_CJ_VERIFIED_PRODUCTS_JSON_must_be_array");
  return parsed as BatchProduct[];
}
function validate(records: BatchProduct[]): BatchProduct[] {
  if (records.length < 2 || records.length > 4) fail("batch_size_must_be_between_2_and_4", { count: records.length });
  for (const p of records) {
    if (!p.title || !p.handle || !p.description || !p.priceMinor || !p.costMinor || !p.supplierProductId || !p.supplierSku || !p.sourceUrl || !p.imageUrl || !p.stockQty || !p.deliveryEstimate || !Array.isArray(p.shippingCountries) || p.shippingCountries.length === 0) fail("product_missing_required_fields", { handle: p?.handle || null });
    if (p.supplier !== "cj") fail("supplier_must_be_cj", { handle: p.handle });
    if (p.stockQty <= 0) fail("stock_must_be_positive", { handle: p.handle });
    if (demoPattern.test(`${p.title} ${p.handle} ${p.description}`)) fail("demo_markers_forbidden", { handle: p.handle });
  }
  return records;
}

export default async function seedCjVerifiedProductBatch({ container }: ExecArgs) {
  const records = validate(parseInput());
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const upserted: string[] = [];

  for (const p of records) {
    const existing = (await query.graph({ entity: "product", fields: ["id", "handle", "metadata", "variants.*"], filters: { handle: p.handle }, pagination: { take: 1 } })) as any;
    const product = Array.isArray(existing?.data) ? existing.data[0] : null;
    const m = metadataOf(p);
    if (product?.id) {
      const em = product.metadata || {};
      const matches = em.supplier === "cj" && em.supplierProductId === p.supplierProductId && em.supplierSku === p.supplierSku;
      if (!matches) fail("duplicate_handle_with_mismatched_cj_metadata", { handle: p.handle, productId: product.id });
      await updateProductsWorkflow(container).run({ input: { products: [{ id: product.id, title: p.title, description: p.description, handle: p.handle, thumbnail: p.imageUrl, metadata: m }] } });
      const variantId = product?.variants?.[0]?.id;
      if (variantId) await updateProductVariantsWorkflow(container).run({ input: { selector: { id: variantId }, update: { sku: p.supplierSku, prices: [{ amount: p.priceMinor, currency_code: "usd" }], metadata: m } } });
      upserted.push(p.handle);
    } else {
      await createProductsWorkflow(container).run({ input: { products: [{ title: p.title, description: p.description, handle: p.handle, status: "published", thumbnail: p.imageUrl, images: [{ url: p.imageUrl }], metadata: m, options: [{ title: "Variant", values: ["Default"] }], variants: [{ title: "Default", sku: p.supplierSku, manage_inventory: true, prices: [{ amount: p.priceMinor, currency_code: "usd" }], options: { Variant: "Default" }, metadata: m }] }] } });
      upserted.push(p.handle);
    }
  }

  console.log(JSON.stringify({ success: true, seededCount: upserted.length, handles: upserted, nextManualStep: "Run first-products:readiness and then manually fulfill paid_verified CJ orders; no bulk sync/API import is enabled." }, null, 2));
}
