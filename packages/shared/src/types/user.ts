import type { UserRole } from './enums.js';

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: PublicUser;
}
