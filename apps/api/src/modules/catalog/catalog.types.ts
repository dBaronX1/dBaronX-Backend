export type MedusaStoreProduct = Record<string, unknown> & {
  id?: string;
  title?: string;
  handle?: string;
  description?: string;
  thumbnail?: string;
  images?: Array<{ url?: string } | string>;
  variants?: MedusaStoreVariant[];
  categories?: Array<{ name?: string; handle?: string }>;
  collection?: { title?: string };
  type?: { value?: string };
  metadata?: Record<string, unknown>;
};

export type MedusaStoreVariant = Record<string, unknown> & {
  id?: string;
  title?: string;
  sku?: string;
  manage_inventory?: boolean;
  inventory_quantity?: number;
  stocked_quantity?: number;
  available_quantity?: number;
  prices?: Array<{ amount?: number; currency_code?: string }>;
  calculated_price?: Record<string, unknown>;
};

export type PublicCatalogProduct = {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string;
  images: string[];
  category: string;
  priceMinor: number | null;
  currencyCode: string;
  variantId: string;
  productId: string;
  inStock: boolean;
  inventoryStatus: string;
  supplier: string;
  realSupplierProduct: boolean;
  manualCurated: boolean;
  buyable: boolean;
  deliveryEstimate: string;
  sourceUrl: string;
  metadataPublic: Record<string, unknown>;
};
