import {
  IsNumber,
  IsString,
  Length,
  MaxLength,
  Min,
} from "class-validator";

export class PayoutEligibilityDto {
  @IsString()
  @MaxLength(120)
  userId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @Min(0.000001)
  requestedAmount!: number;
}
