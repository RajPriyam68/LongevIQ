import { z } from 'zod';
import { KNOWLEDGE_CATEGORY_VALUES, KNOWLEDGE_STATUS_VALUES } from '../types/knowledge.js';

export const knowledgeCategorySchema = z.enum(KNOWLEDGE_CATEGORY_VALUES);
export const knowledgeStatusSchema = z.enum(KNOWLEDGE_STATUS_VALUES);

export const knowledgeSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required.')
  .max(120, 'Slug must be at most 120 characters.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, digits, and hyphens.',
  });

// The maximum raw content accepted for a single knowledge document. Bound at the
// shared validator level (configurable upper cap lives in the API env schema).
export const KNOWLEDGE_MAX_DOCUMENT_CHARS = 1_000_000;

export const createKnowledgeDocumentSchema = z
  .object({
    slug: knowledgeSlugSchema,
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(150, 'Title must be at most 150 characters.'),
    summary: z.string().trim().max(400, 'Summary must be at most 400 characters.').optional(),
    category: knowledgeCategorySchema.default('WELLNESS'),
    source: z.string().trim().max(100, 'Source must be at most 100 characters.').optional(),
    status: knowledgeStatusSchema.default('DRAFT'),
    language: z.string().trim().max(20).default('english'),
    content: z
      .string()
      .trim()
      .min(1, 'Content is required.')
      .max(KNOWLEDGE_MAX_DOCUMENT_CHARS, 'Content is too large.'),
  })
  .strict();

export const updateKnowledgeDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(150, 'Title must be at most 150 characters.')
      .optional(),
    summary: z
      .string()
      .trim()
      .max(400, 'Summary must be at most 400 characters.')
      .nullish()
      .optional(),
    category: knowledgeCategorySchema.optional(),
    source: z
      .string()
      .trim()
      .max(100, 'Source must be at most 100 characters.')
      .nullish()
      .optional(),
    status: knowledgeStatusSchema.optional(),
    content: z
      .string()
      .trim()
      .min(1, 'Content is required.')
      .max(KNOWLEDGE_MAX_DOCUMENT_CHARS, 'Content is too large.')
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided.',
      });
    }
  });

export const searchKnowledgeQuerySchema = z.object({
  q: z.string().trim().min(1, 'q is required.').max(200, 'q must be at most 200 characters.'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: knowledgeCategorySchema.optional(),
});

export const listKnowledgeDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: knowledgeCategorySchema.optional(),
  status: knowledgeStatusSchema.optional(),
});

export type CreateKnowledgeDocumentInput = z.infer<typeof createKnowledgeDocumentSchema>;
export type UpdateKnowledgeDocumentInput = z.infer<typeof updateKnowledgeDocumentSchema>;
export type SearchKnowledgeQuery = z.infer<typeof searchKnowledgeQuerySchema>;
export type ListKnowledgeDocumentsQuery = z.infer<typeof listKnowledgeDocumentsQuerySchema>;
