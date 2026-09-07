import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { TokenService } from '../src/modules/auth/token.service.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { GoogleOAuthService } from '../src/modules/auth/oauth.service.js';
import { AppError } from '../src/utils/app-error.js';
import { FakeAuthRepository, FakeEmailService } from './fakes.js';

const ctx = { ipAddress: '127.0.0.1', userAgent: 'vitest', baseUrl: 'http://localhost:3000' };

class FailingEmailService extends FakeEmailService {
  override sendVerificationEmail(): Promise<void> {
    return Promise.reject(new Error('SMTP rejected the message'));
  }
}

describe('AuthService', () => {
  let repository: FakeAuthRepository;
  let emails: FakeEmailService;
  let service: AuthService;

  beforeEach(() => {
    repository = new FakeAuthRepository();
    emails = new FakeEmailService();
    service = new AuthService(
      repository,
      new TokenService(),
      emails as unknown as FakeEmailService,
      new PasswordService(),
      new GoogleOAuthService(),
    );
  });

  describe('register', () => {
    it('creates a user with a hashed password and sends verification email', async () => {
      const result = await service.register(
        {
          email: 'alice@example.com',
          password: 'Str0ngPass!',
          firstName: 'Alice',
          lastName: 'Kim',
        },
        ctx,
      );

      expect(result.user.email).toBe('alice@example.com');
      expect(result.user.passwordHash).toBeUndefined();

      const stored = await repository.findByEmail('alice@example.com');
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe('Str0ngPass!');
      expect(stored!.emailVerified).toBe(false);

      expect(emails.sent).toHaveLength(1);
      expect(result.verificationUrl).toContain('/auth/verify-email?token=');
      expect(emails.lastVerificationUrl).toBe(result.verificationUrl);
    });

    it('rejects duplicate emails', async () => {
      await service.register(
        { email: 'dup@example.com', password: 'Str0ngPass!', firstName: 'A', lastName: 'B' },
        ctx,
      );

      await expect(
        service.register(
          { email: 'dup@example.com', password: 'Str0ngPass!', firstName: 'A', lastName: 'B' },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    });

    it('surfaces a clear error when the verification email cannot be delivered', async () => {
      const svc = new AuthService(
        repository,
        new TokenService(),
        new FailingEmailService(),
        new PasswordService(),
        new GoogleOAuthService(),
      );

      await expect(
        svc.register(
          { email: 'fail@example.com', password: 'Str0ngPass!', firstName: 'F', lastName: 'X' },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 503, code: 'EMAIL_DELIVERY_FAILED' });
    });
  });

  describe('login', () => {
    it('returns a session for valid credentials', async () => {
      await service.register(
        { email: 'bob@example.com', password: 'Str0ngPass!', firstName: 'Bob', lastName: 'Lee' },
        ctx,
      );
      const token = emails.lastVerificationUrl!.split('token=')[1]!;
      await service.verifyEmail(token);

      const session = await service.login(
        { email: 'bob@example.com', password: 'Str0ngPass!' },
        ctx,
      );

      expect(session.accessToken).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
      expect(session.user.email).toBe('bob@example.com');
      expect(emails.lastVerificationUrl).toBeTruthy();
    });

    it('rejects wrong passwords without revealing account existence', async () => {
      await expect(
        service.login({ email: 'ghost@example.com', password: 'WrongPass1!' }, ctx),
      ).rejects.toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    });

    it('blocks unverified users', async () => {
      await service.register(
        { email: 'cara@example.com', password: 'Str0ngPass!', firstName: 'Cara', lastName: 'N' },
        ctx,
      );

      await expect(
        service.login({ email: 'cara@example.com', password: 'Str0ngPass!' }, ctx),
      ).rejects.toMatchObject({ statusCode: 403, code: 'EMAIL_NOT_VERIFIED' });
    });
  });

  describe('refresh rotation', () => {
    it('rotates the refresh token on refresh', async () => {
      await service.register(
        { email: 'dave@example.com', password: 'Str0ngPass!', firstName: 'Dave', lastName: 'P' },
        ctx,
      );
      await service.verifyEmail(emails.lastVerificationUrl!.split('token=')[1]!);

      const first = await service.login(
        { email: 'dave@example.com', password: 'Str0ngPass!' },
        ctx,
      );
      const refreshed = await service.refresh(first.refreshToken, ctx);

      expect(refreshed.accessToken).toBeTruthy();
      expect(refreshed.refreshToken).not.toBe(first.refreshToken);

      const oldRecord = await repository.findRefreshTokenByHash(
        new TokenService().hashToken(first.refreshToken),
      );
      expect(oldRecord!.revokedAt).not.toBeNull();
    });

    it('detects reuse and revokes the whole token family', async () => {
      await service.register(
        { email: 'eve@example.com', password: 'Str0ngPass!', firstName: 'Eve', lastName: 'Q' },
        ctx,
      );
      await service.verifyEmail(emails.lastVerificationUrl!.split('token=')[1]!);
      const first = await service.login({ email: 'eve@example.com', password: 'Str0ngPass!' }, ctx);

      await service.refresh(first.refreshToken, ctx);

      await expect(service.refresh(first.refreshToken, ctx)).rejects.toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      const family = [...repository.refreshTokens.values()].filter(
        (token) => token.userId === first.user.id,
      );
      expect(family.every((token) => token.revokedAt !== null)).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('rejects an expired token', async () => {
      await service.register(
        { email: 'fay@example.com', password: 'Str0ngPass!', firstName: 'Fay', lastName: 'R' },
        ctx,
      );
      const record = [...repository.verificationTokens.values()][0]!;
      record.expiresAt = new Date(Date.now() - 1000);

      await expect(service.verifyEmail('some-token')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('marks email as verified once', async () => {
      await service.register(
        { email: 'guy@example.com', password: 'Str0ngPass!', firstName: 'Guy', lastName: 'S' },
        ctx,
      );
      const rawToken = emails.lastVerificationUrl!.split('token=')[1]!;

      await service.verifyEmail(rawToken);
      const user = await repository.findByEmail('guy@example.com');
      expect(user!.emailVerified).toBe(true);

      await expect(service.verifyEmail(rawToken)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      await service.register(
        { email: 'hal@example.com', password: 'Str0ngPass!', firstName: 'Hal', lastName: 'T' },
        ctx,
      );
      await service.verifyEmail(emails.lastVerificationUrl!.split('token=')[1]!);
      const user = await repository.findByEmail('hal@example.com');

      await expect(
        service.changePassword(user!.id, {
          currentPassword: 'WrongPass1!',
          newPassword: 'NewStr0ngPass!',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('updates the password and revokes all sessions', async () => {
      await service.register(
        { email: 'ida@example.com', password: 'Str0ngPass!', firstName: 'Ida', lastName: 'U' },
        ctx,
      );
      await service.verifyEmail(emails.lastVerificationUrl!.split('token=')[1]!);
      const user = await repository.findByEmail('ida@example.com');
      await service.login({ email: 'ida@example.com', password: 'Str0ngPass!' }, ctx);

      await service.changePassword(user!.id, {
        currentPassword: 'Str0ngPass!',
        newPassword: 'NewStr0ngPass!',
      });

      expect([...repository.refreshTokens.values()].every((t) => t.revokedAt !== null)).toBe(true);
      await expect(
        service.login({ email: 'ida@example.com', password: 'Str0ngPass!' }, ctx),
      ).rejects.toBeInstanceOf(AppError);
      await expect(
        service.login({ email: 'ida@example.com', password: 'NewStr0ngPass!' }, ctx),
      ).resolves.toBeTruthy();
    });
  });
});
