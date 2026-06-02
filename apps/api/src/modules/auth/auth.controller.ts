import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Res,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import type { Response } from "express";

import { Public } from "../../shared/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { authErrorResponse } from "./auth-error.mapper";
import type {
  LoginAuthDto,
  UpdateProfileAuthDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  RegisterAuthDto,
} from "./dto/auth.dto";

@Controller({ path: "auth", version: VERSION_NEUTRAL })
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private ownerBootstrapStatus(code?: string): number {
    if (!code) return 200;
    if (code === "bootstrap_disabled") return 403;
    if (code === "internal_token_missing" || code === "internal_token_invalid")
      return 401;
    if (code === "owner_email_missing" || code === "owner_password_missing")
      return 400;
    if (code === "owner_create_failed") return 502;
    if (code === "profile_upsert_failed") return 200;
    return 503;
  }

  @Post("register")
  async register(@Body() body: RegisterAuthDto, @Res() res: Response) {
    const result = await this.auth.register(body);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(201).json({ success: true, ...result.value });
  }

  @Post("login")
  async login(@Body() body: LoginAuthDto, @Res() res: Response) {
    const result = await this.auth.login(body);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("profile")
  async updateProfile(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: UpdateProfileAuthDto,
    @Res() res: Response,
  ) {
    const result = await this.auth.updateProfile(authorization, body);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("logout")
  async logout(@Res() res: Response) {
    const result = await this.auth.logout();
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Get("me")
  async me(
    @Headers("authorization") authorization: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.auth.me(authorization);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("owner/bootstrap")
  async bootstrapOwner(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ) {
    const result = await this.auth.bootstrapOwner(headers);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    const status = this.ownerBootstrapStatus(result.value.code);
    return res.status(status).json(result.value);
  }

  @Post("password-reset/request")
  async requestPasswordReset(
    @Body() body: PasswordResetRequestDto,
    @Res() res: Response,
  ) {
    const result = await this.auth.requestPasswordReset(body);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("password-reset/confirm")
  async confirmPasswordReset(
    @Body() body: PasswordResetConfirmDto,
    @Res() res: Response,
  ) {
    const result = await this.auth.confirmPasswordReset(body);
    if (result.ok === false)
      return res
        .status(result.error.status)
        .json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Get("readiness")
  async readiness(@Res() res: Response) {
    const result = await this.auth.readiness();
    return res.status(result.success ? 200 : 503).json(result);
  }
}
