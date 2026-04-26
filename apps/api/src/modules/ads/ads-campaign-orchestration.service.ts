import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";

@Injectable()
export class AdsCampaignOrchestrationService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async createCampaign(body: CreateCampaignDto, requestId?: string) {
    await this.walletOrchestration.holdFunds(
      {
        userId: body.advertiserId,
        currency: body.currency,
        amount: body.budget,
        referenceId: body.advertiserId,
        referenceType: "ad_campaign_budget",
        reason: `Campaign budget hold: ${body.title}`,
        metadata: body.metadata,
      },
      requestId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .insert({
        advertiser_id: body.advertiserId,
        title: body.title,
        description: body.description || null,
        campaign_type: body.campaignType,
        currency: body.currency.toUpperCase(),
        budget: body.budget,
        actor_id: body.actorId || null,
        metadata: body.metadata || {},
        status: "budget_held",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "ads_campaign_create",
      routePath: "/api/v1/ads/campaigns",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        campaignType: body.campaignType,
      },
      tags: ["ads", "campaign", "budget-hold"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "ads-campaign-orchestration",
      status: "ready",
      payload: {
        campaignId: data.id,
        advertiserId: body.advertiserId,
        budget: body.budget,
      },
    });

    return {
      success: true,
      campaign: data,
    };
  }
}
