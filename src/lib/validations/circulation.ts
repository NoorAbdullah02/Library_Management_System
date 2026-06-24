import { z } from "zod";

export const issueBookSchema = z.object({
  // Issue by member + book; the system picks an available copy (or a given one).
  memberId: z.string().uuid("Select a member"),
  bookId: z.string().uuid("Select a book"),
  copyId: z.string().uuid().optional(),
  dueAt: z.coerce.date().optional(), // defaults to policy loan period
});

export const returnBookSchema = z.object({
  borrowingId: z.string().uuid(),
  condition: z.enum(["good", "damaged", "lost"]).default("good"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const renewBookSchema = z.object({
  borrowingId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(60).optional(),
});

export const reservationSchema = z.object({
  bookId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const fineSchema = z.object({
  memberId: z.string().uuid(),
  borrowingId: z.string().uuid().optional(),
  amount: z.coerce.number().min(0).max(100000),
  reason: z.enum(["overdue", "damaged", "lost", "other"]).default("overdue"),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const payFineSchema = z.object({
  fineId: z.string().uuid(),
  amount: z.coerce.number().min(0),
});

export const waiveFineSchema = z.object({
  fineId: z.string().uuid(),
  reason: z.string().max(500).optional().or(z.literal("")),
});

export type IssueBookInput = z.infer<typeof issueBookSchema>;
export type ReturnBookInput = z.infer<typeof returnBookSchema>;
export type RenewBookInput = z.infer<typeof renewBookSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type FineInput = z.infer<typeof fineSchema>;
export type PayFineInput = z.infer<typeof payFineSchema>;
