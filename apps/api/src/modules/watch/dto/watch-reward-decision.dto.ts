import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsIP,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class RecentIpEventDto {
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

export class WatchRewardDecisionDto {
  @IsString()
  @MaxLength(120)
  sessionId!: string;

  @IsString()
  @MaxLength(120)
  accountId!: string;

  @IsIP()
  ip!: string;

  @IsInt()
  @Min(1)
  @Max(86400)
  declaredDurationSeconds!: number;

  @IsArray()
  @ArrayMaxSize(10000)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(600000, { each: true })
  heartbeatIntervalsMs!: number[];

  @IsInt()
  @Min(0)
  @Max(100000)
  totalHeartbeats!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hiddenEventCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  blurEventCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seekEventCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(5)
  playbackRateMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  mutedRatio?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duplicateClaimAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  distinctAccounts24h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  failedCaptcha1h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  deniedWatchClaims24h?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentIpEventDto)
  recentIpEvents?: RecentIpEventDto[];

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
