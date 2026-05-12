"use client";

import { useEffect, useState } from "react";

import { fetchFirstCjProduct, type MedusaStoreProduct } from "@/lib/api/medusa-store-client";

export function useFirstProduct() {
  const [product, setProduct] = useState<MedusaStoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchFirstCjProduct()
      .then((result) => {
        if (!mounted) return;
        setProduct(result.product);
        setReason(result.reason);
      })
      .catch((error) => mounted && setReason(error instanceof Error ? error.message : "Unable to load first product."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return { product, loading, reason };
}
