import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class DbxPaymentAdminActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  reference!: string;

  @IsIn([
    "retry_order_sync",
    "mark_failed",
    "expire",
    "add_note",
  ])
  action!: "retry_order_sync" | "mark_failed" | "expire" | "add_note";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}