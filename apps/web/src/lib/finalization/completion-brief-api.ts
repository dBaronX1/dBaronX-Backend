import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface CompletionBriefPayload {
  success: boolean;
  completionBrief: {
    aligned: boolean;
    blockerCount: number;
    blockers: string[];
    completionBand: string;
    nextAction: string;
    note: string;
  };
}

export async function getCompletionBrief(): Promise<CompletionBriefPayload> {
  return internalApiRequest<CompletionBriefPayload>(
    "/api/v1/system/completion-brief",
  );
}
