import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class RegisterCampaignSpendDto {
  @IsString()
  @MaxLength(120)
  campaignId!: string;

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
  eventReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
