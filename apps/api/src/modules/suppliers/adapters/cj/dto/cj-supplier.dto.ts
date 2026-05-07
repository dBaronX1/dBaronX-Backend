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

export interface CjExplicitProductLookupDto {
  cjProductId?: string;
  cjSku?: string;
}

export interface CjProductImportReadinessDto extends CjExplicitProductLookupDto {
  costPrice?: number;
  shippingCountries?: string[];
  deliveryEstimate?: string;
  sourceUrl?: string;
}

export interface NormalizedCjSupplierMetadata {
  supplier: "cj";
  supplierProductId: string;
  supplierSku: string;
  costPrice: number | null;
  shippingCountries: string[];
  deliveryEstimate: string | null;
  sourceUrl: string | null;
}

export interface CjImportPreparedPayload {
  supplierImportReady: boolean;
  blockers: string[];
  metadata: NormalizedCjSupplierMetadata | null;
  medusaProductMetadataPreview: {
    supplier: "cj";
    supplierProductId: string;
    supplierSku: string;
    costPrice: number | null;
    shippingCountries: string[];
    deliveryEstimate: string | null;
    sourceUrl: string | null;
  } | null;
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
