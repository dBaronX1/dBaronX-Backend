#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const blockers = [];
const sample = {
  products: [{
    id: 'prod_01KSW407FCTENNMQ17HHMQB115',
    handle: 'mens-cotton-linen-long-sleeve-casual-shirt',
    title: "Men's Cotton Linen Long Sleeve Casual Shirt",
    thumbnail: 'https://example.test/shirt.webp',
    metadata: { realSupplierProduct: true, demo: false, supplier: 'cj', manualCurated: true, buyable: true, supplierVerificationStatus: 'manual_verified_for_checkout', stockQty: 32, imageUrl: 'https://example.test/shirt.webp' },
    variants: [{ id: 'variant_123', sku: 'CJDS212420104DW', manage_inventory: true, calculated_price: { calculated_amount: 1999, currency_code: 'usd' } }],
  }],
};
const product = extractProducts(sample)[0];
const variant = firstVariant(product);
if (product?.id !== 'prod_01KSW407FCTENNMQ17HHMQB115') blockers.push('product_id_not_preserved');
if (variant?.id !== 'variant_123') blockers.push('variant_id_not_extracted');
if (firstPriceAmount(variant, product) !== 1999) blockers.push('calculated_price_not_extracted');
if (!stockReady(product, variant)) blockers.push('metadata_stock_not_extracted');
if (!hasImage(product)) blockers.push('metadata_image_not_extracted');

const checkoutSource = await readFile('apps/web/src/lib/checkout/medusa-cart.ts', 'utf8');
if (!checkoutSource.includes('/line-items')) blockers.push('medusa_line_item_route_missing');
if (!checkoutSource.includes('subtotal <= 0')) blockers.push('cart_subtotal_positive_guard_missing');

console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);

function extractProducts(payload) { const root = payload && typeof payload === 'object' ? payload : {}; const nested = root.data && typeof root.data === 'object' ? root.data : root; for (const key of ['products', 'items', 'data']) if (Array.isArray(nested[key])) return nested[key]; return nested.product ? [nested.product] : []; }
function firstVariant(product) { return Array.isArray(product?.variants) ? product.variants.find((variant) => variant?.id) || null : null; }
function metadataOf(item) { return item && typeof item.metadata === 'object' && item.metadata ? item.metadata : {}; }
function firstPriceAmount(variant, product = null) { const calculated = variant?.calculated_price; if (calculated && typeof calculated === 'object') { const nested = calculated.calculated_price && typeof calculated.calculated_price === 'object' ? calculated.calculated_price : {}; const priceObj = calculated.price && typeof calculated.price === 'object' ? calculated.price : {}; const amount = Number(calculated.calculated_amount ?? calculated.amount ?? calculated.original_amount ?? nested.amount ?? priceObj.amount ?? 0); if (Number.isFinite(amount) && amount > 0) return amount; } if (Array.isArray(variant?.prices)) { const price = variant.prices.find((item) => Number(item?.amount) > 0); if (price) return Number(price.amount); } return Number(variant?.price || product?.priceMinor || product?.price || 0); }
function stockReady(product, variant) { if (variant?.manage_inventory === false) return true; const metadata = metadataOf(product); return [product?.inventoryQuantity, metadata.stockQty, metadata.inventory, variant?.inventory_quantity, variant?.stocked_quantity, variant?.available_quantity].some((value) => Number(value) > 0); }
function hasImage(product) { const metadata = metadataOf(product); return Boolean(product?.thumbnail || product?.image || product?.image_url || metadata.imageUrl || (Array.isArray(product?.images) && product.images.some((image) => image?.url))); }
