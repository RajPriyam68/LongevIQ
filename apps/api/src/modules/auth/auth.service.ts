import type { User } from '@prisma/client';
import type {
  PublicUser,
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import { env } from '../../config/env.js';
import type { AuthRepository } from './auth.repository.types.js';
import type { TokenService } from './token.service.js';
import type { EmailService } from './email.service.js';
import type { PasswordService } from './password.service.js';
import type { GoogleOAuthService } from './oauth.service.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  baseUrl?: string;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

const AUTH_ACTION = {
  REGISTER: 'AUTH.REGISTER',
  LOGIN: 'AUTH.LOGIN',
  LOGOUT: 'AUTH.LOGOUT',
  REFRESH: 'AUTH.REFRESH',
  REFRESH_REUSE: 'AUTH.REFRESH_REUSE_DETECTED',
  VERIFY_EMAIL: 'AUTH.VERIFY_EMAIL',
  RESEND_VERIFICATION: 'AUTH.RESEND_VERIFICATION',
  GOOGLE_LOGIN: 'AUTH.GOOGLE_LOGIN',
  PROFILE_UPDATE: 'USER.PROFILE_UPDATE',
  PASSWORD_CHANGE: 'USER.PASSWORD_CHANGE',
} as const;

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
    private readonly emails: EmailService,
    private readonly passwords: PasswordService,
    private readonly oauth: GoogleOAuthService,
  ) {}

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async register(
    input: RegisterInput,
    ctx: RequestContext,
  ): Promise<{ user: PublicUser; verificationUrl?: string }> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists.');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.repository.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const verificationUrl = await this.sendVerificationEmail(user, ctx);

    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.REGISTER,
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const result: { user: PublicUser; verificationUrl?: string } = {
      user: this.toPublicUser(user),
    };
    if (env.NODE_ENV !== 'production') {
      result.verificationUrl = verificationUrl;
    }
    return result;
  }

  async login(input: LoginInput, ctx: RequestContext): Promise<AuthSessionResult> {
    const user = await this.repository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const passwordValid = await this.passwords.verify(user.passwordHash, input.password);
    if (!passwordValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    this.assertActive(user);

    await this.repository.updateUser(user.id, { lastLoginAt: new Date() });
    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.createSession(user, ctx);
  }

  async refresh(rawRefreshToken: string, ctx: RequestContext): Promise<AuthSessionResult> {
    const tokenHash = this.tokens.hashToken(rawRefreshToken);
    const stored = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!stored) {
      throw AppError.unauthorized('Invalid refresh token.');
    }

    if (stored.revokedAt) {
      // A previously-rotated token was presented again: possible token theft.
      await this.repository.revokeAllRefreshTokens(stored.userId);
      await this.repository.recordAudit({
        userId: stored.userId,
        action: AUTH_ACTION.REFRESH_REUSE,
        entity: 'RefreshToken',
        entityId: stored.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { detected: 'reused_refresh_token' },
      });
      throw AppError.unauthorized('Session has been revoked. Please log in again.');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      await this.repository.revokeRefreshToken(stored.id);
      throw AppError.unauthorized('Session expired. Please log in again.');
    }

    const user = await this.repository.findById(stored.userId);
    if (!user) {
      throw AppError.unauthorized('Invalid refresh token.');
    }
    this.assertActive(user);

    // Rotate: issue a fresh token and revoke the presented one.
    const newRefreshToken = this.tokens.generateRefreshToken();
    const newStored = await this.repository.createRefreshToken({
      tokenHash: this.tokens.hashToken(newRefreshToken),
      userId: user.id,
      expiresAt: this.tokens.refreshTokenExpiry(),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    await this.repository.revokeRefreshToken(stored.id);
    await this.repository.updateUser(user.id, { lastLoginAt: new Date() });

    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.REFRESH,
      entity: 'RefreshToken',
      entityId: newStored.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken: await this.tokens.generateAccessToken(user),
      refreshToken: newRefreshToken,
      user: this.toPublicUser(user),
    };
  }

  async logout(rawRefreshToken: string, userId?: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = this.tokens.hashToken(rawRefreshToken);
    const stored = await this.repository.findRefreshTokenByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await this.repository.revokeRefreshToken(stored.id);
    }
    if (userId) {
      await this.repository.recordAudit({
        userId,
        action: AUTH_ACTION.LOGOUT,
        entity: 'User',
        entityId: userId,
      });
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.tokens.hashToken(token);
    const stored = await this.repository.findVerificationTokenByHash(tokenHash);

    if (!stored) {
      throw AppError.badRequest('Verification link is invalid.');
    }
    if (stored.consumedAt) {
      throw AppError.badRequest('Verification link has already been used.');
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw AppError.badRequest('Verification link has expired. Please request a new one.');
    }

    const user = await this.repository.findById(stored.userId);
    if (!user) {
      throw AppError.badRequest('Verification link is invalid.');
    }

    await this.repository.updateUser(user.id, { emailVerified: true });
    await this.repository.consumeVerificationToken(stored.id);
    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.VERIFY_EMAIL,
      entity: 'User',
      entityId: user.id,
    });
  }

  async resendVerification(
    email: string,
    ctx: RequestContext,
  ): Promise<{ verificationUrl?: string }> {
    const user = await this.repository.findByEmail(email);
    if (!user || user.emailVerified || user.oauthProvider) {
      return {};
    }
    const verificationUrl = await this.sendVerificationEmail(user, ctx);
    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.RESEND_VERIFICATION,
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return env.NODE_ENV !== 'production' ? { verificationUrl } : {};
  }

  async googleAuthorizeUrl(redirectUri: string): Promise<{ url: string; state: string }> {
    if (!this.oauth.enabled) {
      throw new AppError(503, 'INTERNAL_ERROR', 'Google authentication is not configured.');
    }
    const state = this.oauth.generateState();
    return { url: this.oauth.buildAuthUrl(redirectUri, state), state };
  }

  async googleExchange(
    code: string,
    redirectUri: string,
    state: string,
    expectedStateHash: string,
    ctx: RequestContext,
  ): Promise<AuthSessionResult> {
    if (!this.oauth.verifyState(state, expectedStateHash)) {
      throw AppError.badRequest('Google authentication state validation failed.');
    }

    const profile = await this.oauth.exchangeCode(code, redirectUri);

    let user = await this.repository.findByEmail(profile.email);
    if (user) {
      this.assertActive(user);
      if (!user.oauthProvider && !user.emailVerified && profile.emailVerified) {
        user = await this.repository.updateUser(user.id, { emailVerified: true });
      }
    } else {
      user = await this.repository.createUser({
        email: profile.email,
        passwordHash: null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        emailVerified: profile.emailVerified,
        oauthProvider: 'google',
        oauthId: profile.id,
        avatarUrl: profile.avatarUrl,
      });
    }

    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.GOOGLE_LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.createSession(user, ctx);
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    return this.toPublicUser(user);
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.repository.updateUser(id, {
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
    });
    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.PROFILE_UPDATE,
      entity: 'User',
      entityId: user.id,
    });
    return this.toPublicUser(user);
  }

  async changePassword(id: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user || !user.passwordHash) {
      throw AppError.forbidden(
        'This account uses social login and does not have a password. Sign in with your provider.',
      );
    }

    const valid = await this.passwords.verify(user.passwordHash, input.currentPassword);
    if (!valid) {
      throw AppError.badRequest('Current password is incorrect.');
    }

    const newHash = await this.passwords.hash(input.newPassword);
    await this.repository.updateUser(user.id, { passwordHash: newHash });
    await this.repository.revokeAllRefreshTokens(user.id);
    await this.repository.recordAudit({
      userId: user.id,
      action: AUTH_ACTION.PASSWORD_CHANGE,
      entity: 'User',
      entityId: user.id,
    });
  }

  private async sendVerificationEmail(user: User, ctx: RequestContext): Promise<string> {
    const token = this.tokens.generateRefreshToken();
    await this.repository.createVerificationToken({
      tokenHash: this.tokens.hashToken(token),
      userId: user.id,
      expiresAt: this.tokens.verificationTokenExpiry(),
    });

    const baseUrl = ctx.baseUrl || env.FRONTEND_URL;
    const verificationUrl = this.tokens.buildVerificationUrl(baseUrl, token);
    await this.emails.sendVerificationEmail(user.email, verificationUrl);
    return verificationUrl;
  }

  private assertActive(user: User): void {
    if (!user.isActive) {
      throw new AppError(403, 'FORBIDDEN', 'This account has been deactivated.');
    }
    if (!user.emailVerified && !user.oauthProvider) {
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address first.');
    }
  }

  private async createSession(user: User, ctx: RequestContext): Promise<AuthSessionResult> {
    const refreshToken = this.tokens.generateRefreshToken();
    await this.repository.createRefreshToken({
      tokenHash: this.tokens.hashToken(refreshToken),
      userId: user.id,
      expiresAt: this.tokens.refreshTokenExpiry(),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken: await this.tokens.generateAccessToken(user),
      refreshToken,
      user: this.toPublicUser(user),
    };
  }
}
