import { PrismaAuthRepository } from './modules/auth/auth.repository.js';
import { TokenService } from './modules/auth/token.service.js';
import { EmailService } from './modules/auth/email.service.js';
import { PasswordService } from './modules/auth/password.service.js';
import { GoogleOAuthService } from './modules/auth/oauth.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import type { AuthRepository } from './modules/auth/auth.repository.types.js';

export interface Container {
  authRepository: AuthRepository;
  tokenService: TokenService;
  emailService: EmailService;
  passwordService: PasswordService;
  oauthService: GoogleOAuthService;
  authService: AuthService;
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

  return {
    authRepository,
    tokenService,
    emailService,
    passwordService,
    oauthService,
    authService,
  };
}
