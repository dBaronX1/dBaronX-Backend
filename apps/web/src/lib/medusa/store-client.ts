const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

export async function fetchMedusaStoreProducts() {
  if (!MEDUSA_BACKEND_URL || !MEDUSA_PUBLISHABLE_KEY) {
    return { products: [] as Record<string, unknown>[], reason: "medusa_env_missing" };
  }

  const response = await fetch(`${MEDUSA_BACKEND_URL.replace(/\/$/, "")}/store/products`, {
    headers: { "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY },
    next: { revalidate: 60 },
  });

  if (!response.ok) throw new Error(`medusa_store_products_failed_${response.status}`);
  const data = (await response.json()) as { products?: Record<string, unknown>[] };
  return { products: data.products ?? [], reason: null };
}
