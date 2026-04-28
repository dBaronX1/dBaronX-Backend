import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitPaymentProofDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proof_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  payer_name?: string;

  @IsOptional()
  @IsEmail()
  payer_email?: string;
}