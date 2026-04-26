export type AiProvider = "openai" | "anthropic" | "gemini";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiRequest {
  messages: AiMessage[];
  provider?: AiProvider;
  stream?: boolean;
}

export interface AiResponse {
  success: boolean;
  provider: AiProvider;
  content: string;
  tokensUsed?: number;
  error?: string;
}

export interface AiStoryEntity {
  id: string;
  userId?: string | null;
  title?: string | null;
  content: string;
  provider: AiProvider;
  createdAt: string;
}
