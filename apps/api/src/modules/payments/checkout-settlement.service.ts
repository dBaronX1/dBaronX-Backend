import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletLedgerService } from "../wallet/wallet-ledger.service";
import { CheckoutSettlementDto } from "./dto/checkout-settlement.dto";

@Injectable()
export class CheckoutSettlementService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletLedger: WalletLedgerService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async settle(body: CheckoutSettlementDto, requestId?: string) {
    const taxAmount = Number(body.taxAmount || 0);
    const shippingAmount = Number(body.shippingAmount || 0);
    const discountAmount = Number(body.discountAmount || 0);
    const grossAmount = Number(body.grossAmount);
    const netAmount = grossAmount + taxAmount + shippingAmount - discountAmount;

    const { data, error } = await this.supabase
      .getClient()
      .from("checkout_settlements")
      .insert({
        order_id: body.orderId,
        customer_id: body.customerId || null,
        currency: body.currency.toUpperCase(),
        gross_amount: grossAmount,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
        actor_id: body.actorId || null,
        external_reference: body.externalReference || null,
        metadata: body.metadata || {},
        status: "settled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (body.customerId) {
      await this.walletLedger.createLedgerEntry({
        userId: body.customerId,
        currency: body.currency,
        amount: netAmount,
        direction: "debit",
        source: "checkout_payment",
        referenceId: data.id,
        referenceType: "checkout_settlement",
        description: `Checkout settlement for order ${body.orderId}`,
        metadata: {
          orderId: body.orderId,
          externalReference: body.externalReference || null,
        },
      });
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "checkout_settlement",
      routePath: "/api/v1/payments/checkout-settlement",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        netAmount,
      },
      tags: ["payments", "checkout", "settlement"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "checkout-settlement",
      status: "ready",
      payload: {
        settlementId: data.id,
        orderId: body.orderId,
        currency: body.currency,
        netAmount,
      },
    });

    return {
      success: true,
      checkoutSettlement: data,
    };
  }
}
