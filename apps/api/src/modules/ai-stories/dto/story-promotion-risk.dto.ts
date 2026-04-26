import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class StoryPromotionRiskDto {
  @IsString()
  @MaxLength(120)
  creatorAccountId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(120000)
  content!: string;

  @IsObject()
  creatorProfile!: Record<string, unknown>;

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
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120000, { each: true })
  comparisonContents?: string[];

  @IsOptional()
  @IsObject()
  marketContext?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  storyPromotionCount30d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  creatorChargebacks365d?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averageStorySpend90d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  accountAgeDays?: number;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  completedOrders?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  successfulWatches30d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  deniedWatches30d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  affiliatePayoutRejections180d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  chargebacks365d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  policyFlags180d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  deviceCount30d?: number;
}
