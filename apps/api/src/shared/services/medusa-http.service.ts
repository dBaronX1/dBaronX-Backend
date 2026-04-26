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
  private readonly adminApiKey: string;
  private readonly publishableKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>("medusa.baseUrl") ||
      process.env.MEDUSA_BASE_URL ||
      "";
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

    const response = await this.client.request(config);

    if (response.status >= 200 && response.status < 300) {
      return response.data as T;
    }

    this.logger.error(
      `Medusa request failed: ${method} ${path} -> ${response.status}`,
      JSON.stringify({
        requestId,
        response: response.data,
      }),
    );

    throw new HttpException(
      {
        success: false,
        message: "Medusa bridge request failed",
        medusaStatus: response.status,
        medusaResponse: response.data,
        requestId,
      },
      response.status >= 400 && response.status < 600
        ? response.status
        : HttpStatus.BAD_GATEWAY,
    );
  }
}
