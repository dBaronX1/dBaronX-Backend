import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class CreateLedgerEntryDto {
  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  amount!: number;

  @IsString()
  @IsIn(["credit", "debit"])
  direction!: "credit" | "debit";

  @IsString()
  @IsIn([
    "watch_reward",
    "affiliate_payout",
    "checkout_payment",
    "manual_adjustment",
    "story_promotion",
    "supplier_settlement",
    "refund",
  ])
  source!: string;

  @IsString()
  @MaxLength(160)
  referenceId!: string;

  @IsString()
  @MaxLength(80)
  referenceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
