import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class RetryDbxOrderSyncDto {
  @IsString()
  @MaxLength(128)
  reference!: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}