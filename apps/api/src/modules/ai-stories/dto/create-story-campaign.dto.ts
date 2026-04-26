import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateStoryCampaignDto {
  @IsString()
  @MaxLength(120)
  creatorAccountId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(120000)
  content!: string;

  @IsString()
  @MaxLength(40)
  targetChannel!: string;

  @IsNumber()
  @Min(0.000001)
  proposedSpendAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  creatorProfile?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  marketContext?: Record<string, unknown>;
}
