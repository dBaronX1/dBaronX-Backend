# Rocket Product Category Contract

## Categories
- all: All
- electronics: Electronics
- fashion: Fashion
- home-living: Home & Living
- beauty: Beauty
- sports: Sports
- automotive: Automotive
- agriculture: Agriculture
- tech: Tech
- finance: Finance

## Visibility
Rocket reads published products from `app_public.storefront_products` and must only display rows where `active=true` and `verification_status='verified'`.

## Product fields for card
- image (`thumbnail`/`image_url`)
- title
- price (`price_minor`)
- category (`metadata.category`, `metadata.categorySlug`)
- delivery estimate (`delivery_estimate`)
- actions: Add to Cart, Buy Now, View Details

## Safety
- Supplier cost is private and never rendered by Rocket.
- Products stay private until validated + approved + published.
- All category shows all published verified products.
