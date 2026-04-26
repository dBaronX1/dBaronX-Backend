import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateDbxPaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  cartId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  medusaOrderId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(96)
  customerName!: string;

  @IsInt()
  @Min(1)
  expectedUsdCents!: number;

  @IsInt()
  @Min(1)
  expectedDbxBaseUnits!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  senderWallet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
