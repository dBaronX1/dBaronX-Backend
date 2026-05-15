# 48-Hour Revenue Plan

## Objective

Generate the first real dBaronX transaction quickly without weakening checkout integrity, supplier truth, or token compliance safety.

## Primary Path: CJ Product on Web + Stripe Checkout

1. Keep the verified CJ shirt visible on `/home`, `/shop`, `/products`, and `/products/mens-cotton-linen-long-sleeve-casual-shirt`.
2. Confirm Medusa Store API accepts the stable publishable key.
3. Confirm the product has real price, supplier cost, stock, shipping country, and delivery estimate.
4. Run the Stripe checkout smoke against the visible product and selected variant.
5. Complete one controlled purchase and verify order/payment state before fulfillment.
6. Fulfill manually through CJ only after paid status is confirmed.

## Fallback 1: Stripe-Hosted Manual Payment Link + Manual CJ Fulfillment

Use a Stripe-hosted payment link for the exact product only if web checkout is blocked but supplier truth is verified. The operator must manually record the buyer, product, SKU, shipping address, amount paid, and CJ fulfillment status. Do not mark fulfilled or shipped until CJ confirms those states.

## Fallback 2: Telegram Concierge Sourcing Service

Offer a Telegram concierge sourcing flow where customers request a product and the operator returns a verified quote. Payment must use Stripe or another approved payment method. Fulfillment remains manual and status updates must be truthful.

## Fallback 3: Affiliate Links

Use affiliate links for relevant products only when direct checkout is blocked. Clearly label affiliate destinations, avoid fake inventory claims, and track revenue separately from dBaronX direct commerce orders.

## Fallback 4: Digital Products / AI Stories

Sell low-fulfillment-risk digital products such as AI story packs, prompts, or downloadable guides through Stripe-hosted checkout or the web checkout path. Delivery must be immediate or operator-confirmed, and product descriptions must accurately state what the buyer receives.

## DBX Token Boundary

DBX token work is preparation-only until legal and compliance clearance. Do not launch a public token sale, sale page, or public purchase flow as a revenue fallback.

## 48-Hour Execution Order

1. Verify product visibility and checkout readiness.
2. Attempt one web checkout transaction.
3. If web checkout is blocked, activate the Stripe-hosted payment link fallback.
4. If direct product demand is slow, activate Telegram concierge and affiliate offers.
5. Add digital products only when fulfillment copy and delivery are ready.
6. Keep DBX token public sale disabled.
