import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from '@prisma/client';
import { env } from '../../config/env.js';

export const REFRESH_COOKIE_NAME = 'lq_refresh';

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export class TokenService {
  async generateAccessToken(user: Pick<User, 'id' | 'role'>): Promise<string> {
    return new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(env.JWT_ACCESS_TTL)
      .sign(accessSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, accessSecret, { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.role !== 'string') {
      throw new Error('Invalid access token payload');
    }
    return { sub: payload.sub, role: payload.role };
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshTokenExpiry(): Date {
    return new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  verificationTokenExpiry(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    };
  }

  buildVerificationUrl(baseUrl: string, token: string): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return `${normalized}/auth/verify-email?token=${encodeURIComponent(token)}`;
  }
}
