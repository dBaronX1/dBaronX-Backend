import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class WalletAdjustmentDto {
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
  @MaxLength(240)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
