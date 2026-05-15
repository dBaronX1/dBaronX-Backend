import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { SupabaseService } from "../../shared/database/supabase.service";
import { BootstrapFirstOwnerDto } from "./dto/bootstrap-first-owner.dto";
import { BootstrapFirstOwnerResponseDto } from "./dto/bootstrap-first-owner-response.dto";

type FirstOwnerBootstrapCredentials = {
  authorization?: string;
  ownerBootstrapToken?: string;
};

@Injectable()
export class FirstOwnerBootstrapService {
  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async bootstrapFirstOwner(
    dto: BootstrapFirstOwnerDto,
    credentials: FirstOwnerBootstrapCredentials = {},
  ): Promise<BootstrapFirstOwnerResponseDto> {
    if (this.env("DBX_ENABLE_FIRST_OWNER_BOOTSTRAP") !== "true") {
      throw new ForbiddenException({
        code: "bootstrap_disabled",
        message:
          "Set DBX_ENABLE_FIRST_OWNER_BOOTSTRAP=true only for the controlled owner-claim window.",
      });
    }

    const expectedToken =
      this.env("DBX_OWNER_BOOTSTRAP_TOKEN") || this.env("INTERNAL_SERVICE_TOKEN");
    if (!expectedToken) {
      throw new ForbiddenException({
        code: "owner_bootstrap_token_not_configured",
        message:
          "Configure DBX_OWNER_BOOTSTRAP_TOKEN or INTERNAL_SERVICE_TOKEN before using first-owner bootstrap.",
      });
    }

    const suppliedToken = this.extractSuppliedToken(credentials);
    if (!suppliedToken) {
      throw new UnauthorizedException({
        code: "missing_owner_bootstrap_token",
        message:
          "A valid Authorization bearer token or x-owner-bootstrap-token header is required.",
      });
    }

    if (!this.tokensMatch(suppliedToken, expectedToken)) {
      throw new ForbiddenException({
        code: "invalid_owner_bootstrap_token",
        message: "The supplied first-owner bootstrap token is invalid.",
      });
    }

    let data: Record<string, unknown>;
    try {
      data = await this.supabase.rpcInSchema<Record<string, unknown>>(
        "app_public",
        "dbx_bootstrap_first_owner_user",
        {
          p_user_id: dto.userId,
          p_email: dto.email,
          p_display_name: dto.displayName,
          p_telegram_user_id: dto.telegramUserId,
          p_referral_code: dto.referralCode || "DBX-FIRST-0001",
        },
      );
    } catch (error) {
      throw this.structuredRpcBlocker(error);
    }

    const publicBaseUrl =
      this.env("DBX_PUBLIC_APP_URL") ||
      this.env("NEXT_PUBLIC_APP_URL") ||
      this.env("WEB_BASE_URL") ||
      "";
    const referralPath = this.string(data.referralLinkPath);
    const initiationPath = this.string(data.initiationLinkPath);

    const response = {
      platformUserId: this.string(data.platformUserId),
      firstUserNumber: Number(data.firstUserNumber || 1),
      ownerReferenceId: this.string(data.ownerReferenceId),
      referralCode: this.string(data.referralCode),
      referralLinkPath: referralPath,
      referralLink: this.absoluteUrl(publicBaseUrl, referralPath),
      initiationCode: this.string(data.initiationCode),
      initiationLinkPath: initiationPath,
      initiationLink: this.absoluteUrl(publicBaseUrl, initiationPath),
      walletId: this.string(data.walletId),
      affiliateAccountId: this.string(data.affiliateAccountId),
      fakeWalletCreditCreated: false,
      fakeReferralEarningCreated: false,
    } satisfies BootstrapFirstOwnerResponseDto;

    const missing = [
      "platformUserId",
      "firstUserNumber",
      "ownerReferenceId",
      "referralCode",
      "referralLinkPath",
      "initiationCode",
      "initiationLinkPath",
      "walletId",
      "affiliateAccountId",
    ].filter((key) => !response[key as keyof BootstrapFirstOwnerResponseDto]);

    if (missing.length > 0) {
      throw new HttpException(
        {
          code: "first_owner_bootstrap_incomplete",
          message:
            "First-owner bootstrap RPC returned an incomplete owner record.",
          blockers: missing.map((key) => `missing_${key}`),
          details: { missing },
        },
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    return response;
  }

  private structuredRpcBlocker(error: unknown): HttpException {
    const details =
      typeof (error as { getResponse?: () => unknown }).getResponse === "function"
        ? (error as { getResponse: () => unknown }).getResponse()
        : error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) };

    return new HttpException(
      {
        code: "first_owner_bootstrap_rpc_blocked",
        message:
          "First-owner bootstrap could not complete because the app_public Supabase RPC/database path is not ready.",
        blockers: ["app_public.dbx_bootstrap_first_owner_user_unavailable"],
        details,
      },
      HttpStatus.FAILED_DEPENDENCY,
    );
  }

  private env(key: string): string {
    return String(this.config.get<string>(key) || process.env[key] || "").trim();
  }

  private extractSuppliedToken(
    credentials: FirstOwnerBootstrapCredentials,
  ): string {
    return (
      this.extractBearer(credentials.authorization) ||
      String(credentials.ownerBootstrapToken || "").trim()
    );
  }

  private extractBearer(value?: string): string {
    const header = String(value || "").trim();
    return header.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : "";
  }

  private tokensMatch(suppliedToken: string, expectedToken: string): boolean {
    const supplied = Buffer.from(suppliedToken);
    const expected = Buffer.from(expectedToken);

    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  }

  private string(value: unknown): string {
    return String(value || "").trim();
  }

  private absoluteUrl(baseUrl: string, path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return baseUrl ? `${baseUrl.replace(/\/+$/, "")}${cleanPath}` : cleanPath;
  }
}
