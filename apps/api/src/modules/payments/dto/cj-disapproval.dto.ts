import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const REASONS = ["fraud_risk", "address_issue", "stock_issue", "shipping_cost_issue", "customer_request", "manual_review"] as const;

export class CjDisapprovalDto {
  @IsIn(REASONS)
  reason!: (typeof REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(800)
  note?: string;
}
