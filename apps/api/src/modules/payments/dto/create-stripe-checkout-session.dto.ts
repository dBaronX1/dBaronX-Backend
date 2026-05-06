import {
  IsArray,
  IsEmail,
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
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  supplierRefs?: string[];

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
}
