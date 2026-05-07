export interface CjProductSearchDto {
  keyword: string;
  page?: number;
  pageSize?: number;
}

export interface CjProductImportDto {
  cjProductId: string;
  targetSku: string;
  marginPct: number;
}

export interface CjProductImportReadinessDto {
  productId?: string;
  sku?: string;
  supplierProductId?: string;
  supplierSku?: string;
  title?: string;
  costPrice?: number;
  currency?: string;
  shippingCountries?: string[];
  deliveryEstimate?: string;
  images?: string[];
  sourceUrl?: string;
  rawAvailable?: boolean;
}

export interface CjNormalizedSupplierMetadata {
  supplier: "cj";
  supplierProductId: string;
  supplierSku: string;
  title: string;
  costPrice: number;
  currency: string;
  shippingCountries: string[];
  deliveryEstimate?: string;
  images: string[];
  sourceUrl?: string;
  rawAvailable: boolean;
}

export interface CjFulfillmentRequestDto {
  supplierOrderId: string;
  lines: Array<{ cjVariantId: string; quantity: number }>;
}

export interface CjOrderStatusSyncDto {
  supplierOrderId: string;
  status: "created" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
}
