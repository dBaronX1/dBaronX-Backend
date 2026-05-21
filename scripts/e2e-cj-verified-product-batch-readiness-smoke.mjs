#!/usr/bin/env node
const MEDUSA_BASE_URL = (process.env.MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000').replace(/\/$/, '');
const KEY = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const blockers=[]; const missingMetadata=[];
const add=(b)=>{if(!blockers.includes(b)) blockers.push(b)};
const res = await fetch(`${MEDUSA_BASE_URL}/store/products?limit=100`, { headers: { 'x-publishable-api-key': KEY } });
let json={}; try{json=await res.json();}catch{}
const products = Array.isArray(json?.products)?json.products:[];
const verified = products.filter(p=>{
  const m=p.metadata||{};
  return m.supplier==='cj' && m.realSupplierProduct===true && m.demo===false && m.supplierVerificationStatus==='verified_for_checkout';
});
if (verified.length < 3) add('verified_cj_products_less_than_3');
const badDemo = verified.filter(p=>/\b(demo|mock|sample|test)\b/i.test(`${p.title||''} ${p.handle||''} ${p.description||''}`));
if (badDemo.length) add('demo_markers_detected');
for (const p of verified){
  const m=p.metadata||{}; const v=(p.variants||[])[0]||{};
  const miss=[];
  if(m.supplier!=='cj') miss.push('supplier');
  if(!m.supplierProductId) miss.push('supplierProductId');
  if(!m.supplierSku && !v.sku) miss.push('supplierSku');
  if(!m.sourceUrl) miss.push('sourceUrl');
  if(!(p.thumbnail || (p.images||[])[0]?.url || m.imageUrl)) miss.push('image');
  const price=(v.calculated_price?.calculated_amount ?? v.prices?.[0]?.amount ?? 0);
  if(!(Number(price)>0)) miss.push('price');
  if(!m.stockQty && !m.inventoryQty) miss.push('stock');
  if(!(Number(m.supplierCostAmount||m.supplierCostUsdMinor||0)>0)) miss.push('supplierCost');
  if(!p.handle) miss.push('productUrl');
  if(miss.length) missingMetadata.push({handle:p.handle||null, missing:miss});
}
if(missingMetadata.length) add('missing_required_metadata');
const handles = verified.map(p=>p.handle).filter(Boolean);
const priceReady = missingMetadata.every(x=>!x.missing.includes('price'));
const stockReady = missingMetadata.every(x=>!x.missing.includes('stock'));
const telegramDiscoveryReady = verified.length>=3 && missingMetadata.length===0;
if(!telegramDiscoveryReady) add('telegram_discovery_not_ready_for_real_products');
const result={ success:blockers.length===0, blockers, verifiedProductCount:verified.length, handles, missingMetadata, priceReady, stockReady, telegramDiscoveryReady, nextManualStep: 'Use /products in Telegram to guide customers to web checkout; keep manual CJ fulfillment only after paid_verified proof.'};
console.log(JSON.stringify(result,null,2));
process.exit(result.success?0:1);
