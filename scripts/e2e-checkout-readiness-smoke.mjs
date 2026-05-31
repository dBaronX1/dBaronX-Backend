#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
const checks=[]; const check=(name,pass)=>checks.push({name,pass:Boolean(pass)}); const file=(p)=>existsSync(p)?readFileSync(p,"utf8"):"";
const controller=file("apps/api/src/modules/payments/checkout-session.controller.ts");
const paymentsModule=file("apps/api/src/modules/payments/payments.module.ts");
const platformModule=file("apps/api/src/modules/platform/platform.module.ts");
check("checkout controller is registered", /CheckoutSessionController/.test(paymentsModule));
check("payments module is mounted", /PaymentsModule/.test(platformModule));
check("GET /api/checkout/readiness returns readiness shape", /@Get\("readiness"\)/.test(controller) && /stripeConfigured/.test(controller) && /paystackConfigured/.test(controller) && /webhookConfigured/.test(controller) && /blockers/.test(controller));
check("readiness declares multi-line support", /multiLineCheckoutSupported:\s*true/.test(controller));
const failed=checks.filter((c)=>!c.pass); for (const c of checks) console.log(`${c.pass?"ok":"not ok"} - ${c.name}`); if(failed.length) process.exit(1);
