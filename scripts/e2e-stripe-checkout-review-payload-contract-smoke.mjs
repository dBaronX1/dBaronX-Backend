#!/usr/bin/env node
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const endpoint = `${API_BASE}/api/checkout/stripe/session`;

function must(cond, msg) { if (!cond) throw new Error(msg); }
async function post(body){
  const r = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  let data={}; try{data=await r.json();}catch{}
  return {status:r.status,data};
}
function hasCheckout(d){ return Boolean(d?.checkoutUrl || d?.url || d?.data?.checkoutUrl) && Boolean(d?.sessionId || d?.data?.sessionId); }

const base={
  cartId:'contract-smoke-cart',
  amount:3998,
  unitPriceMinor:1999,
  quantity:2,
  currency:'usd',
  successUrl:'https://dbaronx.com/checkout/success',
  cancelUrl:'https://dbaronx.com/checkout/cancel',
  customerEmail:'smoke@example.com',
  productId:'prod_1',
  title:'Smoke Product',
  country:'US',city:'Austin',addressLine1:'1 Main',postalCode:'78701',
  supplier:'cj',source:'rocket'
};

const old = await post({...base, amount:3998, productName:'Old Shape'});
must(old.status < 500, 'old payload server error');

const neo = await post({
  paymentProvider:'stripe',provider:'stripe',
  email:'neo@example.com',fullName:'Neo',phone:'+1',
  country:'US',city:'Austin',address1:'1 Main',postcode:'78701',
  product_id:'prod_2',product_handle:'neo-handle',product_name:'Neo Product',
  unit_price:1999,quantity:2,amountMinor:3998,currency:'usd',
  image_url:'https://example.com/image.png',supplier:'cj',supplier_product_id:'sp1',supplier_sku:'sku1',
  checkout_ref:'chk1',cart_id:'cart2',source:'rocket-review',
  successUrl:'https://dbaronx.com/checkout/success',cancelUrl:'https://dbaronx.com/checkout/cancel',
  extraSafeField:'ok'
});
must(neo.status < 500, 'new payload server error');

const mismatch = await post({...base, amount:3999});
must(mismatch.data?.blockers?.includes('amount_mismatch'), 'amount_mismatch missing');

const missingShipping = await post({...base, country:undefined, city:undefined, addressLine1:undefined, postalCode:undefined});
must(!String(JSON.stringify(missingShipping.data)).includes('sk_'), 'secret leaked');

const missingProduct = await post({...base, productId:undefined, handle:undefined, variantId:undefined});
must(missingProduct.data?.blockers?.includes('missing_product'), 'missing_product not returned');

if (old.status === 200) must(hasCheckout(old.data), 'old response missing checkout/session');
if (neo.status === 200) must(hasCheckout(neo.data), 'new response missing checkout/session');

console.log(JSON.stringify({ok:true, endpoint, oldStatus:old.status, newStatus:neo.status, mismatchStatus:mismatch.status}, null, 2));
