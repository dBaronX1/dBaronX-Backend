import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { ScheduleStoryCampaignDto } from "./dto/schedule-story-campaign.dto";

@Injectable()
export class AiStoryCampaignSchedulerService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async schedule(body: ScheduleStoryCampaignDto, requestId?: string) {
    const { data: campaign, error: loadError } = await this.supabase
      .getClient()
      .from("ai_story_campaigns")
      .select("*")
      .eq("id", body.campaignId)
      .maybeSingle();

    if (loadError) {
      throw loadError;
    }

    if (!campaign) {
      throw new NotFoundException({
        success: false,
        message: "AI story campaign not found",
      });
    }

    if (!["review", "scheduled", "paused"].includes(String(campaign.status))) {
      throw new BadRequestException({
        success: false,
        message: "Campaign is not schedulable from current state",
        currentStatus: campaign.status,
      });
    }

    const { data, error } = await this.supabase
      .getClient()
      .from("ai_story_campaigns")
      .update({
        status: "scheduled",
        scheduled_at: body.scheduledAt,
        distribution_channels: body.distributionChannels || [],
        target_locales: body.targetLocales || [],
        metadata: {
          ...(campaign.metadata || {}),
          ...(body.metadata || {}),
          scheduling: {
            scheduledAt: body.scheduledAt,
            actorId: body.actorId || null,
            updatedAt: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.campaignId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "ai_story_campaign_schedule",
      routePath: "/api/v1/ai-stories/campaigns/schedule",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        scheduledAt: body.scheduledAt,
      },
      tags: ["ai-stories", "campaign", "schedule"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "ai-story-campaign-scheduler",
      status: "ready",
      payload: {
        campaignId: body.campaignId,
        scheduledAt: body.scheduledAt,
      },
    });

    return {
      success: true,
      campaign: data,
    };
  }
}
