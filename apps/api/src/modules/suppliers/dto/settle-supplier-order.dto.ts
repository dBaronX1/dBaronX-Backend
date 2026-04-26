import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class SettleSupplierOrderDto {
  @IsString()
  @MaxLength(120)
  supplierOrderId!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  amount!: number;

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
  @MaxLength(240)
  note?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
