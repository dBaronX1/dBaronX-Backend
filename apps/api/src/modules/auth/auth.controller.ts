import { Body, Controller, Get, Headers, Post, Res } from "@nestjs/common";
import type { Response } from "express";

import { Public } from "../../shared/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { authErrorResponse } from "./auth-error.mapper";
import type { LoginAuthDto, PasswordResetConfirmDto, PasswordResetRequestDto, RegisterAuthDto } from "./dto/auth.dto";

@Controller("auth")
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterAuthDto, @Res() res: Response) {
    const result = await this.auth.register(body);
    if (result.ok === false) return res.status(result.error.status).json(authErrorResponse(result.error));
    return res.status(201).json({ success: true, ...result.value });
  }

  @Post("login")
  async login(@Body() body: LoginAuthDto, @Res() res: Response) {
    const result = await this.auth.login(body);
    if (result.ok === false) return res.status(result.error.status).json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("logout")
  async logout(@Res() res: Response) {
    const result = await this.auth.logout();
    if (result.ok === false) return res.status(result.error.status).json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Get("me")
  async me(@Headers("authorization") authorization: string | undefined, @Res() res: Response) {
    const result = await this.auth.me(authorization);
    if (result.ok === false) return res.status(result.error.status).json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("password-reset/request")
  async requestPasswordReset(@Body() body: PasswordResetRequestDto, @Res() res: Response) {
    const result = await this.auth.requestPasswordReset(body);
    if (result.ok === false) return res.status(result.error.status).json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Post("password-reset/confirm")
  async confirmPasswordReset(@Body() body: PasswordResetConfirmDto, @Res() res: Response) {
    const result = await this.auth.confirmPasswordReset(body);
    if (result.ok === false) return res.status(result.error.status).json(authErrorResponse(result.error));
    return res.status(200).json({ success: true, ...result.value });
  }

  @Get("readiness")
  async readiness(@Res() res: Response) {
    const result = await this.auth.readiness();
    return res.status(result.success ? 200 : 503).json(result);
  }
}
