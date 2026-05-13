# Rocket Shop/Products Functionality Integration

Use this as implementation documentation only. Do not copy this as customer-facing UI.

## Purpose

Feed Rocket-designed shop/product cards with dBaronX product data while preserving Rocket visual design.

## Functional imports

```tsx
import { useMedusaProducts } from "@/lib/hooks/useMedusaProducts";
import { useFirstProduct } from "@/lib/hooks/useFirstProduct";
import {
  productAvailabilityLabel,
  productDeliveryEstimate,
  productDisplayPrice,
  productPrimaryImage,
} from "@/lib/api/medusa-store-client";
```

## Product list pattern

```tsx
function useRocketShopProducts() {
  const { products, loading, reason } = useMedusaProducts({ limit: 24 });
  return {
    loading,
    reason,
    products: products.map((product) => ({
      id: String(product.id || product.handle || product.title || "product"),
      title: String(product.title || "dBaronX product"),
      handle: String(product.handle || ""),
      description: String(product.description || ""),
      image: productPrimaryImage(product),
      price: productDisplayPrice(product),
      availability: productAvailabilityLabel(product),
      deliveryEstimate: productDeliveryEstimate(product),
      raw: product,
    })),
  };
}
```

## Featured product pattern

```tsx
function useRocketFeaturedProduct() {
  const { product, loading, reason } = useFirstProduct();
  return { product, loading, reason };
}
```

## Rocket page usage

Keep Rocket shop grids, cards, image treatments, and product detail composition. Replace only mocked/static product arrays with values from these hooks and helpers.
