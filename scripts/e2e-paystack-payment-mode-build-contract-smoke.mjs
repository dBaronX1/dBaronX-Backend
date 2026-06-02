#!/usr/bin/env node
import { readFileSync } from "node:fs";

const file = "apps/api/src/modules/payments/paystack-checkout.service.ts";
const source = readFileSync(file, "utf8");
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const paymentModeDeclaration = source.indexOf("const paymentMode = this.resolvePaystackPaymentMode()");
const firstPaymentModeUse = source.indexOf("paymentMode.mode");
const methodDeclaration = source.indexOf("private resolvePaystackPaymentMode()");
const methodCalls = [...source.matchAll(/this\.resolvePaystackPaymentMode\(/g)].map((match) => match.index ?? -1);

check("Paystack imports shared payment-mode resolver", /import \{ resolvePaymentMode \} from "\.\/payment-mode-resolver";/.test(source));
check("Paystack declares paymentMode before using paymentMode.mode", paymentModeDeclaration >= 0 && firstPaymentModeUse > paymentModeDeclaration);
check("Paystack class defines resolvePaystackPaymentMode for all class calls", methodDeclaration >= 0 && methodCalls.length >= 2);
check("Paystack helper delegates to shared resolver", /return resolvePaymentMode\("paystack",/.test(source));
check("Paystack disabled checkout response is no-secret and safe", /provider:\s*"paystack"/.test(source) && /configured/.test(source) && /mode:\s*paymentMode\.mode/.test(source) && /authorizationUrl:\s*null/.test(source) && /reference:\s*null/.test(source) && /Payment provider is temporarily unavailable\. Please try again\./.test(source));
check("Paystack secret selection no longer hand-rolls test/live priority", !/PAYSTACK_TEST_SECRET_KEY"\) \|\| this\.value\("PAYSTACK_SANDBOX_SECRET_KEY"\) \|\| this\.value\("PAYSTACK_SECRET_KEY"\) \|\| this\.value\("PAYSTACK_LIVE_SECRET_KEY"\)/.test(source));

const failed = checks.filter((check) => !check.pass);
for (const result of checks) console.log(`${result.pass ? "ok" : "not ok"} - ${result.name}`);
if (failed.length) process.exit(1);
