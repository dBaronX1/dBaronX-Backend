import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CheckoutItemDto } from './checkout-item.dto';

export class CreateCheckoutDto {
  @IsString()
  @MaxLength(150)
  customer_name!: string;

  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customer_phone?: string;

  @IsString()
  @MaxLength(120)
  country!: string;

  @IsString()
  @MaxLength(255)
  address_line_1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_line_2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  postal_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string = 'USD';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsNumber()
  @Min(0)
  total_amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string = 'website';
}