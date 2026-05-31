#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
const checks=[]; const check=(name,pass)=>checks.push({name,pass:Boolean(pass)}); const file=(p)=>existsSync(p)?readFileSync(p,"utf8"):"";
const controller=file("apps/api/src/modules/payments/checkout-session.controller.ts");
const stripe=file("apps/api/src/modules/payments/stripe-checkout.service.ts");
const dto=file("apps/api/src/modules/payments/dto/create-stripe-checkout-session.dto.ts");
const mapper=file("apps/api/src/modules/payments/checkout-error.mapper.ts");
const combined=`${controller}\n${stripe}\n${dto}\n${mapper}`;
check("POST /api/checkout/session can select Stripe", /@Post\("session"\)/.test(controller) && /provider === "paystack"/.test(controller) && /stripe\.createSession/.test(controller));
check("Stripe hosted Checkout Session is created", /checkout\.sessions\.create/.test(stripe) && /mode:\s*"payment"/.test(stripe));
check("Stripe checkout supports multi-line line_items", /line_items:\s*payload\.lineItems\.map/.test(stripe));
check("Stripe success and cancel urls use safe dbaronx web fallback", /\/checkout\/success/.test(stripe) && /\/checkout\/cancel/.test(stripe));
check("Stripe response exposes checkoutUrl, checkoutSessionId, reference", /checkoutUrl/.test(controller) && /checkoutSessionId/.test(controller) && /reference/.test(controller));
check("Stripe missing secret maps to safe provider unavailable", /stripe_secret_key_missing/.test(stripe) && /Payment provider is temporarily unavailable/.test(stripe));
check("Stripe session failure maps to safe checkout unavailable", /stripe_session_failed/.test(stripe) && /Checkout is temporarily unavailable/.test(stripe));
check("Stripe checkout route does not mark paid", !/paid_verified|payment_status:\s*["']paid["']|status:\s*["']paid["']/.test(controller));
check("Stripe route does not return raw Stripe errors", !/error\.message/.test(controller) && !/raw Stripe/.test(combined));
const failed=checks.filter((c)=>!c.pass); for (const c of checks) console.log(`${c.pass?"ok":"not ok"} - ${c.name}`); if(failed.length) process.exit(1);
