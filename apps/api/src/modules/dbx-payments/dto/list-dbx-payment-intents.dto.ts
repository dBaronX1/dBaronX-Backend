import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import type { DbxPaymentStatus } from "../types/dbx-payment.types";

const DBX_PAYMENT_STATUS_VALUES: DbxPaymentStatus[] = [
  "pending",
  "submitted",
  "verified",
  "verified_pending_order_sync",
  "completed",
  "expired",
  "failed",
];

export class ListDbxPaymentIntentsDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  cartId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  medusaOrderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsIn(DBX_PAYMENT_STATUS_VALUES)
  status?: DbxPaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  transactionSignature?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sortBy?: "created_at" | "updated_at" | "expires_at" | "status" = "created_at";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDirection?: "asc" | "desc" = "desc";
}