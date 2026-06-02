import { IsIn, IsOptional } from "class-validator";
import { CreateStripeCheckoutSessionDto } from "./create-stripe-checkout-session.dto";

export class CreateCheckoutSessionDto extends CreateStripeCheckoutSessionDto {
  @IsOptional()
  @IsIn(["stripe", "paystack"])
  paymentProvider: "stripe" | "paystack" = "stripe";

  @IsOptional()
  @IsIn(["stripe", "paystack"])
  provider?: "stripe" | "paystack";

  @IsOptional()
  @IsIn(["stripe", "paystack"])
  paymentMethod?: "stripe" | "paystack";

  @IsOptional()
  @IsIn(["stripe", "paystack"])
  payment_method?: "stripe" | "paystack";

  @IsOptional()
  @IsIn(["stripe", "paystack"])
  selectedPaymentMethod?: "stripe" | "paystack";

  @IsOptional()
  referredByCode?: string;

  @IsOptional()
  referralCode?: string;
}
