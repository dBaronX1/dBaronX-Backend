import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthTokenResponsePassword, Session, User } from "@supabase/supabase-js";

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
type ProfileTableName = "profiles" | "user_profiles";

type AuthReadiness = {
  success: boolean;
  supabaseConfigured: boolean;
  authProviderReachable: boolean;
  profilePersistenceReady: boolean;
  ownerBootstrapConfigured: boolean;
  requiredTables: {
    profiles: boolean;
  };
  blockers: string[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PROFILE_TABLE_CANDIDATES: ProfileTableName[] = ["profiles", "user_profiles"];
const PASSWORD_RESET_MESSAGE = "If an account exists, reset instructions will be sent.";

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

    const serviceReady = this.ensureAuthOperationsConfigured();
    if (serviceReady.ok === false) return serviceReady;

    const { email, password, referralCode, fullName } = normalized.value;
    try {
      const existingUser = await this.findExistingAuthUser(email);
      if (existingUser.ok === false) return { ok: false, error: existingUser.error };
      if (existingUser.value) return { ok: false, error: publicAuthError("EMAIL_ALREADY_REGISTERED", 409) };

      const { data, error } = await this.supabase.client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || undefined,
          display_name: fullName || undefined,
          referral_code: referralCode || undefined,
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
          session: this.safeSessionContract({ apiAccessToken: token }),
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

    const serviceReady = this.ensureAuthOperationsConfigured();
    if (serviceReady.ok === false) return serviceReady;

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
          session: this.safeSessionContract({ apiAccessToken: apiToken, supabaseSession: data.session }),
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
      const serviceReady = this.ensureSupabaseConfigured();
      if (serviceReady.ok === false) return serviceReady;
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


  async bootstrapOwner(headers: Record<string, string | string[] | undefined>): Promise<AuthResult<{ ownerCreated: boolean; profileUpserted: boolean; blockers: string[] }>> {
    const blockers: string[] = [];
    if (this.value("DBX_ENABLE_OWNER_BOOTSTRAP").toLowerCase() !== "true") blockers.push("owner_bootstrap_disabled");
    const expectedToken = this.value("INTERNAL_SERVICE_TOKEN");
    const receivedToken = this.headerValue(headers, "x-internal-token") || this.headerValue(headers, "x-internal-service-token");
    if (!expectedToken || receivedToken !== expectedToken) blockers.push("internal_token_required");
    const email = this.value("DBX_OWNER_EMAIL").toLowerCase();
    const password = this.value("DBX_OWNER_PASSWORD");
    const fullName = this.value("DBX_OWNER_FULL_NAME") || "dBaronX Owner";
    if (!EMAIL_PATTERN.test(email)) blockers.push("owner_email_missing");
    if (!PASSWORD_PATTERN.test(password)) blockers.push("owner_password_missing");
    const configured = this.ensureAuthOperationsConfigured();
    if (configured.ok === false) blockers.push("auth_operations_unavailable");
    if (blockers.length > 0) {
      return { ok: true, value: { ownerCreated: false, profileUpserted: false, blockers } };
    }

    try {
      const existing = await this.findAuthUserByEmail(email);
      if (existing.ok === false) return { ok: false, error: existing.error };
      let owner = existing.value;
      let ownerCreated = false;
      if (!owner) {
        const created = await this.supabase.client.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, display_name: fullName, dbx_owner: true },
        });
        if (created.error || !created.data.user) {
          this.logger.warn(JSON.stringify({ event: "owner_bootstrap_create_failed", code: created.error?.code, status: created.error?.status }));
          return { ok: false, error: mapSupabaseAuthError(created.error, "AUTH_TEMPORARILY_UNAVAILABLE") };
        }
        owner = created.data.user;
        ownerCreated = true;
      }
      const profile = await this.upsertOwnerProfile(owner, { fullName });
      if (profile.ok === false) return { ok: false, error: profile.error };
      return { ok: true, value: { ownerCreated, profileUpserted: true, blockers: [] } };
    } catch (error) {
      this.logger.error(JSON.stringify({ event: "owner_bootstrap_unexpected_failed" }), error instanceof Error ? error.stack : undefined);
      return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    }
  }

  async requestPasswordReset(input: PasswordResetRequestDto): Promise<AuthResult<{ requested: true; message: string }>> {
    const email = String(input.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return { ok: false, error: publicAuthError("INVALID_EMAIL") };

    if (!this.supabase.isConfigured()) {
      this.logger.warn(JSON.stringify({ event: "auth_password_reset_skipped_unconfigured" }));
      return { ok: true, value: { requested: true, message: PASSWORD_RESET_MESSAGE } };
    }

    try {
      const redirectTo = String(this.config.get<string>("AUTH_PASSWORD_RESET_REDIRECT_URL") || process.env.AUTH_PASSWORD_RESET_REDIRECT_URL || "").trim() || undefined;
      const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) this.logger.warn(JSON.stringify({ event: "auth_password_reset_provider_failed", code: error.code, status: error.status }));
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: "auth_password_reset_unexpected_failed" }));
    }

    return { ok: true, value: { requested: true, message: PASSWORD_RESET_MESSAGE } };
  }

  async confirmPasswordReset(input: PasswordResetConfirmDto): Promise<AuthResult<{ updated: true }>> {
    const token = this.extractBearer(input.accessToken);
    if (!token) return { ok: false, error: publicAuthError("SESSION_EXPIRED", 401) };
    if (!input.password || !PASSWORD_PATTERN.test(input.password)) return { ok: false, error: publicAuthError("WEAK_PASSWORD") };
    if (input.password !== input.confirmPassword) return { ok: false, error: publicAuthError("PASSWORD_MISMATCH") };

    const serviceReady = this.ensureAuthOperationsConfigured();
    if (serviceReady.ok === false) return serviceReady;

    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) return { ok: false, error: publicAuthError("SESSION_EXPIRED", 401) };
    const updated = await this.supabase.client.auth.admin.updateUserById(data.user.id, { password: input.password });
    if (updated.error) return { ok: false, error: mapSupabaseAuthError(updated.error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    return { ok: true, value: { updated: true } };
  }

  async readiness(): Promise<AuthReadiness> {
    const blockers: string[] = [];
    const supabaseUrlConfigured = this.hasEnv("SUPABASE_URL");
    const supabaseServiceRoleConfigured = this.hasEnv("SUPABASE_SERVICE_ROLE_KEY");
    const jwtSecretConfigured = this.hasEnv("JWT_SECRET");
    const supabaseConfigured = supabaseUrlConfigured && supabaseServiceRoleConfigured;

    if (!supabaseUrlConfigured) blockers.push("supabase_url_missing");
    if (!supabaseServiceRoleConfigured) blockers.push("supabase_admin_credentials_missing");
    if (!jwtSecretConfigured) blockers.push("jwt_secret_missing");

    const health = supabaseConfigured ? await this.supabase.health() : { ok: false };
    const profilePersistence = supabaseConfigured ? await this.profilePersistenceStatus() : { ready: false, table: null };

    if (supabaseConfigured && !health.ok) blockers.push("auth_provider_unreachable");
    if (supabaseConfigured && !profilePersistence.ready) blockers.push("profiles_table_unavailable");

    return {
      success: blockers.length === 0,
      supabaseConfigured,
      authProviderReachable: Boolean(health.ok),
      profilePersistenceReady: profilePersistence.ready,
      ownerBootstrapConfigured: this.ownerBootstrapConfigured(),
      requiredTables: {
        profiles: profilePersistence.ready,
      },
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
    const table = await this.resolveProfileTable();
    if (!table) return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };

    const payload = {
      user_id: user.id,
      email: user.email || null,
      full_name: input.fullName || null,
      referral_code: input.referralCode || null,
    };
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from(table)
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id,email,full_name,referral_code")
      .single();
    if (error) {
      this.logger.error(JSON.stringify({ event: "auth_profile_upsert_failed", code: error.code, table }));
      return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };
    }
    return { ok: true, value: this.safeUserFromProfile(data, user) };
  }


  private async upsertOwnerProfile(user: User, input: { fullName: string }): Promise<AuthResult<SafeAuthUser>> {
    const table = await this.resolveProfileTable();
    if (!table) return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };
    const basePayload = { user_id: user.id, email: user.email || null, full_name: input.fullName || null };
    const ownerPayload = { ...basePayload, role: "owner", account_role: "owner", is_admin: true };
    const select = "user_id,email,full_name,referral_code";
    let result = await this.supabase.client.schema("app_public").from(table).upsert(ownerPayload, { onConflict: "user_id" }).select(select).single();
    if (result.error) {
      result = await this.supabase.client.schema("app_public").from(table).upsert(basePayload, { onConflict: "user_id" }).select(select).single();
    }
    if (result.error) {
      this.logger.error(JSON.stringify({ event: "owner_profile_upsert_failed", code: result.error.code, table }));
      return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };
    }
    return { ok: true, value: this.safeUserFromProfile(result.data, user) };
  }

  private async loadOrCreateProfile(user: User): Promise<AuthResult<SafeAuthUser>> {
    const profile = await this.loadProfile(user.id, user.email || undefined);
    if (profile.ok) return profile;
    if (profile.ok === false && profile.error.errorCode !== "PROFILE_CREATION_FAILED") return profile;
    return this.upsertProfile(user, { fullName: String(user.user_metadata?.full_name || user.user_metadata?.display_name || ""), referralCode: String(user.user_metadata?.referral_code || "") });
  }

  private async loadProfile(userId: string, email?: string): Promise<AuthResult<SafeAuthUser>> {
    const table = await this.resolveProfileTable();
    if (!table) return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };

    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from(table)
      .select("user_id,email,full_name,referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      this.logger.error(JSON.stringify({ event: "auth_profile_load_failed", code: error.code, table }));
      return { ok: false, error: publicAuthError("PROFILE_CREATION_FAILED", 503) };
    }
    return { ok: true, value: this.safeUserFromProfile(data, { id: userId, email: email || null } as User) };
  }

  private safeUserFromProfile(profile: unknown, user: User): SafeAuthUser {
    const row = profile && typeof profile === "object" ? (profile as Record<string, unknown>) : {};
    return {
      id: String(row.user_id || row.id || user.id),
      email: typeof row.email === "string" ? row.email : user.email || null,
      fullName: typeof row.full_name === "string" ? row.full_name : null,
      referralCode: typeof row.referral_code === "string" ? row.referral_code : null,
    };
  }

  private extractBearer(header: string | undefined): string {
    const raw = String(header || "").trim();
    return raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw;
  }

  private async profilePersistenceStatus(): Promise<{ ready: boolean; table: ProfileTableName | null }> {
    const table = await this.resolveProfileTable();
    return { ready: Boolean(table), table };
  }

  private async resolveProfileTable(): Promise<ProfileTableName | null> {
    if (!this.supabase.isConfigured()) return null;

    for (const table of PROFILE_TABLE_CANDIDATES) {
      try {
        const { error } = await this.supabase.client.schema("app_public").from(table).select("user_id").limit(1);
        if (!error) return table;
      } catch {
        // Try the next supported profile table name.
      }
    }

    return null;
  }

  private ensureAuthOperationsConfigured(): AuthResult<true> {
    const supabaseReady = this.ensureSupabaseConfigured();
    if (supabaseReady.ok === false) return supabaseReady;
    if (!this.hasEnv("JWT_SECRET")) return { ok: false, error: publicAuthError("AUTH_TEMPORARILY_UNAVAILABLE", 503) };
    return { ok: true, value: true };
  }

  private ensureSupabaseConfigured(): AuthResult<true> {
    if (!this.supabase.isConfigured()) return { ok: false, error: publicAuthError("AUTH_TEMPORARILY_UNAVAILABLE", 503) };
    return { ok: true, value: true };
  }


  private async findAuthUserByEmail(email: string): Promise<AuthResult<User | null>> {
    try {
      const { data, error } = await this.supabase.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
      const users = Array.isArray(data.users) ? (data.users as User[]) : [];
      return { ok: true, value: users.find((user) => user.email?.toLowerCase() === email) || null };
    } catch (error) {
      return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    }
  }

  private ownerBootstrapConfigured(): boolean {
    return this.value("DBX_ENABLE_OWNER_BOOTSTRAP").toLowerCase() === "true" && Boolean(this.value("INTERNAL_SERVICE_TOKEN")) && Boolean(this.value("DBX_OWNER_EMAIL")) && Boolean(this.value("DBX_OWNER_PASSWORD"));
  }

  private headerValue(headers: Record<string, string | string[] | undefined>, key: string): string {
    const value = headers[key] || headers[key.toLowerCase()];
    return Array.isArray(value) ? String(value[0] || "").trim() : String(value || "").trim();
  }

  private value(key: string): string {
    return String(this.config.get<string>(key) || process.env[key] || "").trim();
  }

  private async findExistingAuthUser(email: string): Promise<AuthResult<boolean>> {
    try {
      const { data, error } = await this.supabase.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
      const users = Array.isArray(data.users) ? (data.users as Array<{ email?: string | null }>) : [];
      const exists = Boolean(users.find((user) => user.email?.toLowerCase() === email));
      return { ok: true, value: exists };
    } catch (error) {
      return { ok: false, error: mapSupabaseAuthError(error, "AUTH_TEMPORARILY_UNAVAILABLE") };
    }
  }

  private safeSessionContract(input: { apiAccessToken: string; supabaseSession?: Session }): Record<string, unknown> {
    return {
      accessToken: input.apiAccessToken,
      supabaseAccessToken: input.supabaseSession?.access_token,
      refreshToken: input.supabaseSession?.refresh_token,
      expiresAt: input.supabaseSession?.expires_at,
      tokenType: input.supabaseSession?.token_type || "Bearer",
    };
  }

  private hasEnv(key: string): boolean {
    return Boolean(this.value(key));
  }
}
