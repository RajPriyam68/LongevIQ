import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address.')
  .max(254, 'Email address is too long.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be at most 128 characters long.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/\d/, 'Password must contain at least one number.');

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(100, 'Name must be at most 100 characters long.');

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required.').max(128),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required.'),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const googleExchangeSchema = z
  .object({
    code: z.string().min(1, 'Authorization code is required.'),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    avatarUrl: z.string().url('Avatar URL must be a valid URL.').nullish(),
  })
  .strict()
  .refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
    message: 'At least one field must be provided.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.').max(128),
    newPassword: passwordSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type GoogleExchangeInput = z.infer<typeof googleExchangeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
