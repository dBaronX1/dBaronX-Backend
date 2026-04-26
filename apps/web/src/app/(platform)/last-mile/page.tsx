import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function LastMilePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Last Mile"
        title="Last-Mile Hardening Directory"
        description="Final last-mile routes for cleanup, confirmation, verification, and canonical brief completion."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Last-Mile Surfaces"
        items={[
          {
            href: "/final-cleanup",
            title: "Final Cleanup",
            description: "Last-stage cleanup checklist across remaining domains",
          },
          {
            href: "/final-confirmation-hub",
            title: "Final Confirmation Hub",
            description: "Directory for the confirmation and brief surfaces",
          },
          {
            href: "/completion-state",
            title: "Completion State",
            description: "Minimal final-state closure surface",
          },
          {
            href: "/completion-brief-final",
            title: "Completion Brief Final",
            description: "Final canonical completion brief route",
          },
          {
            href: "/canonical-brief",
            title: "Canonical Brief",
            description: "Brief-facing verdict route",
          },
          {
            href: "/canonical-brief-pack",
            title: "Canonical Brief Pack",
            description: "Aggregated brief support payloads",
          },
        ]}
      />
    </main>
  );
}
 
 DBX Crypto Payment System — Canonical Production Build Batch 1

This supersedes the earlier DBX payment draft. Use this as the stronger final direction.

Flow locked:

Frontend checkout
→ NestJS creates DBX payment intent
→ user pays DBX on Solana
→ FastAPI verifies transaction
→ NestJS confirms payment
→ Medusa order completes/syncs


---

DBX SQL — Supabase

Run this first.

create extension if not exists pgcrypto;

create schema if not exists app_public;

create table if not exists app_public.dbx_crypto_payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  medusa_cart_id text not null,
  medusa_order_id text,
  payment_reference text not null unique,
  dbx_mint_address text not null,
  treasury_wallet_address text not null,
  expected_dbx_amount numeric(30, 9) not null,
  expected_fiat_amount numeric(20, 4),
  fiat_currency_code text not null default 'USD',
  sender_wallet_address text,
  status text not null default 'pending',
  expires_at timestamptz not null,
  paid_at timestamptz,
  verified_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  transaction_signature text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_public.dbx_crypto_payment_verifications (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references app_public.dbx_crypto_payment_intents(id) on delete cascade,
  payment_reference text not null,
  transaction_signature text not null unique,
  sender_wallet_address text,
  receiver_wallet_address text,
  dbx_mint_address text not null,
  verified_amount numeric(30, 9) not null default 0,
  expected_amount numeric(30, 9) not null default 0,
  status text not null default 'pending',
  raw_response jsonb not null default '{}'::jsonb,
  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app_public.dbx_crypto_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid references app_public.dbx_crypto_payment_intents(id) on delete cascade,
  payment_reference text not null,
  event_type text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dbx_crypto_payment_intents_cart
  on app_public.dbx_crypto_payment_intents(medusa_cart_id);

create index if not exists idx_dbx_crypto_payment_intents_order
  on app_public.dbx_crypto_payment_intents(medusa_order_id);

create index if not exists idx_dbx_crypto_payment_intents_reference
  on app_public.dbx_crypto_payment_intents(payment_reference);

create index if not exists idx_dbx_crypto_payment_intents_status
  on app_public.dbx_crypto_payment_intents(status);

create index if not exists idx_dbx_crypto_payment_intents_user
  on app_public.dbx_crypto_payment_intents(user_id);

create index if not exists idx_dbx_crypto_payment_intents_expires
  on app_public.dbx_crypto_payment_intents(expires_at);

create index if not exists idx_dbx_crypto_payment_verifications_reference
  on app_public.dbx_crypto_payment_verifications(payment_reference);

create index if not exists idx_dbx_crypto_payment_verifications_signature
  on app_public.dbx_crypto_payment_verifications(transaction_signature);

create index if not exists idx_dbx_crypto_payment_events_reference
  on app_public.dbx_crypto_payment_events(payment_reference);

create index if not exists idx_dbx_crypto_payment_events_type
  on app_public.dbx_crypto_payment_events(event_type);

create or replace function app_public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dbx_crypto_payment_intents_updated_at on app_public.dbx_crypto_payment_intents;

create trigger trg_dbx_crypto_payment_intents_updated_at
before update on app_public.dbx_crypto_payment_intents
for each row execute function app_public.set_updated_at();

alter table app_public.dbx_crypto_payment_intents enable row level security;
alter table app_public.dbx_crypto_payment_verifications enable row level security;
alter table app_public.dbx_crypto_payment_events enable row level security;

drop policy if exists dbx_crypto_payment_intents_select_own on app_public.dbx_crypto_payment_intents;

create policy dbx_crypto_payment_intents_select_own
on app_public.dbx_crypto_payment_intents
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists dbx_crypto_payment_verifications_select_own on app_public.dbx_crypto_payment_verifications;

create policy dbx_crypto_payment_verifications_select_own
on app_public.dbx_crypto_payment_verifications
for select
to authenticated
using (
  exists (
    select 1
    from app_public.dbx_crypto_payment_intents i
    where i.id = payment_intent_id
    and i.user_id = auth.uid()
  )
);

drop policy if exists dbx_crypto_payment_events_select_own on app_public.dbx_crypto_payment_events;

create policy dbx_crypto_payment_events_select_own
on app_public.dbx_crypto_payment_events
for select
to authenticated
using (
  exists (
    select 1
    from app_public.dbx_crypto_payment_intents i
    where i.id = payment_intent_id
    and i.user_id = auth.uid()
  )
);


---

Required env

apps/api/.env

DBX_MINT_ADDRESS=4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE
DBX_TREASURY_WALLET_ADDRESS=YOUR_SOLANA_TREASURY_WALLET
DBX_PAYMENT_EXPIRY_MINUTES=30
FASTAPI_INTERNAL_URL=http://localhost:8080
INTERNAL_SERVICE_TOKEN=replace_with_same_shared_internal_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace_with_supabase_service_role_key
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_API_TOKEN=replace_if_available

apps/services-fastapi/.env

INTERNAL_SERVICE_TOKEN=replace_with_same_shared_internal_token
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
DBX_MINT_ADDRESS=4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE
DBX_TREASURY_WALLET_ADDRESS=YOUR_SOLANA_TREASURY_WALLET


---

DBX001. apps/api/src/modules/dbx-payments/types/dbx-payment.types.ts

export type DbxPaymentStatus =
  | "pending"
  | "submitted"
  | "verified"
  | "completed"
  | "expired"
  | "failed";

export interface DbxPaymentIntent {
  id: string;
  userId: string | null;
  medusaCartId: string;
  medusaOrderId: string | null;
  paymentReference: string;
  dbxMintAddress: string;
  treasuryWalletAddress: string;
  expectedDbxAmount: string;
  expectedFiatAmount: string | null;
  fiatCurrencyCode: string;
  senderWalletAddress: string | null;
  status: DbxPaymentStatus;
  expiresAt: string;
  paidAt: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  transactionSignature: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DbxPaymentInstructions {
  network: "solana";
  token: "DBX";
  sendExactAmount: string;
  tokenMint: string;
  toWallet: string;
  memo: string;
  expiresAt: string;
}

export interface DbxPaymentIntentResponse extends DbxPaymentIntent {
  provider: "crypto";
  instructions: DbxPaymentInstructions;
}

export interface DbxVerificationResult {
  verified: boolean;
  status: DbxPaymentStatus;
  paymentReference: string;
  transactionSignature: string;
  senderWalletAddress: string | null;
  receiverWalletAddress: string | null;
  verifiedAmount: string;
  expectedAmount: string;
  failureReason: string | null;
  rawResponse: Record<string, unknown>;
}

export interface DbxPaymentCompletionResult {
  completed: boolean;
  status: DbxPaymentStatus;
  medusaOrderId: string | null;
  paymentReference: string;
  failureReason: string | null;
  rawResponse: Record<string, unknown>;
}


---

DBX002. apps/api/src/modules/dbx-payments/dto/create-dbx-payment-intent.dto.ts

import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateDbxPaymentIntentDto {
  @IsString()
  @MaxLength(160)
  medusaCartId!: string;

  @IsNumber()
  @Min(0.000000001)
  expectedDbxAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedFiatAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  fiatCurrencyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  senderWalletAddress?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}


---

DBX003. apps/api/src/modules/dbx-payments/dto/verify-dbx-payment.dto.ts

import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class VerifyDbxPaymentDto {
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  paymentReference!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(200)
  transactionSignature!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  senderWalletAddress?: string;
}


---

DBX004. apps/api/src/modules/dbx-payments/dbx-payment-reference.service.ts

import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

@Injectable()
export class DbxPaymentReferenceService {
  createReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const entropy = randomBytes(8).toString("hex").toUpperCase();
    return `DBX-${timestamp}-${entropy}`;
  }
}


---

DBX005. apps/api/src/modules/dbx-payments/dbx-payment-config.service.ts

import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DbxPaymentConfigService {
  constructor(private readonly config: ConfigService) {}

  get mintAddress(): string {
    return this.required("DBX_MINT_ADDRESS");
  }

  get treasuryWalletAddress(): string {
    return this.required("DBX_TREASURY_WALLET_ADDRESS");
  }

  get fastApiInternalUrl(): string {
    return this.required("FASTAPI_INTERNAL_URL").replace(/\/+$/, "");
  }

  get internalServiceToken(): string {
    return this.required("INTERNAL_SERVICE_TOKEN");
  }

  get expiryMinutes(): number {
    const raw = this.config.get<string>("DBX_PAYMENT_EXPIRY_MINUTES") ?? "30";
    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
      return 30;
    }

    return Math.min(value, 180);
  }

  get medusaBackendUrl(): string | null {
    const value = this.config.get<string>("MEDUSA_BACKEND_URL");
    return value ? value.replace(/\/+$/, "") : null;
  }

  get medusaAdminApiToken(): string | null {
    return this.config.get<string>("MEDUSA_ADMIN_API_TOKEN") ?? null;
  }

  private required(key: string): string {
    const value = this.config.get<string>(key) ?? process.env[key];

    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }
}


---

DBX006. apps/api/src/modules/dbx-payments/dbx-payments.repository.ts

import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  DbxPaymentIntent,
  DbxPaymentStatus,
  DbxVerificationResult,
} from "./types/dbx-payment.types";

type DbxIntentRow = Record<string, any>;

@Injectable()
export class DbxPaymentsRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Missing Supabase service configuration for DBX payments.");
    }

    this.supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  async createIntent(input: {
    userId?: string | null;
    medusaCartId: string;
    paymentReference: string;
    dbxMintAddress: string;
    treasuryWalletAddress: string;
    expectedDbxAmount: number;
    expectedFiatAmount?: number;
    fiatCurrencyCode?: string;
    senderWalletAddress?: string;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
  }): Promise<DbxPaymentIntent> {
    const { data, error } = await this.supabase
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .insert({
        user_id: input.userId ?? null,
        medusa_cart_id: input.medusaCartId,
        payment_reference: input.paymentReference,
        dbx_mint_address: input.dbxMintAddress,
        treasury_wallet_address: input.treasuryWalletAddress,
        expected_dbx_amount: input.expectedDbxAmount,
        expected_fiat_amount: input.expectedFiatAmount ?? null,
        fiat_currency_code: input.fiatCurrencyCode?.toUpperCase() ?? "USD",
        sender_wallet_address: input.senderWalletAddress ?? null,
        status: "pending",
        expires_at: input.expiresAt.toISOString(),
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    await this.recordEvent({
      paymentIntentId: data.id,
      paymentReference: data.payment_reference,
      eventType: "intent_created",
      status: "pending",
      payload: data,
    });

    return this.mapIntent(data);
  }

  async findIntentByReference(
    reference: string,
  ): Promise<DbxPaymentIntent | null> {
    const { data, error } = await this.supabase
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data ? this.mapIntent(data) : null;
  }

  async updateIntent(input: {
    id: string;
    paymentReference: string;
    status: DbxPaymentStatus;
    medusaOrderId?: string | null;
    failureReason?: string | null;
    paidAt?: Date | null;
    verifiedAt?: Date | null;
    completedAt?: Date | null;
    transactionSignature?: string | null;
    metadataPatch?: Record<string, unknown>;
  }): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      status: input.status,
      failure_reason: input.failureReason ?? null,
    };

    if (input.medusaOrderId !== undefined) {
      updatePayload.medusa_order_id = input.medusaOrderId;
    }

    if (input.paidAt !== undefined) {
      updatePayload.paid_at = input.paidAt?.toISOString() ?? null;
    }

    if (input.verifiedAt !== undefined) {
      updatePayload.verified_at = input.verifiedAt?.toISOString() ?? null;
    }

    if (input.completedAt !== undefined) {
      updatePayload.completed_at = input.completedAt?.toISOString() ?? null;
    }

    if (input.transactionSignature !== undefined) {
      updatePayload.transaction_signature = input.transactionSignature;
    }

    if (input.metadataPatch !== undefined) {
      updatePayload.metadata = input.metadataPatch;
    }

    const { error } = await this.supabase
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .update(updatePayload)
      .eq("id", input.id);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    await this.recordEvent({
      paymentIntentId: input.id,
      paymentReference: input.paymentReference,
      eventType: `intent_${input.status}`,
      status: input.status,
      payload: updatePayload,
    });
  }

  async saveVerification(
    intentId: string,
    result: DbxVerificationResult,
  ): Promise<void> {
    const { error } = await this.supabase
      .schema("app_public")
      .from("dbx_crypto_payment_verifications")
      .insert({
        payment_intent_id: intentId,
        payment_reference: result.paymentReference,
        transaction_signature: result.transactionSignature,
        sender_wallet_address: result.senderWalletAddress,
        receiver_wallet_address: result.receiverWalletAddress,
        dbx_mint_address: process.env.DBX_MINT_ADDRESS,
        verified_amount: result.verifiedAmount,
        expected_amount: result.expectedAmount,
        status: result.status,
        raw_response: result.rawResponse ?? {},
        failure_reason: result.failureReason,
        verified_at: result.verified ? new Date().toISOString() : null,
      });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new InternalServerErrorException(error.message);
    }

    await this.recordEvent({
      paymentIntentId: intentId,
      paymentReference: result.paymentReference,
      eventType: "verification_saved",
      status: result.status,
      payload: result,
    });
  }

  async recordEvent(input: {
    paymentIntentId?: string | null;
    paymentReference: string;
    eventType: string;
    status: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.supabase
      .schema("app_public")
      .from("dbx_crypto_payment_events")
      .insert({
        payment_intent_id: input.paymentIntentId ?? null,
        payment_reference: input.paymentReference,
        event_type: input.eventType,
        status: input.status,
        payload: input.payload ?? {},
      });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private mapIntent(row: DbxIntentRow): DbxPaymentIntent {
    return {
      id: row.id,
      userId: row.user_id,
      medusaCartId: row.medusa_cart_id,
      medusaOrderId: row.medusa_order_id,
      paymentReference: row.payment_reference,
      dbxMintAddress: row.dbx_mint_address,
      treasuryWalletAddress: row.treasury_wallet_address,
      expectedDbxAmount: String(row.expected_dbx_amount),
      expectedFiatAmount:
        row.expected_fiat_amount == null ? null : String(row.expected_fiat_amount),
      fiatCurrencyCode: row.fiat_currency_code ?? "USD",
      senderWalletAddress: row.sender_wallet_address,
      status: row.status,
      expiresAt: row.expires_at,
      paidAt: row.paid_at,
      verifiedAt: row.verified_at,
      completedAt: row.completed_at,
      failureReason: row.failure_reason,
      transactionSignature: row.transaction_signature,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}


---

DBX007. apps/api/src/modules/dbx-payments/dbx-chain-verifier.service.ts

import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type {
  DbxPaymentIntent,
  DbxVerificationResult,
} from "./types/dbx-payment.types";
import { DbxPaymentConfigService } from "./dbx-payment-config.service";

@Injectable()
export class DbxChainVerifierService {
  constructor(private readonly config: DbxPaymentConfigService) {}

  async verify(input: {
    intent: DbxPaymentIntent;
    transactionSignature: string;
    senderWalletAddress?: string;
  }): Promise<DbxVerificationResult> {
    const response = await fetch(
      `${this.config.fastApiInternalUrl}/internal/crypto/dbx/verify`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-service-token": this.config.internalServiceToken,
        },
        body: JSON.stringify({
          payment_reference: input.intent.paymentReference,
          transaction_signature: input.transactionSignature,
          expected_dbx_amount: input.intent.expectedDbxAmount,
          dbx_mint_address: input.intent.dbxMintAddress,
          treasury_wallet_address: input.intent.treasuryWalletAddress,
          sender_wallet_address:
            input.senderWalletAddress ?? input.intent.senderWalletAddress,
        }),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new InternalServerErrorException(
        data?.detail || data?.message || "DBX verification request failed",
      );
    }

    return {
      verified: Boolean(data.verified),
      status: data.verified ? "verified" : "failed",
      paymentReference: input.intent.paymentReference,
      transactionSignature: input.transactionSignature,
      senderWalletAddress: data.sender_wallet_address ?? null,
      receiverWalletAddress: data.receiver_wallet_address ?? null,
      verifiedAmount: String(data.verified_amount ?? "0"),
      expectedAmount: input.intent.expectedDbxAmount,
      failureReason: data.failure_reason ?? null,
      rawResponse: data ?? {},
    };
  }
}


---

DBX008. apps/api/src/modules/dbx-payments/dbx-medusa-completion.service.ts

import { Injectable } from "@nestjs/common";
import { DbxPaymentConfigService } from "./dbx-payment-config.service";
import type {
  DbxPaymentCompletionResult,
  DbxPaymentIntent,
} from "./types/dbx-payment.types";

@Injectable()
export class DbxMedusaCompletionService {
  constructor(private readonly config: DbxPaymentConfigService) {}

  async completeCartAfterDbxPayment(
    intent: DbxPaymentIntent,
  ): Promise<DbxPaymentCompletionResult> {
    const medusaUrl = this.config.medusaBackendUrl;

    if (!medusaUrl) {
      return {
        completed: false,
        status: "verified",
        medusaOrderId: null,
        paymentReference: intent.paymentReference,
        failureReason: "MEDUSA_BACKEND_URL is not configured",
        rawResponse: {},
      };
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-internal-service-token": this.config.internalServiceToken,
    };

    if (this.config.medusaAdminApiToken) {
      headers.authorization = `Bearer ${this.config.medusaAdminApiToken}`;
    }

    const response = await fetch(`${medusaUrl}/store/carts/${intent.medusaCartId}/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payment_provider: "dbx_solana",
        payment_reference: intent.paymentReference,
        transaction_signature: intent.transactionSignature,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        completed: false,
        status: "verified",
        medusaOrderId: null,
        paymentReference: intent.paymentReference,
        failureReason:
          data?.message ||
          data?.error ||
          `Medusa cart completion failed with ${response.status}`,
        rawResponse: data,
      };
    }

    const orderId =
      data?.order?.id ??
      data?.data?.order?.id ??
      data?.cart?.completed_order_id ??
      data?.id ??
      null;

    return {
      completed: Boolean(orderId),
      status: orderId ? "completed" : "verified",
      medusaOrderId: orderId,
      paymentReference: intent.paymentReference,
      failureReason: orderId ? null : "Medusa did not return an order id",
      rawResponse: data,
    };
  }
}


---

DBX009. apps/api/src/modules/dbx-payments/dbx-payments.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateDbxPaymentIntentDto } from "./dto/create-dbx-payment-intent.dto";
import { VerifyDbxPaymentDto } from "./dto/verify-dbx-payment.dto";
import { DbxChainVerifierService } from "./dbx-chain-verifier.service";
import { DbxMedusaCompletionService } from "./dbx-medusa-completion.service";
import { DbxPaymentConfigService } from "./dbx-payment-config.service";
import { DbxPaymentReferenceService } from "./dbx-payment-reference.service";
import { DbxPaymentsRepository } from "./dbx-payments.repository";
import type { DbxPaymentIntentResponse } from "./types/dbx-payment.types";

@Injectable()
export class DbxPaymentsService {
  constructor(
    private readonly repo: DbxPaymentsRepository,
    private readonly referenceService: DbxPaymentReferenceService,
    private readonly verifier: DbxChainVerifierService,
    private readonly medusaCompletion: DbxMedusaCompletionService,
    private readonly config: DbxPaymentConfigService,
  ) {}

  async createIntent(
    userId: string | null,
    dto: CreateDbxPaymentIntentDto,
  ): Promise<DbxPaymentIntentResponse> {
    const expiresAt = new Date(
      Date.now() + this.config.expiryMinutes * 60_000,
    );

    const intent = await this.repo.createIntent({
      userId,
      medusaCartId: dto.medusaCartId,
      paymentReference: this.referenceService.createReference(),
      dbxMintAddress: this.config.mintAddress,
      treasuryWalletAddress: this.config.treasuryWalletAddress,
      expectedDbxAmount: dto.expectedDbxAmount,
      expectedFiatAmount: dto.expectedFiatAmount,
      fiatCurrencyCode: dto.fiatCurrencyCode ?? "USD",
      senderWalletAddress: dto.senderWalletAddress,
      expiresAt,
      metadata: dto.metadata,
    });

    return this.withInstructions(intent);
  }

  async verify(dto: VerifyDbxPaymentDto) {
    const intent = await this.repo.findIntentByReference(dto.paymentReference);

    if (!intent) {
      throw new NotFoundException("DBX payment intent not found");
    }

    if (intent.status === "completed") {
      return {
        verified: true,
        status: "completed",
        paymentReference: intent.paymentReference,
        medusaOrderId: intent.medusaOrderId,
      };
    }

    if (intent.status === "verified") {
      return {
        verified: true,
        status: "verified",
        paymentReference: intent.paymentReference,
        medusaOrderId: intent.medusaOrderId,
      };
    }

    if (intent.status === "expired" || new Date(intent.expiresAt).getTime() < Date.now()) {
      await this.repo.updateIntent({
        id: intent.id,
        paymentReference: intent.paymentReference,
        status: "expired",
        failureReason: "Payment intent expired",
      });

      throw new BadRequestException("Payment intent expired");
    }

    await this.repo.updateIntent({
      id: intent.id,
      paymentReference: intent.paymentReference,
      status: "submitted",
      transactionSignature: dto.transactionSignature,
    });

    const verification = await this.verifier.verify({
      intent,
      transactionSignature: dto.transactionSignature,
      senderWalletAddress: dto.senderWalletAddress,
    });

    await this.repo.saveVerification(intent.id, verification);

    if (!verification.verified) {
      await this.repo.updateIntent({
        id: intent.id,
        paymentReference: intent.paymentReference,
        status: "failed",
        transactionSignature: dto.transactionSignature,
        failureReason:
          verification.failureReason ?? "DBX transaction verification failed",
      });

      return verification;
    }

    await this.repo.updateIntent({
      id: intent.id,
      paymentReference: intent.paymentReference,
      status: "verified",
      paidAt: new Date(),
      verifiedAt: new Date(),
      transactionSignature: dto.transactionSignature,
      failureReason: null,
    });

    const verifiedIntent = await this.repo.findIntentByReference(
      intent.paymentReference,
    );

    const completion = await this.medusaCompletion.completeCartAfterDbxPayment(
      verifiedIntent ?? {
        ...intent,
        status: "verified",
        transactionSignature: dto.transactionSignature,
      },
    );

    if (completion.completed) {
      await this.repo.updateIntent({
        id: intent.id,
        paymentReference: intent.paymentReference,
        status: "completed",
        medusaOrderId: completion.medusaOrderId,
        completedAt: new Date(),
        failureReason: null,
      });
    } else {
      await this.repo.recordEvent({
        paymentIntentId: intent.id,
        paymentReference: intent.paymentReference,
        eventType: "medusa_completion_deferred",
        status: "verified",
        payload: completion.rawResponse,
      });
    }

    return {
      ...verification,
      completion,
      status: completion.completed ? "completed" : "verified",
    };
  }

  async getIntent(paymentReference: string): Promise<DbxPaymentIntentResponse> {
    const intent = await this.repo.findIntentByReference(paymentReference);

    if (!intent) {
      throw new NotFoundException("DBX payment intent not found");
    }

    return this.withInstructions(intent);
  }

  private withInstructions(intent: any): DbxPaymentIntentResponse {
    return {
      provider: "crypto",
      ...intent,
      instructions: {
        network: "solana",
        token: "DBX",
        sendExactAmount: intent.expectedDbxAmount,
        tokenMint: intent.dbxMintAddress,
        toWallet: intent.treasuryWalletAddress,
        memo: intent.paymentReference,
        expiresAt: intent.expiresAt,
      },
    };
  }
}


---

DBX010. apps/api/src/modules/dbx-payments/dbx-payments.controller.ts

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateDbxPaymentIntentDto } from "./dto/create-dbx-payment-intent.dto";
import { VerifyDbxPaymentDto } from "./dto/verify-dbx-payment.dto";
import { DbxPaymentsService } from "./dbx-payments.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";

@ApiTags("dbx-crypto-payments")
@Controller({
  path: "payments/dbx",
  version: "1",
})
export class DbxPaymentsController {
  constructor(private readonly service: DbxPaymentsService) {}

  @Post("intent")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create a DBX Solana crypto payment intent for a Medusa cart",
  })
  createIntent(
    @Body() dto: CreateDbxPaymentIntentDto,
    @Headers("x-user-id") userId?: string,
  ) {
    return this.service.createIntent(userId ?? null, dto);
  }

  @Post("verify")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Verify a submitted DBX Solana transaction signature",
  })
  verify(@Body() dto: VerifyDbxPaymentDto) {
    return this.service.verify(dto);
  }

  @Get("intent/:reference")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get DBX payment intent by payment reference",
  })
  getIntent(@Param("reference") reference: string) {
    return this.service.getIntent(reference);
  }
}


---

DBX011. apps/api/src/modules/dbx-payments/dbx-payments.module.ts

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DbxChainVerifierService } from "./dbx-chain-verifier.service";
import { DbxMedusaCompletionService } from "./dbx-medusa-completion.service";
import { DbxPaymentConfigService } from "./dbx-payment-config.service";
import { DbxPaymentReferenceService } from "./dbx-payment-reference.service";
import { DbxPaymentsController } from "./dbx-payments.controller";
import { DbxPaymentsRepository } from "./dbx-payments.repository";
import { DbxPaymentsService } from "./dbx-payments.service";

@Module({
  imports: [ConfigModule],
  controllers: [DbxPaymentsController],
  providers: [
    DbxPaymentsService,
    DbxPaymentsRepository,
    DbxPaymentReferenceService,
    DbxPaymentConfigService,
    DbxChainVerifierService,
    DbxMedusaCompletionService,
  ],
  exports: [
    DbxPaymentsService,
    DbxPaymentsRepository,
    DbxPaymentConfigService,
  ],
})
export class DbxPaymentsModule {}


---

App module import

Add once only.
