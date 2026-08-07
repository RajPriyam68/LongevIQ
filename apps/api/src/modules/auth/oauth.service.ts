import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GoogleUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export interface GoogleOAuthConfig {
  enabled: boolean;
  clientId: string | null;
}

export class GoogleOAuthService {
  get enabled(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }

  config(): GoogleOAuthConfig {
    return { enabled: this.enabled, clientId: env.GOOGLE_CLIENT_ID ?? null };
  }

  buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
      access_type: 'online',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  generateState(): string {
    return randomBytes(24).toString('base64url');
  }

  hashState(state: string): string {
    return createHash('sha256').update(`lq-oauth-${state}`).digest('hex');
  }

  verifyState(state: string, expectedHash: string): boolean {
    const candidate = this.hashState(state);
    const a = Buffer.from(candidate);
    const b = Buffer.from(expectedHash);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async exchangeCode(code: string, redirectUri: string): Promise<GoogleUserInfo> {
    if (!this.enabled) {
      throw new Error('Google OAuth is not configured');
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID ?? '',
        client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      logger.warn({ status: tokenResponse.status, body }, 'Google token exchange failed');
      throw new Error('Google authentication failed. Please try again.');
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error('Google authentication failed: missing access token');
    }

    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!userResponse.ok) {
      logger.warn({ status: userResponse.status }, 'Google userinfo request failed');
      throw new Error('Google authentication failed. Please try again.');
    }

    const profile = (await userResponse.json()) as {
      id?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!profile.id || !profile.email) {
      throw new Error('Google authentication failed: incomplete profile');
    }

    return {
      id: profile.id,
      email: profile.email.toLowerCase(),
      firstName: profile.given_name ?? 'Google',
      lastName: profile.family_name ?? 'User',
      avatarUrl: profile.picture ?? null,
      emailVerified: Boolean(profile.verified_email),
    };
  }
}
