import { IsOptional, IsString, MaxLength } from "class-validator";

export interface CjProductSearchDto { keyword: string; page?: number; pageSize?: number; }
export interface CjProductImportDto { cjProductId: string; targetSku: string; marginPct: number; }
export interface CjFulfillmentRequestDto { supplierOrderId: string; lines: Array<{ cjVariantId: string; quantity: number }>; }
export interface CjOrderStatusSyncDto { supplierOrderId: string; status: "created"|"processing"|"shipped"|"delivered"|"cancelled"; trackingNumber?: string; }

export class CjImportReadinessRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;
}
