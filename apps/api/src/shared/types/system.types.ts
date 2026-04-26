export interface HealthDependency {
  ok: boolean;
  source: string;
  error?: string;
}

export interface DetailedHealthResponse {
  success: boolean;
  service: string;
  status: "healthy" | "degraded" | "not_ready";
  dependencies: Record<string, HealthDependency>;
  timestamp: string;
  uptime?: number;
  memory?: NodeJS.MemoryUsage;
}

export interface RequestContextData {
  requestId: string;
  ip?: string;
  forwardedFor?: string;
  userAgent?: string;
  actorUserId?: string;
  actorRole?: string;
  startedAt: number;
}

export interface StandardSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
  timestamp: string;
}

export interface StandardErrorResponse {
  success: false;
  message: string;
  code?: string | number;
  details?: unknown;
  timestamp: string;
}
