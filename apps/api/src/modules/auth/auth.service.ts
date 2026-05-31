import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthTokenResponsePassword, User } from "@supabase/supabase-js";

import { SupabaseService } from "../../shared/services/supabase.service";
import { AuthJwtService } from "../../shared/services/auth.jwt.service";
import { mapSupabaseAuthError, publicAuthError, type PublicAuthError } from "./auth-error.mapper";
import type { LoginAuthDto, PasswordResetConfirmDto, PasswordResetRequestDto, RegisterAuthDto } from "./dto/auth.dto";

export type SafeAuthUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
  referralCode?: string | null;
};

type AuthResult<T> = { ok: true; value: T } | { ok: false; error: PublicAuthError };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: AuthJwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterAuthDto): Promise<AuthResult<{ user: SafeAuthUser; session?: Record<string, unknown> }>> {
    const normalized = this.validateRegister(input);
    if (normalized.ok === false) return { ok: false, error: normalized.error };

    const { email, password, referralCode, fullName } = normalized.value;
    try {
      const { data, error } = await this.supabase.client.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName || undefined,
          display_name: fullName || undefined,
          referral_code: referralCode || undefined,
          source: "rocket_web",
        },
      });

      if (error || !data.user) {
        this.logger.warn(JSON.stringify({ event: "auth_register_provider_failed", code: error?.code, status: error?.status }));
        return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
      }

      const profile = await this.upsertProfile(data.user, { fullName, referralCode });
      if (profile.ok === false) return { ok: false, error: profile.error };

      const token = this.jwt.sign({ sub: data.user.id, email: data.user.email || email, role: "user", permissions: [] });

      return {
        ok: true,
        value: {
          user: profile.value,
          session: {
            accessToken: token,
            tokenType: "Bearer",
          },
        },
      };
    } catch (error) {
      this.logger.error(JSON.stringify({ event: "auth_register_unexpected_failed" }), error instanceof Error ? error.stack : undefined);
      return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    }
  }

  async login(input: LoginAuthDto): Promise<AuthResult<{ user: SafeAuthUser; session: Record<string, unknown> }>> {
    const normalized = this.validateLogin(input);
    if (normalized.ok === false) return { ok: false, error: normalized.error };

    try {
      const response: AuthTokenResponsePassword = await this.supabase.client.auth.signInWithPassword(normalized.value);
      const { data, error } = response;
      if (error || !data.user || !data.session?.access_token) {
        this.logger.warn(JSON.stringify({ event: "auth_login_provider_failed", code: error?.code, status: error?.status }));
        return { ok: false, error: mapSupabaseAuthError(error, "INVALID_CREDENTIALS") };
      }

      const profile = await this.loadOrCreateProfile(data.user);
      if (profile.ok === false) return { ok: false, error: profile.error };
      const apiToken = this.jwt.sign({ sub: data.user.id, email: data.user.email || normalized.value.email, role: "user", permissions: [] });

      return {
        ok: true,
        value: {
          user: profile.value,
          session: {
            accessToken: apiToken,
            supabaseAccessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
            tokenType: data.session.token_type || "Bearer",
          },
        },
      };
    } catch (error) {
      this.logger.error(JSON.stringify({ event: "auth_login_unexpected_failed" }), error instanceof Error ? error.stack : undefined);
      return { ok: false, error: mapSupabaseAuthError(error, "INVALID_CREDENTIALS") };
    }
  }

  async me(authorization: string | undefined): Promise<AuthResult<{ user: SafeAuthUser }>> {
    const token = this.extractBearer(authorization);
    if (!token) return { ok: false, error: publicAuthError("SESSION_EXPIRED", 401) };

    try {
      const decoded = this.jwt.verify(token);
      const profile = await this.loadProfile(String(decoded.sub || decoded.id), decoded.email ? String(decoded.email) : undefined);
      if (profile.ok === false) return { ok: false, error: profile.error };
      return { ok: true, value: { user: profile.value } };
    } catch {
      try {
        const { data, error } = await this.supabase.client.auth.getUser(token);
        if (error || !data.user) return { ok: false, error: publicAuthError("SESSION_EXPIRED", 401) };
        const profile = await this.loadOrCreateProfile(data.user);
        if (profile.ok === false) return { ok: false, error: profile.error };
        return { ok: true, value: { user: profile.value } };
      } catch (error) {
        this.logger.warn(JSON.stringify({ event: "auth_me_failed" }));
        return { ok: false, error: mapSupabaseAuthError(error, "SESSION_EXPIRED") };
      }
    }
  }

  async logout(): Promise<AuthResult<{ signedOut: true }>> {
    return { ok: true, value: { signedOut: true } };
  }

  async requestPasswordReset(input: PasswordResetRequestDto): Promise<AuthResult<{ requested: true }>> {
    const email = String(input.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return { ok: false, error: publicAuthError("INVALID_EMAIL") };
    const redirectTo = String(this.config.get<string>("AUTH_PASSWORD_RESET_REDIRECT_URL") || process.env.AUTH_PASSWORD_RESET_REDIRECT_URL || "").trim() || undefined;
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    return { ok: true, value: { requested: true } };
  }

  async confirmPasswordReset(input: PasswordResetConfirmDto): Promise<AuthResult<{ updated: true }>> {
    const token = this.extractBearer(input.accessToken);
    if (!token) return { ok: false, error: publicAuthError("SESSION_EXPIRED", 401) };
    if (!input.password || !PASSWORD_PATTERN.test(input.password)) return { ok: false, error: publicAuthError("WEAK_PASSWORD") };
    if (input.password !== input.confirmPassword) return { ok: false, error: publicAuthError("PASSWORD_MISMATCH") };
    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) return { ok: false, error: publicAuthError("SESSION_EXPIRED", 401) };
    const updated = await this.supabase.client.auth.admin.updateUserById(data.user.id, { password: input.password });
    if (updated.error) return { ok: false, error: mapSupabaseAuthError(updated.error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    return { ok: true, value: { updated: true } };
  }

  async readiness() {
    const blockers: string[] = [];
    const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!supabaseConfigured) blockers.push("supabase_configuration_missing");
    const health = supabaseConfigured ? await this.supabase.health() : { ok: false };
    const profilePersistenceReady = await this.profilePersistenceReady();
    if (!health.ok) blockers.push("auth_provider_unreachable");
    if (!profilePersistenceReady) blockers.push("profile_persistence_unavailable");
    return {
      success: blockers.length === 0,
      supabaseConfigured,
      authProviderReachable: Boolean(health.ok),
      profilePersistenceReady,
      blockers,
    };
  }

  private validateRegister(input: RegisterAuthDto): AuthResult<{ email: string; password: string; fullName: string; referralCode: string }> {
    const email = String(input.email || "").trim().toLowerCase();
    const password = String(input.password || "");
    const confirmPassword = String(input.confirmPassword || "");
    const fullName = String(input.fullName || "").trim();
    const referralCode = String(input.referralCode || "").trim();
    if (!EMAIL_PATTERN.test(email)) return { ok: false, error: publicAuthError("INVALID_EMAIL") };
    if (!PASSWORD_PATTERN.test(password)) return { ok: false, error: publicAuthError("WEAK_PASSWORD") };
    if (password !== confirmPassword) return { ok: false, error: publicAuthError("PASSWORD_MISMATCH") };
    return { ok: true, value: { email, password, fullName, referralCode } };
  }

  private validateLogin(input: LoginAuthDto): AuthResult<{ email: string; password: string }> {
    const email = String(input.email || "").trim().toLowerCase();
    const password = String(input.password || "");
    if (!EMAIL_PATTERN.test(email) || !password) return { ok: false, error: publicAuthError("INVALID_CREDENTIALS", 401) };
    return { ok: true, value: { email, password } };
  }

  private async upsertProfile(user: User, input: { fullName: string; referralCode: string }): Promise<AuthResult<SafeAuthUser>> {
    const payload = {
      user_id: user.id,
      email: user.email || null,
      full_name: input.fullName || null,
      display_name: input.fullName || null,
      referral_code: input.referralCode || null,
    };
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("user_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id,email,full_name,referral_code")
      .single();
    if (error) {
      this.logger.error(JSON.stringify({ event: "auth_profile_upsert_failed", code: error.code }));
      return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };
    }
    return { ok: true, value: this.safeUserFromProfile(data, user) };
  }

  private async loadOrCreateProfile(user: User): Promise<AuthResult<SafeAuthUser>> {
    const profile = await this.loadProfile(user.id, user.email || undefined);
    if (profile.ok) return profile;
    if (profile.ok === false && profile.error.errorCode !== "PROFILE_CREATION_FAILED") return profile;
    return this.upsertProfile(user, { fullName: String(user.user_metadata?.full_name || user.user_metadata?.display_name || ""), referralCode: String(user.user_metadata?.referral_code || "") });
  }

  private async loadProfile(userId: string, email?: string): Promise<AuthResult<SafeAuthUser>> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("user_profiles")
      .select("user_id,email,full_name,referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      this.logger.error(JSON.stringify({ event: "auth_profile_load_failed", code: error.code }));
      return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };
    }
    return { ok: true, value: this.safeUserFromProfile(data, { id: userId, email: email || null } as User) };
  }

  private safeUserFromProfile(profile: unknown, user: User): SafeAuthUser {
    const row = profile && typeof profile === "object" ? (profile as Record<string, unknown>) : {};
    return {
      id: String(row.user_id || user.id),
      email: typeof row.email === "string" ? row.email : user.email || null,
      fullName: typeof row.full_name === "string" ? row.full_name : null,
      referralCode: typeof row.referral_code === "string" ? row.referral_code : null,
    };
  }

  private extractBearer(header: string | undefined): string {
    const raw = String(header || "").trim();
    return raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw;
  }

  private async profilePersistenceReady(): Promise<boolean> {
    try {
      const { error } = await this.supabase.client.schema("app_public").from("user_profiles").select("user_id").limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
