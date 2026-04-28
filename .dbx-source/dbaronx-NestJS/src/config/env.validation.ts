import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class EnvVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsString()
  FRONTEND_URL: string;

  @IsOptional()
  @IsString()
  SUPABASE_URL?: string;

  @IsOptional()
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsOptional()
  @IsString()
  TELEGRAM_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  TELEGRAM_ADMIN_CHAT_ID?: string;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  PAYSTACK_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  PAYSTACK_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  MEDUSA_BASE_URL?: string;

  @IsOptional()
  @IsString()
  MEDUSA_API_KEY?: string;
}