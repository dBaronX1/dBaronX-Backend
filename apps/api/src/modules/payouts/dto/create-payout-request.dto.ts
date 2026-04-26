import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class CreatePayoutRequestDto {
  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  amount!: number;

  @IsString()
  @MaxLength(40)
  payoutMethod!: string;

  @IsString()
  @MaxLength(60)
  ip!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;
}
