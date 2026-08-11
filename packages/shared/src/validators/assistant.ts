import { z } from 'zod';

// Maximum length of a single user chat message. Bound at the shared validator
// level so the web layer can reuse the same constant.
export const ASSISTANT_MAX_MESSAGE_CHARS = 4000;

export const createChatMessageSchema = z
  .object({
    sessionId: z
      .string()
      .trim()
      .min(1, 'Session id must not be empty.')
      .max(100, 'Session id must be at most 100 characters.')
      .nullish(),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required.')
      .max(ASSISTANT_MAX_MESSAGE_CHARS, 'Message is too long.'),
  })
  .strict();

export const listChatSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageSchema>;
export type ListChatSessionsQuery = z.infer<typeof listChatSessionsQuerySchema>;
