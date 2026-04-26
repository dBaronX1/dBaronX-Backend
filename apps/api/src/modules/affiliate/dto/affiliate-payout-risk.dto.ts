import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIP,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class AffiliateRecentIpEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(8)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  asn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}

class AffiliateVelocitySnapshotDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  clicksLast10m?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  clicksLast1h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  distinctIpsLast1h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  signupsLast24h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  qualifiedWatchesLast24h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  payoutsRequestedLast7d?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duplicateDeviceClustersLast24h?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  conversionRate24h?: number;
}

export class AffiliatePayoutRiskDto {
  @IsString()
  @MaxLength(120)
  accountId!: string;

  @IsNumber()
  @Min(0.000001)
  payoutAmount!: number;

  @IsString()
  @MaxLength(40)
  payoutMethod!: string;

  @IsIP()
  ip!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AffiliateRecentIpEventDto)
  recentIpEvents?: AffiliateRecentIpEventDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  distinctAccounts24h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  failedCaptcha1h?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AffiliateVelocitySnapshotDto)
  affiliateVelocity?: AffiliateVelocitySnapshotDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  recentPayoutRequests30d?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averagePayoutAmount90d?: number;

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
