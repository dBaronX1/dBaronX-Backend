"use client";

import { useEffect, useState } from "react";

import { fetchMedusaStoreProducts, type MedusaStoreProduct } from "@/lib/api/medusa-store-client";

export function useMedusaProducts(options: { limit?: number; handle?: string } = {}) {
  const [products, setProducts] = useState<MedusaStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchMedusaStoreProducts(options)
      .then((result) => {
        if (!mounted) return;
        setProducts(result.products);
        setReason(result.reason);
      })
      .catch((error) => mounted && setReason(error instanceof Error ? error.message : "Unable to load products."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [options.limit, options.handle]);

  return { products, loading, reason };
}
