import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class SubmitDbxPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  intentReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  transactionSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  txHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  senderWallet?: string;
}
