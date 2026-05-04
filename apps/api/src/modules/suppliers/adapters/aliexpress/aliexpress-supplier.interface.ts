export interface AliexpressSupplierImportShape {
  sourceListingUrl: string;
  title: string;
  supplierScore?: number;
  vetting: { rating?: number; orderVolume?: number; shipFrom?: string; notes?: string };
  manualFulfillmentFallback: true;
}

export interface AliexpressSupplierEnvContract {
  ALIEXPRESS_APP_KEY?: string;
  ALIEXPRESS_APP_SECRET?: string;
  ALIEXPRESS_TRACKING_ID?: string;
}
