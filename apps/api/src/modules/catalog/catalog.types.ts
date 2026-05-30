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
  supplier: "cj" | string;
  realSupplierProduct: boolean;
  manualCurated: boolean;
  buyable: boolean;
  deliveryEstimate: string;
  sourceUrl: string;
  metadataPublic: Record<string, unknown>;
};

export type CatalogProductsResponse = {
  success: boolean;
  products: PublicCatalogProduct[];
  count: number;
  source: "medusa";
  warnings: string[];
};
