import type { Request, Response } from 'express';
import type { AuthService } from './auth.service.js';
import type { GoogleOAuthService } from './oauth.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { REFRESH_COOKIE_NAME, type TokenService } from './token.service.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    baseUrl: getClientOrigin(req),
  };
}

function getClientOrigin(req: Request): string {
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost ?? req.get('host');
  if (!host) return env.FRONTEND_URL;
  const proto = req.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: GoogleOAuthService,
    private readonly tokenService: TokenService,
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const result = await this.authService.register(req.body, requestContext(req));
    sendSuccess(res, result, 201);
  }

  async login(req: Request, res: Response): Promise<void> {
    const session = await this.authService.login(req.body, requestContext(req));
    this.setRefreshCookie(res, session.refreshToken);
    sendSuccess(res, { accessToken: session.accessToken, user: session.user });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = this.readRefreshCookie(req);
    const session = await this.authService.refresh(rawRefreshToken, requestContext(req));
    this.setRefreshCookie(res, session.refreshToken);
    sendSuccess(res, { accessToken: session.accessToken, user: session.user });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = this.readRefreshCookie(req);
    await this.authService.logout(rawRefreshToken, req.user?.id);
    this.clearRefreshCookie(res);
    sendSuccess(res, { loggedOut: true });
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    await this.authService.verifyEmail(req.body.token);
    sendSuccess(res, { verified: true });
  }

  async resendVerification(req: Request, res: Response): Promise<void> {
    const result = await this.authService.resendVerification(req.body.email, requestContext(req));
    sendSuccess(res, { sent: true, ...result });
  }

  async authConfig(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      providers: this.oauthService.config(),
      verificationRequired: true,
    });
  }

  async googleLogin(req: Request, res: Response): Promise<void> {
    const clientOrigin = getClientOrigin(req);
    const redirectUri = new URL('/api/v1/auth/google/callback', clientOrigin).toString();
    const { url, state } = await this.authService.googleAuthorizeUrl(redirectUri);
    const stateHash = this.oauthService.hashState(state);
    res.cookie('lq_oauth_state', stateHash, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });
    sendSuccess(res, { url });
  }

  async googleCallback(req: Request, res: Response): Promise<void> {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const stateHash = req.cookies?.lq_oauth_state;
    res.clearCookie('lq_oauth_state', { path: '/' });

    const clientOrigin = getClientOrigin(req);
    const redirectUri = new URL('/api/v1/auth/google/callback', clientOrigin).toString();
    const session = await this.authService.googleExchange(
      code,
      redirectUri,
      state,
      stateHash ?? '',
      requestContext(req),
    );

    this.setRefreshCookie(res, session.refreshToken);
    res.redirect(`${clientOrigin}/auth/callback`);
  }

  private readRefreshCookie(req: Request): string {
    const value = req.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof value !== 'string' || value.length === 0) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is missing.');
    }
    return value;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, this.tokenService.getRefreshCookieOptions());
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  }
}
