#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
const checks=[]; const check=(name,pass)=>checks.push({name,pass:Boolean(pass)}); const file=(p)=>existsSync(p)?readFileSync(p,"utf8"):"";
const controller=file("apps/api/src/modules/payments/checkout-session.controller.ts");
const paystack=file("apps/api/src/modules/payments/paystack-checkout.service.ts");
const mapper=file("apps/api/src/modules/payments/checkout-error.mapper.ts");
const combined=`${controller}\n${paystack}\n${mapper}`;
check("POST /api/checkout/session can select Paystack", /@Post\("session"\)/.test(controller) && /provider === "paystack"/.test(controller) && /paystack\.createAuthorization/.test(controller));
check("Paystack initializes hosted transaction", /transaction\/initialize/.test(paystack) && /authorization_url|authorizationUrl|checkoutUrl/.test(paystack));
check("Paystack supports multi-line totals", /lineItems\.reduce/.test(paystack) && /lineItemCount:\s*lineItems\.length/.test(paystack));
check("Paystack response exposes checkoutUrl and reference", /checkoutUrl/.test(controller) && /reference/.test(controller));
check("Paystack missing key maps to safe provider unavailable", /paystack_secret_key_missing|paystack_not_configured/.test(paystack) && /Payment provider is temporarily unavailable/.test(paystack));
check("Paystack uses shared resolver with sandbox/test before live", /resolvePaymentMode/.test(paystack) && /resolvePaystackPaymentMode/.test(paystack) && /PAYSTACK_SANDBOX_SECRET_KEY/.test(readFileSync("apps/api/src/modules/payments/payment-mode-resolver.ts", "utf8")) && /paystackSecretKey/.test(paystack));
check("Paystack webhook falls back to resolved secret key for HMAC", /PAYSTACK_WEBHOOK_SECRET/.test(paystack) && /paymentMode\.secretKeySource|paystackSecretKey/.test(paystack) && /createHmac\("sha512"/.test(paystack) && /paystackWebhookSigningSecret/.test(paystack));
check("Paystack readiness does not require separate webhook secret", /webhookReady:\s*Boolean\(this\.paystackWebhookSigningSecret\(\)\)/.test(paystack));
check("Paystack checkout does not mark paid", !/paid_verified|payment_status:\s*["']paid["']|status:\s*["']paid["']/.test(combined));
check("Paystack route does not return raw provider errors", !/error\.message/.test(controller) && !/raw Paystack/.test(combined));
const failed=checks.filter((c)=>!c.pass); for (const c of checks) console.log(`${c.pass?"ok":"not ok"} - ${c.name}`); if(failed.length) process.exit(1);
