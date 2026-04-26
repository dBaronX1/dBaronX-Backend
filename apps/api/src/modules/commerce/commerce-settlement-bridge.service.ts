import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { WalletLedgerService } from "../wallet/wallet-ledger.service";
import { CommerceSettlementDto } from "./dto/commerce-settlement.dto";

@Injectable()
export class CommerceSettlementBridgeService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly walletLedger: WalletLedgerService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async settle(body: CommerceSettlementDto, requestId?: string) {
    const supplierCost = Number(body.supplierCost || 0);
    const affiliateCommission = Number(body.affiliateCommission || 0);
    const grossAmount = Number(body.grossAmount);

    if (supplierCost + affiliateCommission > grossAmount) {
      throw new BadRequestException({
        success: false,
        message: "Settlement components exceed gross amount",
      });
    }

    const merchantNet = grossAmount - supplierCost - affiliateCommission;

    const { data: settlement, error } = await this.supabase
      .getClient()
      .from("commerce_settlements")
      .insert({
        medusa_order_id: body.medusaOrderId,
        customer_id: body.customerId || null,
        supplier_id: body.supplierId || null,
        affiliate_user_id: body.affiliateUserId || null,
        currency: body.currency.toUpperCase(),
        gross_amount: grossAmount,
        supplier_cost: supplierCost,
        affiliate_commission: affiliateCommission,
        merchant_net: merchantNet,
        external_reference: body.externalReference || null,
        actor_id: body.actorId || null,
        status: "settled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (body.affiliateUserId && affiliateCommission > 0) {
      await this.walletLedger.createLedgerEntry({
        userId: body.affiliateUserId,
        currency: body.currency,
        amount: affiliateCommission,
        direction: "credit",
        source: "affiliate_payout",
        referenceId: settlement.id,
        referenceType: "commerce_settlement_affiliate",
        description: `Affiliate commission for order ${body.medusaOrderId}`,
        metadata: {
          settlementId: settlement.id,
          medusaOrderId: body.medusaOrderId,
        },
      });
    }

    if (body.customerId && merchantNet > 0) {
      await this.walletLedger.createLedgerEntry({
        userId: body.customerId,
        currency: body.currency,
        amount: grossAmount,
        direction: "debit",
        source: "checkout_payment",
        referenceId: settlement.id,
        referenceType: "commerce_settlement_checkout",
        description: `Checkout settlement for order ${body.medusaOrderId}`,
        metadata: {
          settlementId: settlement.id,
          medusaOrderId: body.medusaOrderId,
        },
      });
    }

    if (body.supplierId && supplierCost > 0) {
      await this.walletOrchestration.holdFunds(
        {
          userId: body.supplierId,
          currency: body.currency,
          amount: supplierCost,
          referenceId: settlement.id,
          referenceType: "supplier_settlement",
          reason: `Supplier settlement hold for order ${body.medusaOrderId}`,
          metadata: {
            settlementId: settlement.id,
            medusaOrderId: body.medusaOrderId,
          },
        },
        requestId,
      );
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "commerce_settlement",
      routePath: "/api/v1/commerce/settlements",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: settlement,
      metadata: {
        merchantNet,
      },
      tags: ["commerce", "settlement", "bridge"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-settlement-bridge",
      status: "ready",
      payload: {
        settlementId: settlement.id,
        medusaOrderId: body.medusaOrderId,
        currency: body.currency,
        grossAmount,
        merchantNet,
      },
    });

    return {
      success: true,
      settlement,
    };
  }
}
