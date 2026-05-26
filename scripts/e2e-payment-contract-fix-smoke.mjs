import { readFileSync } from 'node:fs';

const checks = [];
const add=(name,ok)=>checks.push({name,ok});
const has=(s,p)=>s.includes(p);

const checkoutCtrl = readFileSync('apps/api/src/modules/payments/checkout-session.controller.ts','utf8');
const stripeSvc = readFileSync('apps/api/src/modules/payments/stripe-checkout.service.ts','utf8');
const paystackSvc = readFileSync('apps/api/src/modules/payments/paystack-checkout.service.ts','utf8');
const webStripe = readFileSync('apps/web/src/lib/checkout/stripe.ts','utf8');

add('stripe route exists', has(checkoutCtrl,'@Post("stripe/session")') || has(readFileSync('apps/api/src/modules/payments/stripe-checkout.controller.ts','utf8'),'@Post("session")'));
add('paystack session route exists', has(checkoutCtrl,'@Post("paystack/session")'));
add('paystack verify route exists', has(checkoutCtrl,'@Get("paystack/verify")'));
add('paystack webhook route exists', has(checkoutCtrl,'@Post("paystack/webhook")'));
add('stripe response includes checkoutUrl shapes', has(stripeSvc,'checkoutUrl: session.url') && has(stripeSvc,'url: session.url') && has(stripeSvc,'data: {') && has(stripeSvc,'checkoutUrl: session.url,'));
add('stripe missing url blocker', has(stripeSvc,'stripe_session_url_missing'));
add('stripe line item uses quantity and unitPriceMinor', has(stripeSvc,'quantity: payload.quantity') && has(stripeSvc,'unit_amount: payload.unitPriceMinor'));
add('stripe amount computed from unit * quantity', has(stripeSvc,'const expectedAmount = (unitPriceMinor || 0) * quantity;'));
add('paystack response includes authorization url shapes', has(paystackSvc,'authorizationUrl: authUrl') && has(paystackSvc,'authorization_url: authUrl') && has(paystackSvc,'url: authUrl') && has(paystackSvc,'data: { authorizationUrl: authUrl, authorization_url: authUrl, url: authUrl, reference }'));
add('paystack amount computed from unit * quantity', has(paystackSvc,'const amount =') && has(paystackSvc,'amount !== unitPriceMinor * quantity'));
add('paystack hosted url supports nested data.url', has(paystackSvc,'data?.data?.url'));
add('paystack callback canonical', has(paystackSvc,'https://dbaronx.com/payment/success?provider=paystack'));
add('no /api/api path', !/\/api\/api\b/.test(checkoutCtrl+stripeSvc+paystackSvc+webStripe));
add('frontend stripe endpoint is canonical api/checkout/stripe/session', has(webStripe,'/api/checkout/stripe/session'));
add('no netlify canonical success url', !/netlify\.app/i.test(stripeSvc+paystackSvc+webStripe));

const failed = checks.filter(c=>!c.ok);
if (failed.length) {
  console.error(JSON.stringify({ success:false, failed: failed.map(f=>f.name) }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ success:true, checks: checks.map(c=>c.name) }, null, 2));
