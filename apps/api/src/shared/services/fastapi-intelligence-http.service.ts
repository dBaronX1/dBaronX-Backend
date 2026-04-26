import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { randomUUID } from "crypto";
import {
  FastapiEnvelope,
  FastapiIdentityHeaders,
} from "../contracts/fastapi-intelligence.contract";

@Injectable()
export class FastapiIntelligenceHttpService {
  private readonly logger = new Logger(FastapiIntelligenceHttpService.name);
  private readonly client: AxiosInstance;
  private readonly internalToken: string;

  constructor(private readonly configService: ConfigService) {
    const baseURL =
      this.configService.get<string>("fastapi.baseUrl") ||
      process.env.FASTAPI_BASE_URL ||
      "";
    this.internalToken =
      this.configService.get<string>("fastapi.internalServiceToken") ||
      process.env.INTERNAL_SERVICE_TOKEN ||
      "";

    if (!baseURL) {
      throw new Error("FASTAPI_BASE_URL is required");
    }

    if (!this.internalToken) {
      throw new Error("INTERNAL_SERVICE_TOKEN is required");
    }

    this.client = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      validateStatus: () => true,
    });
  }

  async get<T>(
    path: string,
    headers?: Partial<FastapiIdentityHeaders>,
  ): Promise<FastapiEnvelope<T>> {
    return this.request<T>("GET", path, undefined, headers);
  }

  async post<T, B = unknown>(
    path: string,
    body: B,
    headers?: Partial<FastapiIdentityHeaders>,
  ): Promise<FastapiEnvelope<T>> {
    return this.request<T>("POST", path, body, headers);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    data?: unknown,
    headers?: Partial<FastapiIdentityHeaders>,
  ): Promise<FastapiEnvelope<T>> {
    const requestId = headers?.["x-request-id"] || randomUUID();

    const finalHeaders: FastapiIdentityHeaders = {
      "x-internal-token": this.internalToken,
      "x-request-id": requestId,
      "x-caller-service": headers?.["x-caller-service"] || "dbaronx-api",
      "x-caller-surface": headers?.["x-caller-surface"] || "nestjs",
      "x-actor-id": headers?.["x-actor-id"],
    };

    const config: AxiosRequestConfig = {
      url: path,
      method,
      data,
      headers: finalHeaders,
    };

    const response = await this.client.request(config);

    if (response.status >= 200 && response.status < 300) {
      return response.data as FastapiEnvelope<T>;
    }

    this.logger.error(
      `FastAPI request failed: ${method} ${path} -> ${response.status}`,
      JSON.stringify({
        requestId,
        response: response.data,
      }),
    );

    throw new HttpException(
      {
        success: false,
        message: "FastAPI intelligence request failed",
        fastapiStatus: response.status,
        fastapiResponse: response.data,
        requestId,
      },
      response.status >= 400 && response.status < 600
        ? response.status
        : HttpStatus.BAD_GATEWAY,
    );
  }
}
