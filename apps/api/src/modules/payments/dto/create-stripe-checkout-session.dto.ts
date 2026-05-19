import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class CreateStripeCheckoutSessionDto {
  @IsString()
  @MaxLength(120)
  cartId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderIntentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  checkoutRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerRef?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  supplierRefs?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  variantId?: string;

  @IsOptional()
  @IsIn(["test", "live"])
  checkoutMode: "test" | "live" = "test";

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency: string = "usd";

  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  successUrl!: string;

  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  cancelUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  productName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  metadataSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierProductId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierSku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  handle?: string;
}
