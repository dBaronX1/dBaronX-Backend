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
  supplierProductId: string;
  supplierSku: string;
  costPrice: number;
  shippingCountries: string[];
  deliveryEstimate?: string;
  sourceUrl?: string;
}

export interface CjNormalizedSupplierMetadata {
  supplier: "cj";
  supplierProductId: string;
  supplierSku: string;
  costPrice: number;
  shippingCountries: string[];
  deliveryEstimate?: string;
  sourceUrl?: string;
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
