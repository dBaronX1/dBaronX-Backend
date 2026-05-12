import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class BootstrapFirstOwnerDto {
  @IsUUID()
  userId!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @MaxLength(64)
  telegramUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
