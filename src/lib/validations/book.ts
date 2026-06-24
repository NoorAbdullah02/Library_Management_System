import { z } from "zod";
import { isValidISBN } from "@/lib/codes";

export const bookSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  subtitle: z.string().max(300).optional().or(z.literal("")),
  isbn: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidISBN(v), "Invalid ISBN-10 or ISBN-13"),
  description: z.string().max(4000).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  publisherId: z.string().uuid().optional().or(z.literal("")),
  authorIds: z.array(z.string().uuid()).default([]),
  coverUrl: z.string().url().optional().or(z.literal("")),
  language: z.string().min(2).max(20).default("en"),
  pageCount: z.coerce.number().int().positive().max(20000).optional(),
  publishedYear: z.coerce
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 1)
    .optional(),
  edition: z.string().max(60).optional().or(z.literal("")),
  totalCopies: z.coerce.number().int().min(0).max(10000).default(1),
  tags: z.array(z.string()).default([]),
});

export const updateBookSchema = bookSchema.partial().extend({
  id: z.string().uuid(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Use a hex color").optional(),
});

export const authorSchema = z.object({
  name: z.string().min(1).max(160),
  bio: z.string().max(2000).optional().or(z.literal("")),
  nationality: z.string().max(80).optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export const publisherSchema = z.object({
  name: z.string().min(1).max(160),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(400).optional().or(z.literal("")),
});

export const bookFiltersSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  availability: z.enum(["all", "available", "unavailable"]).default("all"),
  sort: z
    .enum(["title", "newest", "rating", "popular"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export type BookInput = z.infer<typeof bookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type AuthorInput = z.infer<typeof authorSchema>;
export type PublisherInput = z.infer<typeof publisherSchema>;
export type BookFilters = z.infer<typeof bookFiltersSchema>;
