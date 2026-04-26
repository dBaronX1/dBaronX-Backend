import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CommerceSettlementDto {
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
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  affiliateUserId?: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  grossAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  supplierCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  affiliateCommission?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalReference?: string;
}
