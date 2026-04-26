import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class ManualOrderSyncDto {
  @IsString()
  @MaxLength(120)
  medusaOrderId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  affiliateUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalReference?: string;

  @IsString()
  @IsIn(["create", "update", "reconcile"])
  syncMode!: "create" | "update" | "reconcile";

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
