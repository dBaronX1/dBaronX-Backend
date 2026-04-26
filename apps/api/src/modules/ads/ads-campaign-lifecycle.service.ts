import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { RegisterCampaignSpendDto } from "./dto/register-campaign-spend.dto";
import { UpdateCampaignStatusDto } from "./dto/update-campaign-status.dto";

@Injectable()
export class AdsCampaignLifecycleService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async updateStatus(body: UpdateCampaignStatusDto, requestId?: string) {
    const campaign = await this.getCampaignOrThrow(body.campaignId);

    const allowed: Record<string, string[]> = {
      budget_held: ["active", "cancelled"],
      active: ["paused", "completed", "cancelled"],
      paused: ["active", "completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!allowed[String(campaign.status || "budget_held")]?.includes(body.status)) {
      throw new BadRequestException({
        success: false,
        message: "Invalid campaign lifecycle transition",
        currentStatus: campaign.status,
        requestedStatus: body.status,
      });
    }

    if (body.status === "cancelled" && Number(campaign.remaining_budget || 0) > 0) {
      const activeHold = await this.findActiveCampaignHold(campaign.advertiser_id);

      if (activeHold) {
        await this.walletOrchestration.releaseFunds(
          {
            holdId: activeHold.id,
            actorId: body.actorId,
            reason: body.note || "Campaign cancelled",
            metadata: body.metadata,
          },
          requestId,
        );
      }
    }

    const { data, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .update({
        status: body.status,
        metadata: {
          ...(campaign.metadata || {}),
          ...(body.metadata || {}),
          lifecycle: {
            note: body.note || null,
            updatedAt: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.campaignId)
      .select("*")
      .single();

    if (error) throw error;

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "ads_campaign_status_update",
      routePath: "/api/v1/ads/campaigns/status",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        previousStatus: campaign.status,
        nextStatus: body.status,
      },
      tags: ["ads", "campaign", "lifecycle"],
    });

    return {
      success: true,
      campaign: data,
    };
  }

  async registerSpend(body: RegisterCampaignSpendDto, requestId?: string) {
    const campaign = await this.getCampaignOrThrow(body.campaignId);

    if (campaign.status !== "active") {
      throw new BadRequestException({
        success: false,
        message: "Campaign is not active",
        campaignStatus: campaign.status,
      });
    }

    const spent = Number(campaign.spent_budget || 0);
    const budget = Number(campaign.budget || 0);
    const remaining = budget - spent;

    if (body.amount > remaining) {
      throw new BadRequestException({
        success: false,
        message: "Campaign spend exceeds remaining budget",
        remainingBudget: remaining,
      });
    }

    const nextSpent = spent + body.amount;
    const nextRemaining = budget - nextSpent;

    const { data, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .update({
        spent_budget: nextSpent,
        remaining_budget: nextRemaining,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(campaign.metadata || {}),
          ...(body.metadata || {}),
          spend: {
            eventReference: body.eventReference || null,
            lastAmount: body.amount,
            registeredAt: new Date().toISOString(),
          },
        },
      })
      .eq("id", body.campaignId)
      .select("*")
      .single();

    if (error) throw error;

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "ads_campaign_spend_register",
      routePath: "/api/v1/ads/campaigns/spend",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        remainingBudget: nextRemaining,
      },
      tags: ["ads", "campaign", "spend"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "ads-campaign-spend",
      status: nextRemaining > 0 ? "ready" : "degraded",
      blockers: nextRemaining > 0 ? [] : ["campaign_budget_exhausted"],
      payload: {
        campaignId: body.campaignId,
        nextSpent,
        nextRemaining,
      },
    });

    return {
      success: true,
      campaign: data,
    };
  }

  private async getCampaignOrThrow(campaignId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new NotFoundException({
        success: false,
        message: "Campaign not found",
      });
    }

    return data;
  }

  private async findActiveCampaignHold(advertiserId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("user_id", advertiserId)
      .eq("reference_type", "ad_campaign_budget")
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
