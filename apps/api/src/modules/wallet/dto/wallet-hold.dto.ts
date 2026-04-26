import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class WalletHoldDto {
  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  amount!: number;

  @IsString()
  @MaxLength(160)
  referenceId!: string;

  @IsString()
  @MaxLength(80)
  referenceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
