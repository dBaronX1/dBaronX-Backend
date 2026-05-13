import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
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
        code: "FIRST_OWNER_BOOTSTRAP_DISABLED",
        message:
          "Set DBX_ENABLE_FIRST_OWNER_BOOTSTRAP=true only for the controlled owner-claim window.",
      });
    }

    const expectedToken =
      this.env("DBX_OWNER_BOOTSTRAP_TOKEN") || this.env("INTERNAL_SERVICE_TOKEN");
    if (!expectedToken) {
      throw new ServiceUnavailableException({
        code: "FIRST_OWNER_BOOTSTRAP_TOKEN_NOT_CONFIGURED",
        message:
          "Configure DBX_OWNER_BOOTSTRAP_TOKEN or INTERNAL_SERVICE_TOKEN before using first-owner bootstrap.",
      });
    }

    const suppliedToken = this.extractSuppliedToken(credentials);
    if (!suppliedToken) {
      throw new UnauthorizedException({
        code: "FIRST_OWNER_BOOTSTRAP_TOKEN_REQUIRED",
        message:
          "A valid Authorization bearer token or x-owner-bootstrap-token header is required.",
      });
    }

    if (!this.tokensMatch(suppliedToken, expectedToken)) {
      throw new ForbiddenException({
        code: "FIRST_OWNER_BOOTSTRAP_TOKEN_INVALID",
        message: "The supplied first-owner bootstrap token is invalid.",
      });
    }

    const data = await this.supabase.rpc<Record<string, unknown>>(
      "dbx_bootstrap_first_owner_user",
      {
        p_user_id: dto.userId,
        p_email: dto.email,
        p_display_name: dto.displayName,
        p_telegram_user_id: dto.telegramUserId,
        p_referral_code: dto.referralCode || "DBX-FIRST-0001",
      },
    );

    const publicBaseUrl =
      this.env("DBX_PUBLIC_APP_URL") ||
      this.env("NEXT_PUBLIC_APP_URL") ||
      this.env("WEB_BASE_URL") ||
      "";
    const referralPath = this.string(data.referralLinkPath);
    const initiationPath = this.string(data.initiationLinkPath);

    return {
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
    };
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
