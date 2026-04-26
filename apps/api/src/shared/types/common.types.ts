export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type ISODateString = string;
export type UUIDString = string;
export type CurrencyCode = string;

export interface TimestampedEntity {
  createdAt: ISODateString;
  updatedAt?: ISODateString;
}

export interface SoftDeletedEntity {
  deletedAt?: ISODateString | null;
}

export interface MetadataEntity {
  metadata?: Record<string, unknown>;
}

export interface IdempotentRequest {
  idempotencyKey?: string | null;
}

export interface ActorContext {
  actorUserId?: string | null;
  actorRole?: string | null;
  actorSource?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ListResult<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  cursor?: string | null;
  hasNextPage?: boolean;
}

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  error?: unknown;
}

export type SortDirection = "asc" | "desc";

export interface QuerySort {
  field: string;
  direction: SortDirection;
}

export interface DateRange {
  from?: ISODateString | null;
  to?: ISODateString | null;
}