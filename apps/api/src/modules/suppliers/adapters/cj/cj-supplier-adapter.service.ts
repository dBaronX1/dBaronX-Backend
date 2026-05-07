import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { CjImportReadinessRequestDto, CjProductImportDto } from "./dto/cj-supplier.dto";

export interface CjLiveProbeResult {
  cjConfigured: boolean;
  cjLiveProbeAttempted: boolean;
  cjLiveProbeOk: boolean;
  cjLiveProbeStatusCode: number | null;
  cjLiveProbeErrorCode: string | null;
  cjLiveProbeErrorMessageSanitized: string | null;
  blocker: string | null;
  endpoint: string | null;
}

interface CjImportReadinessProduct {
  supplier: "cj";
  supplierProductId: string | null;
  supplierSku: string | null;
  title: string | null;
  costPrice: number | null;
  currency: string | null;
  shippingCountries: string[];
  deliveryEstimate: string | null;
  images: string[];
  sourceUrl: string | null;
  rawAvailable: boolean;
}

@Injectable()
export class CjSupplierAdapterService {
  private readonly liveProbePath = "/v1/product/getCategory";

  constructor(private readonly config: ConfigService) {}

  mapImport(input: CjProductImportDto) {
    const supplierCost = 1000;
    const retailPrice = Math.round(supplierCost * (1 + input.marginPct / 100));
    return { supplier: "cj", supplierProductId: input.cjProductId, sku: input.targetSku, supplierCost, retailPrice, metadata: { mapper: "price-margin-v1" } };
  }

  canSendLiveOrder() { return this.config.get<string>("SUPPLIER_LIVE_MODE") === "true"; }

  async liveProbe(): Promise<CjLiveProbeResult> {
    const accessToken = this.getAccessToken();
    const configured = Boolean(accessToken && this.hasBaseUrl());

    if (!configured) {
      return {
        cjConfigured: false,
        cjLiveProbeAttempted: false,
        cjLiveProbeOk: false,
        cjLiveProbeStatusCode: null,
        cjLiveProbeErrorCode: null,
        cjLiveProbeErrorMessageSanitized: null,
        blocker: "cj_credentials_missing",
        endpoint: null,
      };
    }

    const endpoint = this.buildUrl(this.liveProbePath);

    try {
      const response = await axios.get(endpoint, {
        headers: this.safeHeaders(accessToken),
        timeout: this.timeoutMs(),
        validateStatus: () => true,
      });

      const body = response.data as Record<string, unknown> | undefined;
      const ok = response.status >= 200 && response.status < 300 && this.isCjSuccess(body);

      return {
        cjConfigured: true,
        cjLiveProbeAttempted: true,
        cjLiveProbeOk: ok,
        cjLiveProbeStatusCode: response.status,
        cjLiveProbeErrorCode: ok ? null : this.errorCode(response.status, body),
        cjLiveProbeErrorMessageSanitized: ok ? null : this.sanitizeMessage(body?.message || response.statusText || "CJ live probe failed"),
        blocker: ok ? null : this.blockerFor(response.status, body),
        endpoint: this.liveProbePath,
      };
    } catch (error) {
      return this.networkProbeFailure(error, endpoint);
    }
  }

  async importReadiness(input: CjImportReadinessRequestDto) {
    const productId = this.clean(input?.productId);
    const sku = this.clean(input?.sku);

    if (!productId && !sku) {
      throw new BadRequestException({
        success: false,
        blockers: ["cj_explicit_product_id_or_sku_required"],
        message: "Provide productId or sku for controlled CJ import-readiness.",
      });
    }

    const accessToken = this.getAccessToken();
    const baseUrlConfigured = this.hasBaseUrl();
    const blockers: string[] = [];
    let product: CjImportReadinessProduct = this.emptyProduct(productId, sku);
    let cjStatusCode: number | null = null;
    let cjErrorCode: string | null = null;
    let cjErrorMessageSanitized: string | null = null;

    if (!accessToken || !baseUrlConfigured) {
      blockers.push("cj_credentials_missing");
    } else {
      try {
        const response = await this.fetchImportCandidate(productId, sku, accessToken);
        cjStatusCode = response.status;
        const body = response.data as Record<string, unknown> | undefined;

        if (response.status >= 200 && response.status < 300 && this.isCjSuccess(body)) {
          product = this.normalizeProduct(body?.data, productId, sku);
        } else {
          cjErrorCode = this.errorCode(response.status, body);
          cjErrorMessageSanitized = this.sanitizeMessage(body?.message || response.statusText || "CJ product lookup failed");
          blockers.push(this.blockerFor(response.status, body));
        }
      } catch (error) {
        const failure = this.networkProbeFailure(error, null);
        cjStatusCode = failure.cjLiveProbeStatusCode;
        cjErrorCode = failure.cjLiveProbeErrorCode;
        cjErrorMessageSanitized = failure.cjLiveProbeErrorMessageSanitized;
        blockers.push(failure.blocker || "cj_live_probe_unreachable");
      }
    }

    const minimumFieldsReady = Boolean(product.supplierProductId && product.title && product.costPrice !== null && product.currency && product.images.length > 0);
    if (!minimumFieldsReady) {
      blockers.push("cj_import_minimum_fields_missing");
    }

    const uniqueBlockers = [...new Set(blockers)];

    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      supplierImportReady: uniqueBlockers.length === 0 && product.rawAvailable && minimumFieldsReady,
      ...product,
      cjLookupStatusCode: cjStatusCode,
      cjLookupErrorCode: cjErrorCode,
      cjLookupErrorMessageSanitized: cjErrorMessageSanitized,
      medusaSeeded: false,
      audit: {
        explicitProductIdRequired: true,
        explicitSkuRequiredWhenProductIdMissing: true,
        bulkImport: false,
        mutationPerformed: false,
      },
    };
  }

  private async fetchImportCandidate(productId: string | null, sku: string | null, accessToken: string) {
    const path = productId ? "/v1/product/query" : "/v1/product/variant/query";
    const params = productId ? { pid: productId } : { productSku: sku };

    return axios.get(this.buildUrl(path), {
      headers: this.safeHeaders(accessToken),
      params,
      timeout: this.timeoutMs(),
      validateStatus: () => true,
    });
  }

  private normalizeProduct(raw: unknown, requestedProductId: string | null, requestedSku: string | null): CjImportReadinessProduct {
    const data = this.firstRecord(raw);
    const productId = this.stringFrom(data, ["pid", "productId", "id", "cjProductId"]) || requestedProductId;
    const sku = this.stringFrom(data, ["productSku", "sku", "variantSku", "cjSku", "variantKey"]) || requestedSku;
    const title = this.stringFrom(data, ["productNameEn", "productName", "nameEn", "name", "title"]);
    const costPrice = this.numberFrom(data, ["sellPrice", "price", "productPrice", "variantSellPrice", "costPrice"]);
    const currency = this.stringFrom(data, ["currency", "currencyCode"]) || (costPrice !== null ? "USD" : null);
    const images = this.imagesFrom(data);
    const shippingCountries = this.stringArrayFrom(data, ["countryCode", "countryCodes", "shippingCountries", "shipFrom"]);
    const deliveryEstimate = this.stringFrom(data, ["deliveryEstimate", "deliveryTime", "estimatedDelivery", "shippingTime"]);
    const sourceUrl = productId ? `https://www.cjdropshipping.com/product/${encodeURIComponent(productId)}` : null;

    return {
      supplier: "cj",
      supplierProductId: productId,
      supplierSku: sku,
      title,
      costPrice,
      currency,
      shippingCountries,
      deliveryEstimate,
      images,
      sourceUrl,
      rawAvailable: Boolean(data && (productId || sku || title)),
    };
  }

  private emptyProduct(productId: string | null, sku: string | null): CjImportReadinessProduct {
    return {
      supplier: "cj",
      supplierProductId: productId,
      supplierSku: sku,
      title: null,
      costPrice: null,
      currency: null,
      shippingCountries: [],
      deliveryEstimate: null,
      images: [],
      sourceUrl: productId ? `https://www.cjdropshipping.com/product/${encodeURIComponent(productId)}` : null,
      rawAvailable: false,
    };
  }

  private networkProbeFailure(error: unknown, endpoint: string | null): CjLiveProbeResult {
    const axiosError = error as AxiosError;
    const timedOut = axios.isAxiosError(error) && (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT");
    const status = axios.isAxiosError(error) ? axiosError.response?.status ?? null : null;
    const body = axios.isAxiosError(error) ? axiosError.response?.data as Record<string, unknown> | undefined : undefined;

    return {
      cjConfigured: true,
      cjLiveProbeAttempted: true,
      cjLiveProbeOk: false,
      cjLiveProbeStatusCode: status,
      cjLiveProbeErrorCode: timedOut ? "timeout" : this.errorCode(status, body),
      cjLiveProbeErrorMessageSanitized: this.sanitizeMessage(timedOut ? "CJ live probe timed out" : body?.message || axiosError.message || "CJ live probe unreachable"),
      blocker: timedOut || !status ? "cj_live_probe_unreachable" : this.blockerFor(status, body),
      endpoint: endpoint ? this.liveProbePath : null,
    };
  }

  private isCjSuccess(body?: Record<string, unknown>): boolean {
    if (!body) return false;
    if (body.success === true || body.result === true) return true;
    return Number(body.code) === 200 || Number(body.code) === 0;
  }

  private blockerFor(status: number | null, body?: Record<string, unknown>): string {
    const code = String(body?.code || "").toLowerCase();
    const message = String(body?.message || "").toLowerCase();
    if (status === 401 || status === 403 || code.includes("unauth") || code.includes("token") || message.includes("token") || message.includes("unauthorized")) {
      return "cj_token_invalid_or_expired";
    }
    if (status === 429 || message.includes("rate limit") || message.includes("too many")) {
      return "cj_rate_limited";
    }
    if (!status || status >= 500) {
      return "cj_live_probe_unreachable";
    }
    return "cj_live_probe_failed";
  }

  private errorCode(status: number | null, body?: Record<string, unknown>): string | null {
    if (body?.code !== undefined && body.code !== null) return String(body.code);
    return status ? `http_${status}` : null;
  }

  private safeHeaders(accessToken: string): Record<string, string> {
    return {
      "Accept": "application/json",
      "CJ-Access-Token": accessToken,
      "User-Agent": "dbaronx-api-cj-readiness/1.0",
    };
  }

  private buildUrl(path: string): string {
    return `${this.getBaseUrl()}${path}`;
  }

  private getBaseUrl(): string {
    const configured = this.config.get<string>("CJ_API_BASE_URL") || "";
    return configured.trim().replace(/\/+$/, "").replace(/\/api2\.0$/, "") + "/api2.0";
  }

  private hasBaseUrl(): boolean {
    return Boolean((this.config.get<string>("CJ_API_BASE_URL") || "").trim());
  }

  private getAccessToken(): string {
    return (this.config.get<string>("CJ_ACCESS_TOKEN") || "").trim();
  }

  private timeoutMs(): number {
    return Number(this.config.get<string>("CJ_LIVE_PROBE_TIMEOUT_MS") || 5000);
  }

  private clean(value?: string): string | null {
    const cleaned = String(value || "").trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private sanitizeMessage(value: unknown): string {
    const token = this.getAccessToken();
    let message = String(value || "").replace(/[\r\n\t]+/g, " ").slice(0, 240);
    if (token) {
      message = message.split(token).join("[redacted]");
    }
    return message.replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
  }

  private firstRecord(raw: unknown): Record<string, unknown> | null {
    if (Array.isArray(raw)) return this.firstRecord(raw[0]);
    if (raw && typeof raw === "object") {
      const record = raw as Record<string, unknown>;
      for (const key of ["content", "list", "records", "data", "variants"]) {
        if (Array.isArray(record[key])) return this.firstRecord((record[key] as unknown[])[0]);
      }
      return record;
    }
    return null;
  }

  private stringFrom(data: Record<string, unknown> | null, keys: string[]): string | null {
    if (!data) return null;
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return null;
  }

  private numberFrom(data: Record<string, unknown> | null, keys: string[]): number | null {
    if (!data) return null;
    for (const key of keys) {
      const value = data[key];
      const parsed = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return null;
  }

  private imagesFrom(data: Record<string, unknown> | null): string[] {
    if (!data) return [];
    const values = [data.productImage, data.productImageSet, data.productImages, data.image, data.images, data.variantImage];
    const flat = values.flatMap((value) => Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : []);
    return [...new Set(flat.map((value) => String(value).trim()).filter((value) => /^https?:\/\//.test(value)))].slice(0, 12);
  }

  private stringArrayFrom(data: Record<string, unknown> | null, keys: string[]): string[] {
    if (!data) return [];
    const values = keys.flatMap((key) => {
      const value = data[key];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return value.split(",");
      return [];
    });
    return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
  }
}
