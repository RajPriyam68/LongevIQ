import type { Prisma } from '@prisma/client';
import { PrismaAuthRepository } from './modules/auth/auth.repository.js';
import { TokenService } from './modules/auth/token.service.js';
import { EmailService } from './modules/auth/email.service.js';
import { PasswordService } from './modules/auth/password.service.js';
import { GoogleOAuthService } from './modules/auth/oauth.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import type { AuthRepository } from './modules/auth/auth.repository.types.js';
import { PrismaMetricsRepository } from './modules/metrics/metrics.repository.js';
import { MetricsService } from './modules/metrics/metrics.service.js';
import type { AuditSink, MetricsRepository } from './modules/metrics/metrics.repository.types.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';

export interface Container {
  authRepository: AuthRepository;
  tokenService: TokenService;
  emailService: EmailService;
  passwordService: PasswordService;
  oauthService: GoogleOAuthService;
  authService: AuthService;
  metricsRepository: MetricsRepository;
  metricsService: MetricsService;
  dashboardService: DashboardService;
}

export function createContainer(overrides?: Partial<Container>): Container {
  const authRepository = overrides?.authRepository ?? new PrismaAuthRepository();
  const tokenService = overrides?.tokenService ?? new TokenService();
  const emailService = overrides?.emailService ?? new EmailService();
  const passwordService = overrides?.passwordService ?? new PasswordService();
  const oauthService = overrides?.oauthService ?? new GoogleOAuthService();
  const authService =
    overrides?.authService ??
    new AuthService(authRepository, tokenService, emailService, passwordService, oauthService);

  const metricsRepository = overrides?.metricsRepository ?? new PrismaMetricsRepository();

  const auditSink: AuditSink = {
    recordAudit: (input) =>
      authRepository.recordAudit({
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | null,
      }),
  };

  const metricsService =
    overrides?.metricsService ?? new MetricsService(metricsRepository, auditSink);
  const dashboardService = overrides?.dashboardService ?? new DashboardService(metricsRepository);

  return {
    authRepository,
    tokenService,
    emailService,
    passwordService,
    oauthService,
    authService,
    metricsRepository,
    metricsService,
    dashboardService,
  };
}
