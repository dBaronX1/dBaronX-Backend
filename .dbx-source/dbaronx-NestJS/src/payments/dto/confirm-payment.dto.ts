import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  confirmed_by?: string = 'admin';
}