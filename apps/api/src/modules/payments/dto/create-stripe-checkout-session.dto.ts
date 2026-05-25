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
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cartId?: string;

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

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency: string = "usd";

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  successUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  cancelUrl?: string;


  @IsOptional()
  @IsString()
  @MaxLength(120)
  metadataSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

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
  @MaxLength(180)
  handle?: string;

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
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  zip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  postcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  product_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  variant_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  product_handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  product_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image_url?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitPriceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  unit_price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplier_product_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplier_sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  checkout_ref?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cart_id?: string;
}
