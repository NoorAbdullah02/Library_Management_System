import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { members, users, borrowings, fines } from "@/server/db/schema";
import type { MemberFilters } from "@/lib/validations/member";

export async function listMembers(filters: Partial<MemberFilters> = {}) {
  const { q, status = "all", page = 1, pageSize = 10 } = filters;

  // Join users for name/email search.
  const where = and(
    status !== "all" ? eq(members.status, status) : undefined,
  );

  const rows = await db.query.members.findMany({
    where,
    orderBy: desc(members.createdAt),
    limit: pageSize,
    offset: (page - 1) * pageSize,
    with: { user: { columns: { name: true, email: true, image: true, phone: true } } },
  });

  // In-memory search refine on the joined user (keeps the query simple & typed).
  const filtered = q
    ? rows.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(q.toLowerCase()) ||
          m.user?.email?.toLowerCase().includes(q.toLowerCase()) ||
          m.membershipNumber.toLowerCase().includes(q.toLowerCase()),
      )
    : rows;

  const [total] = await db.select({ value: count() }).from(members).where(where);

  return {
    items: filtered,
    total: Number(total?.value ?? 0),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total?.value ?? 0) / pageSize)),
  };
}

export type MemberListItem = Awaited<
  ReturnType<typeof listMembers>
>["items"][number];

export async function getMemberById(id: string) {
  const member = await db.query.members.findFirst({
    where: eq(members.id, id),
    with: {
      user: true,
      borrowings: {
        orderBy: desc(borrowings.borrowedAt),
        with: { book: { columns: { title: true, coverUrl: true } } },
      },
      fines: { orderBy: desc(fines.createdAt) },
      reservations: {
        with: { book: { columns: { title: true } } },
      },
    },
  });
  return member;
}

/** Member option list for issue/reservation selectors. */
export async function searchMemberOptions(q: string, limit = 10) {
  const rows = await db
    .select({
      id: members.id,
      membershipNumber: members.membershipNumber,
      status: members.status,
      name: users.name,
      email: users.email,
    })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(
      q
        ? or(
            ilike(users.name, `%${q}%`),
            ilike(users.email, `%${q}%`),
            ilike(members.membershipNumber, `%${q}%`),
          )
        : undefined,
    )
    .limit(limit);
  return rows;
}
