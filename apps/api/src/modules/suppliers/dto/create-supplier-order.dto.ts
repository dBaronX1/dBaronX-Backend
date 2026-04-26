import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateSupplierOrderDto {
  @IsString()
  @MaxLength(120)
  supplierId!: string;

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

  @IsArray()
  items!: Array<Record<string, unknown>>;

  @IsOptional()
  @IsObject()
  shippingAddress?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
