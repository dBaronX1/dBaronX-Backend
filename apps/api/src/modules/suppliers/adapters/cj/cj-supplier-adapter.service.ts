import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
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
  cjBaseUrlPresent: boolean;
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

  constructor(private readonly config: ConfigService) {
    this.liveProbeTimeoutMs = this.resolveLiveProbeTimeoutMs();
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
    const cjTokenPresent = this.hasConfig("CJ_ACCESS_TOKEN");
    const cjBaseUrlPresent = this.hasConfig("CJ_API_BASE_URL");
    const blockers: string[] = [];

    if (!cjTokenPresent) {
      blockers.push("cj_access_token_missing");
    }

    if (!cjBaseUrlPresent) {
      blockers.push("cj_base_url_missing");
    }

    const liveProbe = cjTokenPresent && cjBaseUrlPresent
      ? await this.liveProbe()
      : {
          cjLiveProbeAttempted: false,
          cjLiveProbeOk: false,
        };

    if (liveProbe.cjLiveProbeAttempted && !liveProbe.cjLiveProbeOk) {
      blockers.push(this.mapLiveProbeBlocker(liveProbe));
    }

    const uniqueBlockers = [...new Set(blockers)];
    const cjConfigured = cjTokenPresent && cjBaseUrlPresent && liveProbe.cjLiveProbeOk;

    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      cjConfigured,
      cjTokenPresent,
      cjBaseUrlPresent,
      ...liveProbe,
      liveProbeAttempted: liveProbe.cjLiveProbeAttempted,
      liveProbeVerified: liveProbe.cjLiveProbeOk,
      timestamp: new Date().toISOString(),
    };
  }

  async prepareImportReadiness(input: CjProductImportReadinessDto): Promise<CjProductImportReadinessResult> {
    const blockers = this.validateExplicitProductInput(input);
    const credentialPreflight = await this.readiness();
    blockers.push(...credentialPreflight.blockers);

    const normalizedSupplierMetadata = this.normalizeProductInput(input);
    blockers.push(...this.validateMinimumProductFields(normalizedSupplierMetadata));

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

  async prepareProductImport(input: CjProductImportReadinessDto): Promise<CjProductImportReadinessResult> {
    return this.prepareImportReadiness(input);
  }

  async liveProbe(): Promise<CjLiveProbeResult> {
    const baseUrl = this.config.get<string>("CJ_API_BASE_URL")?.trim();
    const accessToken = this.config.get<string>("CJ_ACCESS_TOKEN")?.trim();

    if (!baseUrl || !accessToken) {
      return {
        cjLiveProbeAttempted: false,
        cjLiveProbeOk: false,
      };
    }

    try {
      const response = await axios.get(this.cjEndpoint(baseUrl, "/v1/product/list"), {
        headers: {
          "CJ-Access-Token": accessToken,
        },
        params: {
          pageNum: 1,
          pageSize: 1,
        },
        timeout: this.liveProbeTimeoutMs,
        validateStatus: () => true,
      });

      const apiCode = this.extractApiCode(response.data);
      const apiMessage = this.extractApiMessage(response.data);
      const cjLiveProbeOk = response.status >= 200
        && response.status < 300
        && !this.isCjApiFailureCode(apiCode);

      return {
        cjLiveProbeAttempted: true,
        cjLiveProbeOk,
        cjLiveProbeStatusCode: response.status,
        ...(cjLiveProbeOk ? {} : { cjLiveProbeErrorCode: apiCode || String(response.status) }),
        ...(cjLiveProbeOk ? {} : { cjLiveProbeErrorMessageSanitized: this.sanitizeProbeMessage(apiMessage || response.statusText) }),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        cjLiveProbeAttempted: true,
        cjLiveProbeOk: false,
        ...(axiosError.response?.status ? { cjLiveProbeStatusCode: axiosError.response.status } : {}),
        cjLiveProbeErrorCode: axiosError.code || "cj_live_probe_network_error",
        cjLiveProbeErrorMessageSanitized: this.sanitizeProbeMessage(
          axiosError.code === "ECONNABORTED" ? "CJ live probe timed out" : "CJ live probe unreachable",
        ),
      };
    }
  }

  private validateExplicitProductInput(input: CjProductImportReadinessDto): string[] {
    const blockers: string[] = [];

    if (!input || typeof input !== "object") {
      throw new BadRequestException("CJ import readiness requires an explicit product payload");
    }

    const supplierProductId = this.firstTrimmed(input.supplierProductId, input.productId);
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

    if (!Array.isArray(input.shippingCountries) || input.shippingCountries.length === 0) {
      blockers.push("cj_shipping_countries_required");
    }

    return blockers;
  }

  private normalizeProductInput(input: CjProductImportReadinessDto): CjNormalizedSupplierMetadata | undefined {
    if (!input || typeof input !== "object") {
      return undefined;
    }

    const supplierProductId = this.firstTrimmed(input.supplierProductId, input.productId);
    const supplierSku = this.firstTrimmed(input.supplierSku, input.sku);
    const currency = input.currency?.trim().toUpperCase();
    const images = Array.isArray(input.images)
      ? input.images.map((image) => image?.trim()).filter((image): image is string => Boolean(image))
      : [];
    const shippingCountries = Array.isArray(input.shippingCountries)
      ? input.shippingCountries.map((country) => country?.trim().toUpperCase()).filter(Boolean)
      : [];

    return {
      supplier: "cj",
      supplierProductId: supplierProductId || "",
      supplierSku: supplierSku || "",
      title: input.title?.trim() || "",
      costPrice: Number.isFinite(input.costPrice) ? input.costPrice : 0,
      currency: currency || "",
      shippingCountries,
      ...(input.deliveryEstimate?.trim() ? { deliveryEstimate: input.deliveryEstimate.trim() } : {}),
      images,
      ...(input.sourceUrl?.trim() ? { sourceUrl: input.sourceUrl.trim() } : {}),
      rawAvailable: input.rawAvailable === true,
    };
  }

  private validateMinimumProductFields(input?: CjNormalizedSupplierMetadata): string[] {
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

    if (!Number.isFinite(input.costPrice) || input.costPrice <= 0 || !input.currency) {
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
    const errorMessage = liveProbe.cjLiveProbeErrorMessageSanitized?.toLowerCase() || "";

    if (statusCode === 429 || errorCode.includes("rate") || errorMessage.includes("rate")) {
      return "cj_rate_limited";
    }

    if (
      statusCode === 401
      || statusCode === 403
      || (typeof statusCode === "number" && statusCode >= 200 && statusCode < 300)
      || errorCode.includes("token")
      || errorMessage.includes("token")
      || errorMessage.includes("auth")
      || errorMessage.includes("invalid")
      || errorMessage.includes("expired")
    ) {
      return "cj_token_invalid_or_expired";
    }

    if (!statusCode || errorCode.includes("timeout") || errorCode.includes("abort") || errorCode.includes("network")) {
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
    let sanitized = (message || "CJ live probe failed").replace(/[\r\n\t]+/g, " ").trim();

    if (accessToken) {
      sanitized = sanitized.split(accessToken).join("[redacted]");
    }

    sanitized = sanitized.replace(/CJ-Access-Token\s*[:=]\s*[^\s,}]+/gi, "CJ-Access-Token=[redacted]");
    sanitized = sanitized.replace(/access[_-]?token\s*[:=]\s*[^\s,}]+/gi, "access_token:[redacted]");

    return sanitized.slice(0, 240) || "CJ live probe failed";
  }

  private resolveLiveProbeTimeoutMs(): number {
    const rawTimeout = this.config.get<string>("CJ_LIVE_PROBE_TIMEOUT_MS")?.trim();
    const parsedTimeout = rawTimeout ? Number.parseInt(rawTimeout, 10) : 5000;

    return Number.isSafeInteger(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 5000;
  }

  private cjEndpoint(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  private firstTrimmed(...values: Array<string | undefined>): string | undefined {
    return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
  }

  private hasConfig(key: string): boolean {
    return Boolean(this.config.get<string>(key)?.trim());
  }
}
