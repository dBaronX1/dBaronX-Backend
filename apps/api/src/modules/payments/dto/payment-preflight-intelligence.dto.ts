import {
  ArrayMaxSize,
  IsBoolean,
  IsIP,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PaymentRecentIpEventDto {
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

export class PaymentPreflightIntelligenceDto {
  @IsString()
  @MaxLength(120)
  orderId!: string;

  @IsString()
  @MaxLength(120)
  accountId!: string;

  @IsIP()
  ip!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  failedPayments24h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  attemptsLast1h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  distinctCardsLast24h?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  distinctAccountsFromIp24h?: number;

  @IsOptional()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PaymentRecentIpEventDto)
  recentIpEvents?: PaymentRecentIpEventDto[];

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
