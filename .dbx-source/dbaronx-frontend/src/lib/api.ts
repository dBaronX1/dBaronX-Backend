const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

async function request<T>(
  path: string,
  options?: RequestInit & { bodyJson?: Record<string, JsonValue> }
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    body: options?.bodyJson ? JSON.stringify(options.bodyJson) : options?.body,
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckoutItem = {
  product_id?: string;
  product_name: string;
  product_handle?: string;
  quantity: number;
  unit_price: number;
};

export type CreateCheckoutPayload = {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  country: string;
  address_line_1: string;
  address_line_2?: string;
  city?: string;
  postal_code?: string;
  currency?: string;
  total_amount: number;
  items: CheckoutItem[];
  source?: string;
};

export type CreateCheckoutResponse = {
  success: true;
  order: {
    id: string;
    public_reference: string;
    customer_name: string;
    total_amount: number;
    currency: string;
    payment_status: string;
    operational_status?: string;
    created_at: string;
  };
};

export type SubmitPaymentProofPayload = {
  public_reference: string;
  provider: string;
  provider_reference?: string;
  proof_url?: string;
  payer_name?: string;
  payer_email?: string;
};

export type SubmitPaymentProofResponse = {
  success: true;
  payment: {
    id: string;
    payment_status: string;
    proof_url?: string | null;
  };
};

export type Product = {
  id: string;
  handle: string;
  name: string;
  description: string;
  price: number;
  compare_price?: number;
  currency?: string;
  image_url?: string;
  images?: string[];
  category?: string;
  stock?: number;
  is_active?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type Order = {
  id: string;
  public_reference: string;
  customer_name: string;
  customer_email?: string;
  total_amount: number;
  currency: string;
  payment_status: string;
  fulfillment_status?: string;
  operational_status?: string;
  created_at: string;
  items?: CheckoutItem[];
};

// ─── Storefront / Medusa-Nest Product Normalizers ───────────────────────────

export type StorefrontProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  price: number;
  compare_price?: number;
  currency_code: string;
  thumbnail?: string;
  images: string[];
  category?: string;
  stock: number;
  is_active: boolean;
  defaultVariantId?: string | null;
  variants?: Array<{
    id: string;
    title?: string;
    sku?: string | null;
    inventory_quantity?: number | null;
  }>;
};

export type StoreCartItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total: number;
  thumbnail?: string | null;
  product_id?: string;
  variant_id?: string;
};

export type StoreCart = {
  id: string;
  currency_code: string;
  items: StoreCartItem[];
  subtotal: number;
  total: number;
  item_count: number;
};

function normalizeStoreProduct(raw: any): StorefrontProduct {
  const firstVariant = raw?.variants?.[0];

  const firstPrice =
    raw?.price ??
    raw?.amount ??
    raw?.variants?.[0]?.prices?.[0]?.amount ??
    0;

  const currencyCode =
    raw?.currency_code ??
    raw?.currencyCode ??
    raw?.currency ??
    raw?.variants?.[0]?.prices?.[0]?.currency_code ??
    "usd";

  const thumbnail =
    raw?.thumbnail ??
    raw?.image_url ??
    raw?.image ??
    raw?.images?.[0]?.url ??
    raw?.images?.[0] ??
    "";

  const stock =
    raw?.stock ??
    raw?.inventory_quantity ??
    raw?.inventoryQuantity ??
    firstVariant?.inventory_quantity ??
    0;

  return {
    id: raw?.id,
    handle: raw?.handle ?? raw?.slug ?? raw?.id,
    title: raw?.title ?? raw?.name ?? "Untitled Product",
    description: raw?.description ?? "",
    price: Number(firstPrice) || 0,
    compare_price:
      raw?.compare_price ?? raw?.comparePrice ?? undefined,
    currency_code: currencyCode,
    thumbnail,
    images: Array.isArray(raw?.images)
      ? raw.images
          .map((img: any) => (typeof img === "string" ? img : img?.url))
          .filter(Boolean)
      : thumbnail
      ? [thumbnail]
      : [],
    category: raw?.category ?? raw?.collection?.title ?? raw?.type?.value ?? "",
    stock: Number(stock) || 0,
    is_active: raw?.is_active ?? true,
    defaultVariantId:
      raw?.defaultVariantId ??
      raw?.default_variant_id ??
      firstVariant?.id ??
      null,
    variants: Array.isArray(raw?.variants)
      ? raw.variants.map((v: any) => ({
          id: v.id,
          title: v.title,
          sku: v.sku ?? null,
          inventory_quantity: v.inventory_quantity ?? null,
        }))
      : [],
  };
}

function normalizeStoreCart(raw: any): StoreCart {
  const items: StoreCartItem[] = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => ({
        id: item?.id,
        title: item?.title ?? item?.product_title ?? "Item",
        quantity: item?.quantity ?? 1,
        unit_price: item?.unit_price ?? item?.unitPrice ?? 0,
        total:
          item?.total ??
          (item?.unit_price ?? item?.unitPrice ?? 0) *
            (item?.quantity ?? 1),
        thumbnail:
          item?.thumbnail ??
          item?.variant?.product?.thumbnail ??
          null,
        product_id: item?.product_id ?? item?.variant?.product_id,
        variant_id: item?.variant_id ?? item?.variant?.id,
      }))
    : [];

  return {
    id: raw?.id,
    currency_code: raw?.currency_code ?? "usd",
    items,
    subtotal: raw?.subtotal ?? 0,
    total: raw?.total ?? 0,
    item_count:
      raw?.item_count ??
      items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

// ─── Storefront / Catalog ────────────────────────────────────────────────────

export async function getStoreProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== "all")
    qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";

  const data = await request<{ success: true; products: any[] }>(
    `/products${query}`
  );

  return {
    success: data.success,
    products: Array.isArray(data.products)
      ? data.products.map(normalizeStoreProduct)
      : [],
  };
}

export async function getStoreProductByHandle(handle: string) {
  const data = await request<{ success: true; product: any }>(
    `/products/${encodeURIComponent(handle)}`
  );

  return {
    success: data.success,
    product: normalizeStoreProduct(data.product),
  };
}

export async function getStoreProductById(id: string) {
  const data = await request<{ success: true; product: any }>(
    `/products/id/${encodeURIComponent(id)}`
  );

  return {
    success: data.success,
    product: normalizeStoreProduct(data.product),
  };
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export async function createStoreCart() {
  const data = await request<{ success: true; cart: any }>("/cart", {
    method: "POST",
    bodyJson: {},
  });

  return {
    success: data.success,
    cart: normalizeStoreCart(data.cart),
  };
}

export async function getStoreCart(cartId: string) {
  const data = await request<{ success: true; cart: any }>(
    `/cart/${encodeURIComponent(cartId)}`
  );

  return {
    success: data.success,
    cart: normalizeStoreCart(data.cart),
  };
}

export async function addStoreCartItem(
  cartId: string,
  payload: { variantId: string; quantity?: number }
) {
  const data = await request<{ success: true; cart: any }>(
    `/cart/${encodeURIComponent(cartId)}/items`,
    {
      method: "POST",
      bodyJson: {
        variantId: payload.variantId,
        quantity: payload.quantity ?? 1,
      },
    }
  );

  return {
    success: data.success,
    cart: normalizeStoreCart(data.cart),
  };
}

export async function updateStoreCartItem(
  cartId: string,
  itemId: string,
  quantity: number
) {
  const data = await request<{ success: true; cart: any }>(
    `/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(
      itemId
    )}`,
    {
      method: "PUT",
      bodyJson: { quantity },
    }
  );

  return {
    success: data.success,
    cart: normalizeStoreCart(data.cart),
  };
}

export async function removeStoreCartItem(
  cartId: string,
  itemId: string
) {
  const data = await request<{ success: true; cart: any }>(
    `/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(
      itemId
    )}`,
    {
      method: "DELETE",
    }
  );

  return {
    success: data.success,
    cart: normalizeStoreCart(data.cart),
  };
}

// ─── Store Checkout ──────────────────────────────────────────────────────────

export async function createStoreManualCheckout(payload: {
  cartId: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  country: string;
  address_line_1: string;
  address_line_2?: string;
  city?: string;
  postal_code?: string;
  currency?: string;
  source?: string;
}) {
  return request<CreateCheckoutResponse>("/checkout/manual", {
    method: "POST",
    bodyJson: payload as unknown as Record<string, JsonValue>,
  });
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionPlan = {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_yearly?: number;
  currency: string;
  features: string[];
  earning_multiplier?: number;
  daily_ads?: number;
  story_credits?: number;
};

// ─── Onboarding / Dreams / AI / DBX ──────────────────────────────────────────
// (unchanged below — preserved as-is)

export type SupplierOnboardingPayload = {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  country: string;
  category: string;
  website?: string;
  description: string;
  monthly_capacity?: string;
};

export type AdvertiserOnboardingPayload = {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  country: string;
  industry: string;
  website?: string;
  campaign_goal: string;
  monthly_budget?: string;
};

export type DreamsCampaign = {
  id: string;
  title: string;
  description: string;
  goal_usd: number;
  raised_usd: number;
  image_url?: string;
  category: string;
  status: string;
  end_date?: string;
  creator_name?: string;
};

export type AIStoryPayload = {
  prompt: string;
  genre: string;
  length?: "short" | "medium" | "long";
  language?: string;
  tone?: string;
};

// ─── Existing Endpoints (Preserved) ──────────────────────────────────────────

export async function createManualCheckout(payload: CreateCheckoutPayload) {
  return request<CreateCheckoutResponse>("/checkout/manual", {
    method: "POST",
    bodyJson: payload as unknown as Record<string, JsonValue>,
  });
}

export async function submitPaymentProof(payload: SubmitPaymentProofPayload) {
  return request<SubmitPaymentProofResponse>("/payments/manual-proof", {
    method: "POST",
    bodyJson: payload as unknown as Record<string, JsonValue>,
  });
}

export async function getProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<{ success: true; products: Product[] }>(
    `/products${query}`
  );
}

export async function getProductByHandle(handle: string) {
  return request<{ success: true; product: Product }>(
    `/products/${handle}`
  );
}

export async function getOrderByReference(publicReference: string) {
  return request<{ success: true; order: Order }>(
    `/orders/reference/${encodeURIComponent(publicReference)}`
  );
}

export async function getMyOrders(token: string) {
  return request<{ success: true; orders: Order[] }>("/orders/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createPaymentIntent(payload: {
  amount: number;
  currency: string;
  provider: string;
  public_reference?: string;
}) {
  return request<{ success: true; intent: Record<string, unknown> }>(
    "/payments/intent",
    {
      method: "POST",
      bodyJson: payload as unknown as Record<string, JsonValue>,
    }
  );
}

export async function getSubscriptionPlans() {
  return request<{ success: true; plans: SubscriptionPlan[] }>(
    "/subscriptions/plans"
  );
}

export async function subscribeToPlan(planId: string, token: string) {
  return request<{ success: true; subscription: Record<string, unknown> }>(
    "/subscriptions/subscribe",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      bodyJson: { plan_id: planId },
    }
  );
}

export async function getAffiliateDashboard(token: string) {
  return request<{ success: true; data: Record<string, unknown> }>(
    "/affiliate/dashboard",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function getWatchEarnings(token: string) {
  return request<{ success: true; data: Record<string, unknown> }>(
    "/watch-earn/earnings",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function generateAIStory(payload: AIStoryPayload, token: string) {
  return request<{ success: true; story: Record<string, unknown> }>(
    "/ai-stories/generate",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      bodyJson: payload as unknown as Record<string, JsonValue>,
    }
  );
}

export async function getAIStories(params?: {
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<{ success: true; stories: Record<string, unknown>[] }>(
    `/ai-stories${query}`
  );
}

export async function getDreamsCampaigns() {
  return request<{ success: true; campaigns: DreamsCampaign[] }>(
    "/dreams/campaigns"
  );
}

export async function getDreamsCampaign(id: string) {
  return request<{ success: true; campaign: DreamsCampaign }>(
    `/dreams/campaigns/${id}`
  );
}

export async function contributeToDream(
  payload: {
    campaign_id: string;
    amount: number;
    currency: string;
    payment_method: string;
  },
  token: string
) {
  return request<{ success: true; contribution: Record<string, unknown> }>(
    "/dreams/contribute",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      bodyJson: payload as unknown as Record<string, JsonValue>,
    }
  );
}

export async function getDBXTokenInfo() {
  return request<{ success: true; token: Record<string, unknown> }>(
    "/dbx-token/info"
  );
}

export async function getWalletOverview(token: string) {
  return request<{ success: true; wallet: Record<string, unknown> }>(
    "/wallet/overview",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function submitSupplierApplication(
  payload: SupplierOnboardingPayload
) {
  return request<{ success: true; application_id: string }>(
    "/suppliers/apply",
    {
      method: "POST",
      bodyJson: payload as unknown as Record<string, JsonValue>,
    }
  );
}

export async function submitAdvertiserApplication(
  payload: AdvertiserOnboardingPayload
) {
  return request<{ success: true; application_id: string }>(
    "/advertisers/apply",
    {
      method: "POST",
      bodyJson: payload as unknown as Record<string, JsonValue>,
    }
  );
}

export async function getHealthStatus() {
  return request<{ status: string }>("/health");
}