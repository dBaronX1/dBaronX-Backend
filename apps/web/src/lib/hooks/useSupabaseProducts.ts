"use client";

import { useEffect, useState } from "react";

import { fetchMedusaStoreProducts, type MedusaStoreProduct } from "@/lib/api/medusa-store-client";

export function useSupabaseProducts(options: { limit?: number; handle?: string; initialProducts?: MedusaStoreProduct[] } = {}) {
  const [products, setProducts] = useState<MedusaStoreProduct[]>(options.initialProducts || []);
  const [loading, setLoading] = useState(!options.initialProducts?.length);
  const [reason, setReason] = useState<string | null>(null);
  const [attemptedEndpoint, setAttemptedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(!options.initialProducts?.length);
    fetchMedusaStoreProducts(options)
      .then((result) => {
        if (!mounted) return;
        if (result.products.length > 0 || !options.initialProducts?.length) setProducts(result.products);
        setReason(result.reason);
        setAttemptedEndpoint(result.attemptedEndpoint || null);
      })
      .catch(() => {
        if (!mounted) return;
        setReason("Products are temporarily unavailable. Please try again shortly or contact support.");
        setAttemptedEndpoint(options.handle ? `/api/store/products/${encodeURIComponent(options.handle)}` : "/api/store/products");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [options.limit, options.handle, options.initialProducts]);

  return { products, loading, reason, attemptedEndpoint };
}
