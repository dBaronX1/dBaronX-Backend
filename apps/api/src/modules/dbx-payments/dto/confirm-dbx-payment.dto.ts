import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class ConfirmDbxPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  intentReference!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  transactionSignature!: string;
}
