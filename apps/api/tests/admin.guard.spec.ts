import { describe, expect, it } from 'vitest';
import {
  listAdminUsersQuerySchema,
  listAuditLogsQuerySchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  loginSchema,
} from '@longeviq/shared';

describe('Admin role escalation guardrails', () => {
  it('registerSchema rejects a client-supplied role field', () => {
    const result = registerSchema.safeParse({
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('updateProfileSchema rejects a client-supplied role field', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Changed',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('loginSchema rejects a client-supplied role field', () => {
    const result = loginSchema.safeParse({
      email: 'new@example.com',
      password: 'Password123!',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('changePasswordSchema rejects a client-supplied role field', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'CurrentPass1!',
      newPassword: 'NewPassword1!',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });
});

describe('listAdminUsersQuerySchema', () => {
  it('accepts a valid query', () => {
    const result = listAdminUsersQuerySchema.safeParse({
      search: 'alice',
      role: 'DOCTOR',
      active: 'true',
      page: '2',
      limit: '50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('applies default pagination when omitted', () => {
    const result = listAdminUsersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects an invalid role value', () => {
    const result = listAdminUsersQuerySchema.safeParse({ role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid active value', () => {
    const result = listAdminUsersQuerySchema.safeParse({ active: 'yes' });
    expect(result.success).toBe(false);
  });

  it('clamps limit to 100', () => {
    const result = listAdminUsersQuerySchema.safeParse({ limit: '500' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = listAdminUsersQuerySchema.safeParse({ sortBy: 'createdAt' });
    expect(result.success).toBe(false);
  });
});

describe('listAuditLogsQuerySchema', () => {
  it('accepts a valid query', () => {
    const result = listAuditLogsQuerySchema.safeParse({
      action: 'AUTH.LOGIN',
      entity: 'User',
      userId: 'usr_1',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-19T00:00:00.000Z',
      page: '1',
      limit: '10',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid datetime', () => {
    const result = listAuditLogsQuerySchema.safeParse({ from: 'yesterday' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = listAuditLogsQuerySchema.safeParse({ order: 'asc' });
    expect(result.success).toBe(false);
  });
});
