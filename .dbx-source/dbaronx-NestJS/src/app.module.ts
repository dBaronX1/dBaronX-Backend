import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { SupabaseModule } from './integrations/supabase/supabase.module';
import { TelegramModule } from './integrations/telegram/telegram.module';
import { MedusaModule } from './integrations/medusa/medusa.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    AppConfigModule,
    SupabaseModule,
    TelegramModule,
    MedusaModule,
    HealthModule,
    ProductsModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}