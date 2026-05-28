import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { NestFactory } from "@nestjs/core";
import { CjOperatorModule } from "./cj-operator.module";
import { CjProductImportService } from "../modules/suppliers/cj-import/cj-product-import.service";
import { CjProductPublishService } from "../modules/suppliers/cj-import/cj-product-publish.service";
import {
  CJ_OPERATOR_ALL_CATEGORY_SET,
  CJ_PRODUCT_CATEGORIES,
  CjCategorySlug,
} from "../modules/suppliers/cj-import/cj-product-categories";
import { SupabaseService } from "../shared/services/supabase.service";

type Mode =
  | "readiness"
  | "preview"
  | "import"
  | "approve-safe"
  | "auto-approve-safe"
  | "publish-approved"
  | "full-safe";
type CategoryResult = {
  category: string;
  requested: number;
  fetched: number;
  previewed: number;
  staged: number;
  valid: number;
  rejected: number;
  approved: number;
  published: number;
  skipped: number;
  blockers: string[];
  labelsFound: string[];
  duplicateCount: number;
  restrictedRejectedCount: number;
  partialReason: string | null;
};

const HARD_MAX_PER_CATEGORY = 200;
const DEFAULT_LIMIT_PER_CATEGORY = 50;
const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 30000;
const outputPath = (
  process.env.CJ_OPERATOR_OUTPUT_PATH || "artifacts/cj-operator-output.json"
).trim();
mkdirSync(dirname(outputPath), { recursive: true });

let finalOutputWritten = false;
let runInProgress = false;
let bootstrapInProgress = false;

function parseLimit(value: string | undefined, fallback: number) {
  const n = Number(value || fallback);
  return !Number.isFinite(n) || n < 1
    ? fallback
    : Math.min(Math.floor(n), HARD_MAX_PER_CATEGORY);
}
function parseTimeoutMs(value: string | undefined): number {
  const parsed = Number(value || DEFAULT_BOOTSTRAP_TIMEOUT_MS);
  return !Number.isFinite(parsed) || parsed < 1
    ? DEFAULT_BOOTSTRAP_TIMEOUT_MS
    : Math.floor(parsed);
}
function isTrue(value: string | undefined): boolean {
  return String(value || "").toLowerCase() === "true";
}
function parseCategories(): CjCategorySlug[] {
  const c = (process.env.CJ_OPERATOR_CATEGORY || "all").trim();
  return c === "all"
    ? [...CJ_OPERATOR_ALL_CATEGORY_SET]
    : c in CJ_PRODUCT_CATEGORIES && c !== "all"
      ? [c as CjCategorySlug]
      : [...CJ_OPERATOR_ALL_CATEGORY_SET];
}
const SECRET_ENV_NAMES = [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MEDUSA_ADMIN_API_KEY",
  "CJ_ACCESS_TOKEN",
  "CJ_API_KEY",
];

function sanitizeSecretText(value: unknown): string {
  let sanitized = String(value || "")
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[redacted-database-url]")
    .replace(/(DATABASE_URL\s*=\s*)\S+/gi, "$1[redacted]")
    .replace(/(token|key|secret|password)=\S+/gi, "$1=[redacted]");

  for (const key of SECRET_ENV_NAMES) {
    const secret = String(process.env[key] || "").trim();
    if (secret)
      sanitized = sanitized
        .split(secret)
        .join(`[redacted-${key.toLowerCase()}]`);
  }

  return sanitized;
}
function sanitizeStack(error: unknown): string[] {
  const stack = (error instanceof Error ? error.stack : String(error || ""))
    .split("\n")
    .slice(0, 8)
    .map((l) => sanitizeSecretText(l));
  return stack;
}
function envPresent(key: string): boolean {
  return Boolean(String(process.env[key] || "").trim());
}
function precheckCredentialPresent(): boolean {
  return envPresent("CJ_ACCESS_TOKEN") || envPresent("CJ_API_KEY");
}
function safeCjDiagnostics(source: Record<string, any> = {}) {
  const workflowAccessTokenPresent = envPresent("CJ_ACCESS_TOKEN");
  const workflowApiKeyPresent = envPresent("CJ_API_KEY");
  const workflowPrecheck = workflowAccessTokenPresent || workflowApiKeyPresent;
  const cjAccessTokenPresent = Boolean(
    source.cjAccessTokenPresent ?? workflowAccessTokenPresent,
  );
  const cjApiKeyPresent = Boolean(
    source.cjApiKeyPresent ?? workflowApiKeyPresent,
  );
  const runtimeCredentialSource =
    source.runtimeCredentialSource === "CJ_ACCESS_TOKEN"
      ? "CJ_ACCESS_TOKEN"
      : cjAccessTokenPresent
        ? "CJ_ACCESS_TOKEN"
        : null;
  const adapterConfigured = Boolean(
    source.cjCredentialConfigured ??
    source.cjCredentialsConfigured ??
    source.cjTokenPresent ??
    runtimeCredentialSource,
  );
  return {
    cjAccessTokenPresent,
    cjApiKeyPresent,
    cjCredentialConfigured: adapterConfigured,
    acceptedCredentialEnvNames: Array.isArray(source.acceptedCredentialEnvNames)
      ? source.acceptedCredentialEnvNames
      : ["CJ_ACCESS_TOKEN"],
    adapterCredentialSource:
      source.adapterCredentialSource === "CJ_ACCESS_TOKEN"
        ? "CJ_ACCESS_TOKEN"
        : runtimeCredentialSource,
    runtimeCredentialSource,
    requiredRuntimeCredential:
      source.requiredRuntimeCredential || "CJ_ACCESS_TOKEN",
    cjAuthMode:
      source.cjAuthMode ||
      (runtimeCredentialSource
        ? "cj_access_token_header"
        : "missing_access_token"),
    cjEndpointPath: source.cjEndpointPath || "/v1/product/list",
    cjApiVersion: source.cjApiVersion || "api2.0",
    cjAuthHeaderNamePresent: source.cjAuthHeaderNamePresent ?? true,
    cjRequestMethod: source.cjRequestMethod || "GET",
    cjApiBaseUrlConfigured: Boolean(
      source.cjApiBaseUrlConfigured ?? envPresent("CJ_API_BASE_URL"),
    ),
    workflowCredentialPrecheckPresent: workflowPrecheck,
    adapterCredentialPrecheckMismatch:
      workflowAccessTokenPresent && !adapterConfigured,
  };
}
function credentialMissingSecrets(cjDiagnostics: Record<string, any>): string[] {
  return cjDiagnostics.cjAccessTokenPresent || cjDiagnostics.cjApiKeyPresent ? [] : ['CJ_ACCESS_TOKEN_or_CJ_API_KEY'];
}
function normalizeCredentialBlockers(
  blockers: string[],
  cjDiagnostics: Record<string, any>,
): string[] {
  const next = blockers.filter(
    (blocker) =>
      blocker !== "cj_access_token_missing" && blocker !== "cj_api_key_missing",
  );
  if (!cjDiagnostics.cjCredentialConfigured)
    next.push("cj_credentials_missing");
  return [...new Set(next)];
}
function isCjCredentialsMissingError(error: unknown): boolean {
  return sanitizeSecretText(
    error instanceof Error ? error.message : String(error),
  ).includes("cj_credentials_missing");
}
function isCjAuthFailed401Error(error: unknown): boolean {
  return sanitizeSecretText(
    error instanceof Error ? error.message : String(error),
  ).includes("cj_auth_failed_401");
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    success: false,
    mode: process.env.CJ_OPERATOR_MODE || "readiness",
    dryRun: isTrue(process.env.CJ_OPERATOR_DRY_RUN),
    requestedLimitPerCategory: parseLimit(
      process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY,
      DEFAULT_LIMIT_PER_CATEGORY,
    ),
    totalCategories: 0,
    categoryResults: [],
    totalPreviewed: 0,
    totalFetched: 0,
    totalStaged: 0,
    totalApproved: 0,
    totalPublished: 0,
    totalRejected: 0,
    totalSkipped: 0,
    totalMedusaSynced: 0,
    blockers: [],
    medusaSyncBlockers: [],
    missingSecrets: [],
    dbDiagnostics: {},
    cjDiagnostics: {},
    medusaDiagnostics: {},
    bootstrapDiagnostics: {
      moduleName: "CjOperatorModule",
      bootstrapStarted: false,
      bootstrapComplete: false,
      bootstrapDurationMs: 0,
      usedLightweightModule: true,
      timeoutMs: parseTimeoutMs(process.env.CJ_OPERATOR_BOOTSTRAP_TIMEOUT_MS),
    },
    errorName: null,
    errorMessage: null,
    errorStackPreview: [],
    nextAction: "Inspect logs and rerun.",
    ...overrides,
  };
}

function writeOperatorOutput(payload: Record<string, unknown>) {
  try {
    const content = `${JSON.stringify(payload, null, 2)}\n`;
    writeFileSync(outputPath, content, "utf8");
    finalOutputWritten = true;
    console.log(content);
    console.log("operatorFinalOutputWritten=true");
  } catch (error) {
    const fallback = `${JSON.stringify({ success: false, blockers: ["operator_output_write_failed"], errorName: error instanceof Error ? error.name : "Error", errorMessage: sanitizeSecretText(error instanceof Error ? error.message : String(error)), outputPath: sanitizeSecretText(outputPath) }, null, 2)}\n`;
    try {
      process.stderr.write(fallback);
    } catch {}
  }
}
function writeOperatorException(
  error: unknown,
  blocker = "operator_exception",
) {
  writeOperatorOutput(
    basePayload({
      blockers: [blocker],
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: sanitizeSecretText(
        error instanceof Error ? error.message : String(error),
      ),
      errorStackPreview: sanitizeStack(error),
      nextAction: "Fix runtime error and retry.",
    }),
  );
}

process.on("uncaughtException", (error) => {
  writeOperatorException(error);
  process.exitCode = 1;
});
process.on("unhandledRejection", (reason) => {
  writeOperatorException(reason);
  process.exitCode = 1;
});
process.on("beforeExit", () => {
  if (!finalOutputWritten && !runInProgress && !bootstrapInProgress) {
    writeOperatorOutput(
      basePayload({
        blockers: ["operator_bootstrap_failed"],
        errorName: "OperatorExitedBeforeFinalOutput",
        errorMessage:
          "Operator process exited before final output was written.",
        nextAction: "Inspect bootstrap/runtime logs and rerun.",
      }),
    );
  }
});

async function main() {
  const mode = (process.env.CJ_OPERATOR_MODE || "readiness") as Mode;
  const dryRun = isTrue(process.env.CJ_OPERATOR_DRY_RUN);
  const requested = parseLimit(
    process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY,
    DEFAULT_LIMIT_PER_CATEGORY,
  );
  const categories = parseCategories();
  const timeoutMs = parseTimeoutMs(
    process.env.CJ_OPERATOR_BOOTSTRAP_TIMEOUT_MS,
  );
  const bootstrapStartedAt = Date.now();
  const bootstrapDiagnostics = {
    moduleName: "CjOperatorModule",
    bootstrapStarted: true,
    bootstrapComplete: false,
    bootstrapDurationMs: 0,
    usedLightweightModule: true,
    timeoutMs,
  };
  let app: Awaited<
    ReturnType<typeof NestFactory.createApplicationContext>
  > | null = null;

  runInProgress = true;
  bootstrapInProgress = true;
  console.log(
    `operatorEntrypointReached=true outputPath=${sanitizeSecretText(outputPath)} mode=${mode} dryRun=${dryRun} category=${process.env.CJ_OPERATOR_CATEGORY || "all"} limitPerCategory=${requested}`,
  );
  console.log("operatorBootstrapStarting=true");

  try {
    app = await Promise.race([
      NestFactory.createApplicationContext(CjOperatorModule, {
        abortOnError: false,
        logger: ["error", "warn"],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`CJ operator bootstrap timed out after ${timeoutMs}ms`),
            ),
          timeoutMs,
        ),
      ),
    ]);
    bootstrapInProgress = false;
    bootstrapDiagnostics.bootstrapComplete = true;
    bootstrapDiagnostics.bootstrapDurationMs = Date.now() - bootstrapStartedAt;
    console.log("operatorBootstrapComplete=true");
    console.log("operatorRunStarting=true");

    const importer = app.get(CjProductImportService, { strict: false });
    const publisher = app.get(CjProductPublishService, { strict: false });
    const supabase = app.get(SupabaseService, { strict: false });
    const readiness = await importer.readiness();
    const cjDiagnostics = safeCjDiagnostics(
      readiness.cjDiagnostics || {
        cjCredentialConfigured:
          readiness.checks?.cjCredentialsConfigured ?? false,
      },
    );
    const blockers = normalizeCredentialBlockers(
      [...(readiness.blockers || [])],
      cjDiagnostics,
    );
    const result: any = basePayload({
      mode,
      dryRun,
      requestedLimitPerCategory: requested,
      totalCategories: categories.length,
      blockers,
      missingSecrets: credentialMissingSecrets(cjDiagnostics),
      dbDiagnostics: readiness.dbDiagnostics || {
        migrationReady: readiness.checks?.migrationReady ?? false,
      },
      cjDiagnostics,
      bootstrapDiagnostics,
      nextAction: "Resolve blockers and retry.",
    });
    if (mode === "readiness" || blockers.length > 0) {
      result.success = blockers.length === 0;
      result.nextAction = blockers.length
        ? "Resolve readiness blockers then run preview/import."
        : "Run preview or full-safe.";
      console.log("operatorRunComplete=true");
      writeOperatorOutput(result);
      process.exitCode =
        result.success || isTrue(process.env.CJ_OPERATOR_READINESS_EXIT_ZERO)
          ? 0
          : 1;
      return;
    }
    for (const category of categories) {
      const row: CategoryResult = {
        category,
        requested,
        fetched: 0,
        previewed: 0,
        staged: 0,
        valid: 0,
        rejected: 0,
        approved: 0,
        published: 0,
        skipped: 0,
        blockers: [],
        labelsFound: [],
        duplicateCount: 0,
        restrictedRejectedCount: 0,
        partialReason: null,
      };
      if (mode === "preview" || mode === "import" || mode === "full-safe") {
        const preview = await importer.preview(category, requested);
        const labels = new Set<string>();
        for (const item of preview.items || []) {
          row.fetched += 1;
          row.previewed += 1;
          labels.add(String(item.category_slug || item.category || "unknown"));
        }
        row.partialReason =
          typeof (preview as any).partialReason === "string"
            ? (preview as any).partialReason
            : null;
        row.labelsFound = [...labels];
      }
      if (!dryRun && (mode === "import" || mode === "full-safe")) {
        const imported = await importer.runImport(
          category,
          requested,
          "cj_operator",
        );
        row.staged = imported.imported || 0;
        row.valid = imported.accepted || 0;
        row.rejected = imported.rejected || 0;
      }
      if (
        !dryRun &&
        (mode === "approve-safe" ||
          mode === "auto-approve-safe" ||
          mode === "full-safe")
      ) {
        const { data } = await supabase
          .schema("app_private")
          .from("cj_product_import_items")
          .select("id,validation_status,approval_status,blockers,category_slug")
          .eq("supplier", "cj")
          .eq("category_slug", category)
          .eq("approval_status", "pending_admin_approval")
          .limit(requested);
        for (const item of data || []) {
          const ok =
            item.validation_status === "validated" &&
            (!Array.isArray(item.blockers) || item.blockers.length === 0);
          if (ok) {
            await publisher.approve(item.id);
            row.approved += 1;
          } else {
            row.skipped += 1;
          }
        }
      }
      if (!dryRun && (mode === "publish-approved" || mode === "full-safe")) {
        const p = await publisher.publishApproved();
        row.published += p.published || 0;
        result.totalMedusaSynced += p.medusaSynced || 0;
        if (Array.isArray(p.blockers))
          result.medusaSyncBlockers = [
            ...new Set([...result.medusaSyncBlockers, ...p.blockers]),
          ];
        result.medusaDiagnostics =
          p.medusaDiagnostics || result.medusaDiagnostics;
      }
      result.categoryResults.push(row);
      result.totalPreviewed += row.previewed;
      result.totalFetched += row.fetched;
      result.totalStaged += row.staged;
      result.totalApproved += row.approved;
      result.totalPublished += row.published;
      result.totalRejected += row.rejected;
      result.totalSkipped += row.skipped;
    }
    if (mode === 'preview' && result.totalFetched === 0) result.blockers.push('preview_no_products_fetched');
    if (
      (mode === "publish-approved" || mode === "full-safe") &&
      result.totalPublished > result.totalMedusaSynced
    )
      result.blockers.push("medusa_publish_proof_mismatch");
    result.success =
      result.blockers.length === 0 &&
      result.categoryResults.every((r: any) => r.blockers.length === 0);
    result.nextAction = result.success
      ? "Review artifact and rerun publish-approved if needed."
      : "Inspect blockers.";
    console.log("operatorRunComplete=true");
    writeOperatorOutput(result);
    if (!result.success) process.exitCode = 1;
  } catch (error) {
    bootstrapInProgress = false;
    bootstrapDiagnostics.bootstrapDurationMs = Date.now() - bootstrapStartedAt;
    const isTimeout =
      error instanceof Error && error.message.includes("timed out");
    const cjDiagnostics = safeCjDiagnostics();
    const runStarted = bootstrapDiagnostics.bootstrapComplete;
    const credentialError = isCjCredentialsMissingError(error);
    const authFailed401 = isCjAuthFailed401Error(error);
    const blockers = isTimeout
      ? ["operator_bootstrap_timeout"]
      : runStarted
        ? authFailed401
          ? [
              "operator_run_failed",
              "cj_auth_failed_401",
              'invalid_or_expired_cj_credential',
            ]
          : [credentialError ? "cj_credentials_missing" : "operator_run_failed"]
        : ["operator_bootstrap_failed"];
    if (
      runStarted &&
      credentialError &&
      !blockers.includes("operator_run_failed")
    )
      blockers.unshift("operator_run_failed");
    const nextAction = authFailed401
      ? "Regenerate CJ_ACCESS_TOKEN in CJ dashboard/API authorization and update GitHub Actions secret. Do not paste token."
      : runStarted
        ? "Resolve runtime blockers and rerun."
        : "Inspect bootstrap logs and resolve configuration errors.";
    writeOperatorOutput(
      basePayload({
        blockers: [...new Set(blockers)],
        missingSecrets: credentialMissingSecrets(cjDiagnostics),
        errorName: isTimeout
          ? "OperatorBootstrapTimeout"
          : error instanceof Error
            ? error.name
            : "Error",
        errorMessage: isTimeout
          ? `CJ operator bootstrap exceeded timeout ${timeoutMs}ms.`
          : sanitizeSecretText(
              error instanceof Error ? error.message : String(error),
            ),
        errorStackPreview: sanitizeStack(error),
        bootstrapDiagnostics,
        dbDiagnostics: {},
        cjDiagnostics,
        medusaDiagnostics: {},
        nextAction,
      }),
    );
    process.exitCode = 1;
  } finally {
    runInProgress = false;
    if (app) await app.close();
  }
}

void main();
