import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { randomUUID } from "crypto";
import { MedusaAdminHeaders } from "../contracts/medusa-bridge.contract";

@Injectable()
export class MedusaHttpService {
  private readonly logger = new Logger(MedusaHttpService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly baseUrlCandidates: string[];
  private readonly adminApiKey: string;
  private readonly publishableKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrlCandidates = this.uniqueUrls([
      this.configService.get<string>("medusa.baseUrl"),
      process.env.MEDUSA_BASE_URL,
      process.env.MEDUSA_URL,
      process.env.MEDUSA_BACKEND_URL,
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
      "https://dbaronx-medusa-xrwh.onrender.com",
    ]);
    this.baseUrl = this.baseUrlCandidates[0] || "";
    this.adminApiKey =
      this.configService.get<string>("medusa.adminApiKey") ||
      process.env.MEDUSA_ADMIN_API_KEY ||
      "";
    this.publishableKey =
      this.configService.get<string>("medusa.publishableKey") ||
      process.env.MEDUSA_PUBLISHABLE_KEY ||
      "";

    if (!this.baseUrl) {
      throw new Error("MEDUSA_BASE_URL is required");
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });
  }

  getPublishableKeyConfigured(): boolean {
    return !!this.publishableKey;
  }

  getBaseUrlConfigured(): boolean {
    return !!this.baseUrl;
  }

  getAdminApiKeyConfigured(): boolean {
    return !!this.adminApiKey;
  }

  async get<T>(
    path: string,
    headers?: MedusaAdminHeaders,
    mode: "admin" | "store" = "admin",
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, headers, mode);
  }

  async post<T, B = unknown>(
    path: string,
    body: B,
    headers?: MedusaAdminHeaders,
    mode: "admin" | "store" = "admin",
  ): Promise<T> {
    return this.request<T>("POST", path, body, headers, mode);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    data?: unknown,
    headers?: MedusaAdminHeaders,
    mode: "admin" | "store" = "admin",
  ): Promise<T> {
    const requestId = headers?.["x-request-id"] || randomUUID();

    const finalHeaders: Record<string, string> = {
      "x-request-id": requestId,
      "x-caller-service": headers?.["x-caller-service"] || "dbaronx-api",
      "x-caller-surface": headers?.["x-caller-surface"] || "commerce-bridge",
    };

    if (mode === "admin") {
      if (!this.adminApiKey) {
        throw new HttpException(
          {
            success: false,
            message: "Medusa admin API key not configured",
            requestId,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      finalHeaders.authorization = `Bearer ${this.adminApiKey}`;
    } else if (this.publishableKey) {
      finalHeaders["x-publishable-api-key"] = this.publishableKey;
    }

    const config: AxiosRequestConfig = {
      url: path,
      method,
      data,
      headers: finalHeaders,
    };

    let lastStatus = 0;
    let lastResponse: unknown;
    let lastError: unknown;

    for (const baseURL of this.baseUrlCandidates) {
      try {
        const response = await this.client.request({ ...config, baseURL });
        lastStatus = response.status;
        lastResponse = response.data;

        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }

        if (response.status === 401 || response.status === 403) {
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    this.logger.error(
      `Medusa request failed: ${method} ${path} -> ${lastStatus || "network"}`,
      JSON.stringify({
        requestId,
        response: lastResponse,
        errorName: lastError instanceof Error ? lastError.name : undefined,
      }),
    );

    throw new HttpException(
      {
        success: false,
        message: "Upstream commerce request failed",
        code: "MEDUSA_UPSTREAM_UNAVAILABLE",
        medusaStatus: lastStatus || 0,
        requestId,
      },
      lastStatus >= 400 && lastStatus < 600
        ? lastStatus
        : HttpStatus.BAD_GATEWAY,
    );
  }

  private uniqueUrls(values: Array<string | undefined>): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => String(value || "").trim().replace(/\/+$/, ""))
          .filter((value) => value.length > 0),
      ),
    );
  }
}
