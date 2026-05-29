import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError, AxiosResponse } from "axios";
import {
  CjNormalizedSupplierMetadata,
  CjProductImportDto,
  CjProductImportReadinessDto,
} from "./dto/cj-supplier.dto";

export interface CjCredentialPreflightResult {
  success: boolean;
  blockers: string[];
  cjConfigured: boolean;
  cjTokenPresent: boolean;
  cjAccessTokenPresent: boolean;
  cjApiKeyPresent: boolean;
  cjCredentialConfigured: boolean;
  acceptedCredentialEnvNames: string[];
  adapterCredentialSource: "CJ_ACCESS_TOKEN" | "CJ_API_KEY" | null;
  runtimeCredentialSource: "CJ_ACCESS_TOKEN" | null;
  requiredRuntimeCredential: "CJ_ACCESS_TOKEN";
  cjAuthMode: "cj_access_token_header" | "missing_access_token";
  cjEndpointPath: string;
  cjApiVersion: "api2.0";
  cjAuthHeaderNamePresent: true;
  cjRequestMethod: "GET";
  cjBaseUrlPresent: boolean;
  cjApiBaseUrlConfigured: boolean;
  cjLiveProbeAttempted: boolean;
  cjLiveProbeOk: boolean;
  cjLiveProbeStatusCode?: number;
  cjLiveProbeErrorCode?: string;
  cjLiveProbeErrorMessageSanitized?: string;
  liveProbeAttempted: boolean;
  liveProbeVerified: boolean;
  timestamp: string;
}

export interface CjProductImportReadinessResult {
  success: boolean;
  blockers: string[];
  supplierImportReady: boolean;
  normalizedSupplierMetadata?: CjNormalizedSupplierMetadata;
  medusaMetadataSeed?: {
    supplier: "cj";
    supplierProductId: string;
    supplierSku: string;
    supplierMetadata: CjNormalizedSupplierMetadata;
  };
  timestamp: string;
}

export interface CjRateLimitDiagnostics {
  cjStatusCode: 429;
  rateLimited: true;
  retryAfterPresent: boolean;
  retryAfterSeconds?: number;
  recommendedAction: string;
}

export class CjRateLimitedException extends BadRequestException {
  readonly cjStatusCode = 429;
  readonly rateLimited = true;
  readonly retryAfterPresent: boolean;
  readonly retryAfterSeconds?: number;
  readonly recommendedAction =
    "Wait before rerun, reduce limitPerCategory, or run one category at a time.";

  constructor(
    diagnostics: Omit<
      CjRateLimitDiagnostics,
      "cjStatusCode" | "rateLimited" | "recommendedAction"
    >,
  ) {
    super("cj_rate_limited");
    this.retryAfterPresent = diagnostics.retryAfterPresent;
    if (typeof diagnostics.retryAfterSeconds === "number") {
      this.retryAfterSeconds = diagnostics.retryAfterSeconds;
    }
  }
}

interface CjLiveProbeResult {
  cjLiveProbeAttempted: boolean;
  cjLiveProbeOk: boolean;
  cjLiveProbeStatusCode?: number;
  cjLiveProbeErrorCode?: string;
  cjLiveProbeErrorMessageSanitized?: string;
}

@Injectable()
export class CjSupplierAdapterService {
  private readonly liveProbeTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;

  constructor(private readonly config: ConfigService) {
    this.liveProbeTimeoutMs = this.resolveLiveProbeTimeoutMs();
    this.maxRetries = this.resolveRetryNumber("CJ_OPERATOR_MAX_RETRIES", 2);
    this.retryBaseMs = this.resolveRetryNumber(
      "CJ_OPERATOR_RETRY_BASE_MS",
      2000,
    );
    this.retryMaxMs = this.resolveRetryNumber(
      "CJ_OPERATOR_RETRY_MAX_MS",
      15000,
    );
  }

  mapImport(input: CjProductImportDto) {
    const supplierCost = 1000;
    const retailPrice = Math.round(supplierCost * (1 + input.marginPct / 100));
    return {
      supplier: "cj",
      supplierProductId: input.cjProductId,
      sku: input.targetSku,
      supplierCost,
      retailPrice,
      metadata: {
        mapper: "price-margin-v1",
        supplierDataMode: "DEMO_PLACEHOLDER",
        demo: true,
      },
    };
  }

  async readiness(): Promise<CjCredentialPreflightResult> {
    const credential = this.resolveRuntimeCredential();
    const cjAccessTokenPresent = Boolean(
      this.getConfigValue("CJ_ACCESS_TOKEN"),
    );
    const cjApiKeyPresent = Boolean(this.getConfigValue("CJ_API_KEY"));
    const cjCredentialConfigured = Boolean(credential.value);
    const cjBaseUrlPresent = Boolean(this.resolveBaseUrl());
    const blockers: string[] = [];

    if (!cjCredentialConfigured) {
      blockers.push("cj_credentials_missing");
    }

    const liveProbe = cjCredentialConfigured
      ? await this.liveProbe()
      : {
          cjLiveProbeAttempted: false,
          cjLiveProbeOk: false,
        };

    if (liveProbe.cjLiveProbeAttempted && !liveProbe.cjLiveProbeOk) {
      blockers.push(this.mapLiveProbeBlocker(liveProbe));
    }

    const uniqueBlockers = [...new Set(blockers)];
    const cjConfigured = cjCredentialConfigured && liveProbe.cjLiveProbeOk;

    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      cjConfigured,
      cjTokenPresent: cjCredentialConfigured,
      cjAccessTokenPresent,
      cjApiKeyPresent,
      cjCredentialConfigured,
      acceptedCredentialEnvNames: ["CJ_ACCESS_TOKEN"],
      adapterCredentialSource: credential.source,
      runtimeCredentialSource: credential.source,
      requiredRuntimeCredential: "CJ_ACCESS_TOKEN",
      cjAuthMode: credential.value
        ? "cj_access_token_header"
        : "missing_access_token",
      cjEndpointPath: this.productListEndpointPath(),
      cjApiVersion: "api2.0",
      cjAuthHeaderNamePresent: true,
      cjRequestMethod: "GET",
      cjBaseUrlPresent,
      cjApiBaseUrlConfigured: Boolean(this.getConfigValue("CJ_API_BASE_URL")),
      ...liveProbe,
      liveProbeAttempted: liveProbe.cjLiveProbeAttempted,
      liveProbeVerified: liveProbe.cjLiveProbeOk,
      timestamp: new Date().toISOString(),
    };
  }

  async prepareImportReadiness(
    input: CjProductImportReadinessDto,
  ): Promise<CjProductImportReadinessResult> {
    const blockers = this.validateExplicitProductInput(input);
    const credentialPreflight = await this.readiness();
    blockers.push(...credentialPreflight.blockers);

    const normalizedSupplierMetadata = this.normalizeProductInput(input);
    blockers.push(
      ...this.validateMinimumProductFields(normalizedSupplierMetadata),
    );

    const uniqueBlockers = [...new Set(blockers)];

    if (uniqueBlockers.length > 0 || !normalizedSupplierMetadata) {
      return {
        success: false,
        blockers: uniqueBlockers,
        supplierImportReady: false,
        ...(normalizedSupplierMetadata ? { normalizedSupplierMetadata } : {}),
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      blockers: [],
      supplierImportReady: true,
      normalizedSupplierMetadata,
      medusaMetadataSeed: {
        supplier: "cj",
        supplierProductId: normalizedSupplierMetadata.supplierProductId,
        supplierSku: normalizedSupplierMetadata.supplierSku,
        supplierMetadata: normalizedSupplierMetadata,
      },
      timestamp: new Date().toISOString(),
    };
  }

  canSendLiveOrder() {
    return this.config.get<string>("SUPPLIER_LIVE_MODE") === "true";
  }

  async preflightCredentials(): Promise<CjCredentialPreflightResult> {
    return this.readiness();
  }

  async prepareProductImport(
    input: CjProductImportReadinessDto,
  ): Promise<CjProductImportReadinessResult> {
    return this.prepareImportReadiness(input);
  }

  async liveProbe(): Promise<CjLiveProbeResult> {
    const baseUrl = this.resolveBaseUrl();
    const credential = this.resolveRuntimeCredential();

    if (!credential.value) {
      return {
        cjLiveProbeAttempted: false,
        cjLiveProbeOk: false,
      };
    }

    try {
      const response = await axios.get(
        this.cjEndpoint(baseUrl, this.productListEndpointPath()),
        {
          headers: {
            "CJ-Access-Token": credential.value,
          },
          params: {
            pageNum: 1,
            pageSize: 1,
          },
          timeout: this.liveProbeTimeoutMs,
          validateStatus: () => true,
        },
      );

      const apiCode = this.extractApiCode(response.data);
      const apiMessage = this.extractApiMessage(response.data);
      const cjLiveProbeOk =
        response.status >= 200 &&
        response.status < 300 &&
        !this.isCjApiFailureCode(apiCode);

      return {
        cjLiveProbeAttempted: true,
        cjLiveProbeOk,
        cjLiveProbeStatusCode: response.status,
        ...(cjLiveProbeOk
          ? {}
          : { cjLiveProbeErrorCode: apiCode || String(response.status) }),
        ...(cjLiveProbeOk
          ? {}
          : {
              cjLiveProbeErrorMessageSanitized: this.sanitizeProbeMessage(
                apiMessage || response.statusText,
              ),
            }),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        cjLiveProbeAttempted: true,
        cjLiveProbeOk: false,
        ...(axiosError.response?.status
          ? { cjLiveProbeStatusCode: axiosError.response.status }
          : {}),
        cjLiveProbeErrorCode: axiosError.code || "cj_live_probe_network_error",
        cjLiveProbeErrorMessageSanitized: this.sanitizeProbeMessage(
          axiosError.code === "ECONNABORTED"
            ? "CJ live probe timed out"
            : "CJ live probe unreachable",
        ),
      };
    }
  }

  async fetchProducts(category: string, limit: number) {
    const baseUrl = this.resolveBaseUrl();
    const credential = this.resolveRuntimeCredential();
    if (!credential.value) {
      throw new BadRequestException("cj_credentials_missing");
    }

    const response = await this.fetchProductsWithRetry(
      baseUrl,
      credential.value,
      category,
      limit,
    );

    if (response.status === 401) {
      throw new BadRequestException("cj_auth_failed_401");
    }

    if (response.status === 429) {
      throw new CjRateLimitedException(
        this.rateLimitDiagnostics(response.headers),
      );
    }

    if (
      response.status < 200 ||
      response.status >= 300 ||
      this.isCjApiFailureCode(this.extractApiCode(response.data))
    ) {
      throw new BadRequestException(`cj_fetch_failed_${response.status}`);
    }

    const list = this.extractProductList(response.data);
    return list.map((p: any, i: number) => ({
      supplierProductId: String(
        p.pid ?? p.productId ?? p.id ?? `${category}-${i + 1}`,
      ),
      supplierSku: String(p.vid ?? p.sku ?? p.variantId ?? `sku-${i + 1}`),
      title: String(p.productNameEn ?? p.productName ?? p.name ?? "CJ Product"),
      handle: String(p.productNameEn ?? p.productName ?? p.name ?? "cj-product")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      description: String(
        p.description ?? p.productNameEn ?? p.productName ?? "",
      ),
      sourceUrl: String(p.url ?? p.productUrl ?? "https://cjdropshipping.com"),
      imageUrl: String(
        Array.isArray(p.productImageSet)
          ? p.productImageSet[0]
          : (p.productImage ?? ""),
      ),
      category,
      priceMinor: Math.round(Number(p.sellPrice ?? p.price ?? 0) * 100) || 0,
      costMinor:
        Math.round(
          Number(p.costPrice ?? p.supplierPrice ?? p.sellPrice ?? 0) * 100,
        ) || 0,
      stockQty: Number(p.stockNum ?? p.inventoryNum ?? 0) || 0,
      shippingCountries: ["US"],
      deliveryEstimate: "7-12 days",
    }));
  }

  private async fetchProductsWithRetry(
    baseUrl: string,
    credential: string,
    category: string,
    limit: number,
  ): Promise<AxiosResponse> {
    let lastResponse: AxiosResponse | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const response = await axios.get(
        this.cjEndpoint(baseUrl, this.productListEndpointPath()),
        {
          headers: { "CJ-Access-Token": credential },
          params: {
            pageNum: 1,
            pageSize: Math.max(1, Math.min(limit, 100)),
            ...(category && category !== "all"
              ? { categoryName: category }
              : {}),
          },
          timeout: this.liveProbeTimeoutMs,
          validateStatus: () => true,
        },
      );
      lastResponse = response;

      if (
        !this.isRetryableStatus(response.status) ||
        attempt >= this.maxRetries
      ) {
        return response;
      }

      await this.sleep(this.retryDelayMs(attempt, response.headers));
    }

    return lastResponse!;
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status === 408 || (status >= 500 && status <= 599);
  }

  private retryDelayMs(
    attempt: number,
    headers: Record<string, unknown> | undefined,
  ): number {
    const retryAfterSeconds = this.parseRetryAfterSeconds(headers);
    if (typeof retryAfterSeconds === "number") {
      return Math.min(retryAfterSeconds * 1000, this.retryMaxMs);
    }

    return Math.min(this.retryBaseMs * 2 ** attempt, this.retryMaxMs);
  }

  private rateLimitDiagnostics(
    headers: Record<string, unknown> | undefined,
  ): CjRateLimitDiagnostics {
    const retryAfterSeconds = this.parseRetryAfterSeconds(headers);
    return {
      cjStatusCode: 429,
      rateLimited: true,
      retryAfterPresent: this.retryAfterHeaderPresent(headers),
      ...(typeof retryAfterSeconds === "number" ? { retryAfterSeconds } : {}),
      recommendedAction:
        "Wait before rerun, reduce limitPerCategory, or run one category at a time.",
    };
  }

  private parseRetryAfterSeconds(
    headers: Record<string, unknown> | undefined,
  ): number | undefined {
    const raw = this.retryAfterHeader(headers);
    if (!raw) return undefined;
    const numeric = Number.parseInt(raw, 10);
    if (Number.isSafeInteger(numeric) && numeric >= 0) return numeric;

    const dateMs = Date.parse(raw);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
    }

    return undefined;
  }

  private retryAfterHeaderPresent(
    headers: Record<string, unknown> | undefined,
  ) {
    return Boolean(this.retryAfterHeader(headers));
  }

  private retryAfterHeader(headers: Record<string, unknown> | undefined) {
    const value = headers?.["retry-after"] ?? headers?.["Retry-After"];
    return Array.isArray(value)
      ? String(value[0] || "").trim()
      : String(value || "").trim();
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  private getConfigValue(key: string): string {
    return (this.config.get<string>(key) || process.env[key] || "").trim();
  }

  private resolveRuntimeCredential(): {
    source: "CJ_ACCESS_TOKEN" | null;
    value: string;
  } {
    const accessToken = this.getConfigValue("CJ_ACCESS_TOKEN");
    if (accessToken) return { source: "CJ_ACCESS_TOKEN", value: accessToken };

    return { source: null, value: "" };
  }

  private resolveBaseUrl(): string {
    return (
      this.getConfigValue("CJ_API_BASE_URL") ||
      "https://developers.cjdropshipping.com/api2.0"
    );
  }

  private productListEndpointPath(): string {
    return "/v1/product/list";
  }

  private extractProductList(payload: any): any[] {
    const candidates = [
      payload?.data?.list,
      payload?.data?.result?.list,
      payload?.result?.list,
      payload?.list,
      payload?.data?.records,
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    return [];
  }

  private validateExplicitProductInput(
    input: CjProductImportReadinessDto,
  ): string[] {
    const blockers: string[] = [];

    if (!input || typeof input !== "object") {
      throw new BadRequestException(
        "CJ import readiness requires an explicit product payload",
      );
    }

    const supplierProductId = this.firstTrimmed(
      input.supplierProductId,
      input.productId,
    );
    const supplierSku = this.firstTrimmed(input.supplierSku, input.sku);

    if (!supplierProductId && !supplierSku) {
      blockers.push("cj_product_id_or_sku_required");
    }

    if (!input.title?.trim()) {
      blockers.push("cj_title_required");
    }

    if (!Number.isFinite(input.costPrice) || input.costPrice <= 0) {
      blockers.push("cj_cost_price_required");
    }

    if (!input.currency?.trim()) {
      blockers.push("cj_currency_required");
    }

    if (
      !Array.isArray(input.shippingCountries) ||
      input.shippingCountries.length === 0
    ) {
      blockers.push("cj_shipping_countries_required");
    }

    return blockers;
  }

  private normalizeProductInput(
    input: CjProductImportReadinessDto,
  ): CjNormalizedSupplierMetadata | undefined {
    if (!input || typeof input !== "object") {
      return undefined;
    }

    const supplierProductId = this.firstTrimmed(
      input.supplierProductId,
      input.productId,
    );
    const supplierSku = this.firstTrimmed(input.supplierSku, input.sku);
    const currency = input.currency?.trim().toUpperCase();
    const images = Array.isArray(input.images)
      ? input.images
          .map((image) => image?.trim())
          .filter((image): image is string => Boolean(image))
      : [];
    const shippingCountries = Array.isArray(input.shippingCountries)
      ? input.shippingCountries
          .map((country) => country?.trim().toUpperCase())
          .filter(Boolean)
      : [];

    return {
      supplier: "cj",
      supplierProductId: supplierProductId || "",
      supplierSku: supplierSku || "",
      title: input.title?.trim() || "",
      costPrice: Number.isFinite(input.costPrice) ? input.costPrice : 0,
      currency: currency || "",
      shippingCountries,
      ...(input.deliveryEstimate?.trim()
        ? { deliveryEstimate: input.deliveryEstimate.trim() }
        : {}),
      images,
      ...(input.sourceUrl?.trim() ? { sourceUrl: input.sourceUrl.trim() } : {}),
      rawAvailable: input.rawAvailable === true,
    };
  }

  private validateMinimumProductFields(
    input?: CjNormalizedSupplierMetadata,
  ): string[] {
    if (!input) {
      return ["cj_product_payload_required"];
    }

    const blockers: string[] = [];

    if (!input.supplierProductId && !input.supplierSku) {
      blockers.push("cj_product_id_or_sku_required");
    }

    if (!input.title) {
      blockers.push("cj_title_required");
    }

    if (
      !Number.isFinite(input.costPrice) ||
      input.costPrice <= 0 ||
      !input.currency
    ) {
      blockers.push("cj_supplier_economics_incomplete");
    }

    if (input.shippingCountries.length === 0) {
      blockers.push("cj_shipping_countries_required");
    }

    return blockers;
  }

  private mapLiveProbeBlocker(liveProbe: CjLiveProbeResult): string {
    const statusCode = liveProbe.cjLiveProbeStatusCode;
    const errorCode = liveProbe.cjLiveProbeErrorCode?.toLowerCase() || "";
    const errorMessage =
      liveProbe.cjLiveProbeErrorMessageSanitized?.toLowerCase() || "";

    if (
      statusCode === 429 ||
      errorCode.includes("rate") ||
      errorMessage.includes("rate")
    ) {
      return "cj_rate_limited";
    }

    if (statusCode === 401) {
      return "cj_auth_failed_401";
    }

    if (
      statusCode === 403 ||
      (typeof statusCode === "number" &&
        statusCode >= 200 &&
        statusCode < 300) ||
      errorCode.includes("token") ||
      errorMessage.includes("token") ||
      errorMessage.includes("auth") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("expired")
    ) {
      return "invalid_or_expired_cj_access_token";
    }

    if (
      !statusCode ||
      errorCode.includes("timeout") ||
      errorCode.includes("abort") ||
      errorCode.includes("network")
    ) {
      return "cj_live_probe_unreachable";
    }

    return "cj_live_probe_unreachable";
  }

  private isCjApiFailureCode(code?: string): boolean {
    if (!code) {
      return false;
    }

    return !["200", "success", "true"].includes(code.toLowerCase());
  }

  private extractApiCode(data: unknown): string | undefined {
    if (!data || typeof data !== "object") {
      return undefined;
    }

    const record = data as Record<string, unknown>;
    const value = record.code ?? record.resultCode ?? record.errorCode;
    return value === undefined || value === null ? undefined : String(value);
  }

  private extractApiMessage(data: unknown): string | undefined {
    if (!data || typeof data !== "object") {
      return undefined;
    }

    const record = data as Record<string, unknown>;
    const value = record.message ?? record.msg ?? record.errorMessage;
    return value === undefined || value === null ? undefined : String(value);
  }

  private sanitizeProbeMessage(message?: string): string {
    const accessToken = this.config.get<string>("CJ_ACCESS_TOKEN")?.trim();
    let sanitized = (message || "CJ live probe failed")
      .replace(/[\r\n\t]+/g, " ")
      .trim();

    if (accessToken) {
      sanitized = sanitized.split(accessToken).join("[redacted]");
    }

    sanitized = sanitized.replace(
      /CJ-Access-Token\s*[:=]\s*[^\s,}]+/gi,
      "CJ-Access-Token=[redacted]",
    );
    sanitized = sanitized.replace(
      /access[_-]?token\s*[:=]\s*[^\s,}]+/gi,
      "access_token:[redacted]",
    );

    return sanitized.slice(0, 240) || "CJ live probe failed";
  }

  private resolveLiveProbeTimeoutMs(): number {
    return this.resolveRetryNumber("CJ_LIVE_PROBE_TIMEOUT_MS", 5000);
  }

  private resolveRetryNumber(key: string, fallback: number): number {
    const rawValue = this.getConfigValue(key);
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;

    return Number.isSafeInteger(parsedValue) && parsedValue >= 0
      ? parsedValue
      : fallback;
  }

  private cjEndpoint(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  private firstTrimmed(
    ...values: Array<string | undefined>
  ): string | undefined {
    return values
      .map((value) => value?.trim())
      .find((value): value is string => Boolean(value));
  }
}
