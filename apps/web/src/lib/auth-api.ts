import type {
  ChangePasswordInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  ResendVerificationInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from '@longeviq/shared';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface AuthSessionData {
  accessToken: string;
  user: PublicUser;
}

export interface RegisterResult {
  user: PublicUser;
  verificationUrl?: string;
}

export interface ResendVerificationResult {
  sent: boolean;
  verificationUrl?: string;
}

export interface AuthConfig {
  providers: Array<{ provider: string; enabled: boolean; clientId?: string }>;
  verificationRequired: boolean;
}

export function apiLogin(input: LoginInput): Promise<AuthSessionData> {
  return apiPost<AuthSessionData>('/auth/login', input);
}

export function apiRegister(input: RegisterInput): Promise<RegisterResult> {
  return apiPost<RegisterResult>('/auth/register', input);
}

export function apiVerifyEmail(input: VerifyEmailInput): Promise<{ verified: boolean }> {
  return apiPost<{ verified: boolean }>('/auth/verify-email', input);
}

export function apiResendVerification(
  input: ResendVerificationInput,
): Promise<ResendVerificationResult> {
  return apiPost<ResendVerificationResult>('/auth/resend-verification', input);
}

export function apiLogout(): Promise<{ loggedOut: boolean }> {
  return apiPost<{ loggedOut: boolean }>('/auth/logout');
}

export function apiRefresh(): Promise<AuthSessionData> {
  return apiPost<AuthSessionData>('/auth/refresh');
}

export function apiGetAuthConfig(): Promise<AuthConfig> {
  return apiGet<AuthConfig>('/auth/config');
}

export function apiGetGoogleLoginUrl(): Promise<{ url: string }> {
  return apiGet<{ url: string }>('/auth/google/login');
}

export function apiGetMe(): Promise<{ user: PublicUser }> {
  return apiGet<{ user: PublicUser }>('/users/me');
}

export function apiUpdateProfile(input: UpdateProfileInput): Promise<{ user: PublicUser }> {
  return apiPatch<{ user: PublicUser }>('/users/me', input);
}

export function apiChangePassword(input: ChangePasswordInput): Promise<{ changed: boolean }> {
  return apiPost<{ changed: boolean }>('/users/me/password', input);
}
