import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { UpdateStoryCampaignStatusDto } from "./dto/update-story-campaign-status.dto";

@Injectable()
export class AiStoryCampaignLifecycleService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async updateStatus(body: UpdateStoryCampaignStatusDto, requestId?: string) {
    const campaign = await this.getCampaignOrThrow(body.campaignId);

    const allowed: Record<string, string[]> = {
      budget_held: ["review", "cancelled"],
      review: ["scheduled", "cancelled"],
      scheduled: ["active", "cancelled"],
      active: ["paused", "completed", "cancelled"],
      paused: ["active", "completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!allowed[String(campaign.status || "budget_held")]?.includes(body.status)) {
      throw new BadRequestException({
        success: false,
        message: "Invalid AI story campaign lifecycle transition",
        currentStatus: campaign.status,
        requestedStatus: body.status,
      });
    }

    if (body.status === "cancelled") {
      const hold = await this.findActiveStoryHold(campaign.creator_account_id);
      if (hold) {
        await this.walletOrchestration.releaseFunds(
          {
            holdId: hold.id,
            actorId: body.actorId,
            reason: body.note || "AI story campaign cancelled",
            metadata: body.metadata,
          },
          requestId,
        );
      }
    }

    const { data, error } = await this.supabase
      .getClient()
      .from("ai_story_campaigns")
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
      flowType: "ai_story_campaign_status_update",
      routePath: "/api/v1/ai-stories/campaigns/status",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        previousStatus: campaign.status,
        nextStatus: body.status,
      },
      tags: ["ai-stories", "campaign", "lifecycle"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "ai-story-campaign-lifecycle",
      status:
        body.status === "cancelled" ? "degraded" : "ready",
      blockers: body.status === "cancelled" ? ["story_campaign_cancelled"] : [],
      payload: {
        campaignId: body.campaignId,
        status: body.status,
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
      .from("ai_story_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new NotFoundException({
        success: false,
        message: "AI story campaign not found",
      });
    }
    return data;
  }

  private async findActiveStoryHold(creatorAccountId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("user_id", creatorAccountId)
      .eq("reference_type", "story_campaign_budget")
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
