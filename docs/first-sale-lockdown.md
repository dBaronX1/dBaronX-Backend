# First Sale Lockdown Flow

1. Ensure the Supabase product row exists in `app_public.storefront_products` for handle `mens-cotton-linen-long-sleeve-casual-shirt`, with `active = true` and `verification_status = 'verified'`.
2. If Rocket storefront is down or unreachable, switch to direct Stripe checkout fallback through the API endpoint.
3. Create a Stripe **test** session via `POST /api/checkout/stripe/session` with first-sale metadata (`source=dbaronx_first_sale`, `supplier=cj`, `supplierProductId=2408300732091605000`, `supplierSku=CJDS212420104DW`, `handle=mens-cotton-linen-long-sleeve-casual-shirt`).
4. Open the returned `checkoutUrl` (`https://checkout.stripe.com/...`).
5. Pay with Stripe test card `4242 4242 4242 4242` and valid future expiry/CVC.
6. Confirm Stripe signed webhook event `checkout.session.completed` delivered to `/api/checkout/stripe/webhook`.
7. Confirm backend settlement/payment proof is recorded (webhook evidence + economic/payment proof), not inferred from redirect.
8. Confirm Telegram `/payment_status` and `/order_status` remain conservative and proof-based.
9. Only after test proof is confirmed end-to-end should live payment mode be considered.
10. Ignore AI Stories, watch flows, affiliate payouts, and token work until first sale proof is complete.
