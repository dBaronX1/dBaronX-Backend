import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CheckoutItemDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsString()
  product_name!: string;

  @IsOptional()
  @IsString()
  product_handle?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unit_price!: number;
}