import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { AiStoryIntelligenceService } from "./ai-story-intelligence.service";
import { CreateStoryCampaignDto } from "./dto/create-story-campaign.dto";

@Injectable()
export class AiStoryCampaignOrchestrationService {
  constructor(
    private readonly aiStoryIntelligence: AiStoryIntelligenceService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
    private readonly supabase: SupabaseService,
  ) {}

  async createCampaign(body: CreateStoryCampaignDto, requestId?: string) {
    const risk = await this.aiStoryIntelligence.promotionRisk(
      {
        creatorAccountId: body.creatorAccountId,
        title: body.title,
        content: body.content,
        creatorProfile: body.creatorProfile || {},
        targetChannel: body.targetChannel,
        proposedSpendAmount: body.proposedSpendAmount,
        prompt: body.prompt,
        language: body.language,
        tags: body.tags,
        marketContext: body.marketContext,
      } as any,
      requestId,
    );

    await this.walletOrchestration.holdFunds(
      {
        userId: body.creatorAccountId,
        currency: "USD",
        amount: body.proposedSpendAmount,
        referenceId: body.creatorAccountId,
        referenceType: "story_campaign_budget",
        reason: `Story campaign hold: ${body.title}`,
        metadata: {
          targetChannel: body.targetChannel,
        },
      },
      requestId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("ai_story_campaigns")
      .insert({
        creator_account_id: body.creatorAccountId,
        title: body.title,
        content: body.content,
        target_channel: body.targetChannel,
        proposed_spend_amount: body.proposedSpendAmount,
        prompt: body.prompt || null,
        language: body.language || null,
        tags: body.tags || [],
        creator_profile: body.creatorProfile || {},
        market_context: body.marketContext || {},
        risk_payload: risk.creatorPromotionRisk,
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
      flowType: "ai_story_campaign_create",
      routePath: "/api/v1/ai-stories/campaigns",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        targetChannel: body.targetChannel,
      },
      tags: ["ai-stories", "campaign", "budget-hold"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "ai-story-campaign-orchestration",
      status: "ready",
      payload: {
        campaignId: data.id,
        creatorAccountId: body.creatorAccountId,
        targetChannel: body.targetChannel,
      },
    });

    return {
      success: true,
      campaign: data,
      risk: risk.creatorPromotionRisk,
    };
  }
}
