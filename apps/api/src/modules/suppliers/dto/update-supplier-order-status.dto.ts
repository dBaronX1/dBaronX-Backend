import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateSupplierOrderStatusDto {
  @IsString()
  @MaxLength(120)
  supplierOrderId!: string;

  @IsString()
  @IsIn([
    "created",
    "accepted",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "failed",
  ])
  status!:
    | "created"
    | "accepted"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "failed";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  carrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
