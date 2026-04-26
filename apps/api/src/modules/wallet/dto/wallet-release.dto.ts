import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class WalletReleaseDto {
  @IsString()
  @MaxLength(120)
  holdId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
