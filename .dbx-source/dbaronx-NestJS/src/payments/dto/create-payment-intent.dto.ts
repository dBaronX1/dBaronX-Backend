import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsOptional()
  @IsString()
  manual_order_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public_reference?: string;

  @IsString()
  @MaxLength(80)
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider_reference?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string = 'USD';
}