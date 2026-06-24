import { z } from "zod";

export const memberSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  email: z.string().email("Enter a valid email"),
  phone: z.string().max(30).optional().or(z.literal("")),
  membershipType: z.enum(["public", "student", "faculty", "staff"]).default("public"),
  address: z.string().max(400).optional().or(z.literal("")),
  maxBorrowLimit: z.coerce.number().int().min(1).max(50).default(5),
  // Optional initial password; if omitted a random one is generated + emailed.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  expiresAt: z.coerce.date().optional(),
});

export const updateMemberSchema = memberSchema
  .omit({ password: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: z.enum(["active", "suspended", "expired", "pending"]).optional(),
  });

export const memberFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["all", "active", "suspended", "expired", "pending"]).default("all"),
  membershipType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type MemberInput = z.infer<typeof memberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberFilters = z.infer<typeof memberFiltersSchema>;
