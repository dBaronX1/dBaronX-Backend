import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @MaxLength(120)
  advertiserId!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsString()
  @MaxLength(40)
  campaignType!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  budget!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
