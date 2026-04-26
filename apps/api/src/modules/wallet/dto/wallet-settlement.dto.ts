import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class WalletSettlementDto {
  @IsString()
  @MaxLength(120)
  holdId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  settlementReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  settlementReferenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
