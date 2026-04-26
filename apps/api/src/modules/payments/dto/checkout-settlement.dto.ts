import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class CheckoutSettlementDto {
  @IsString()
  @MaxLength(120)
  orderId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerId?: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  grossAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
