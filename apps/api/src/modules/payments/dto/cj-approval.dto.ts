import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CjApprovalDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  idempotencyKey?: string;

  @IsOptional()
  @IsBoolean()
  overrideStockShippingChecks?: boolean;

  @IsOptional()
  @IsString()
  approvalNote?: string;
}
