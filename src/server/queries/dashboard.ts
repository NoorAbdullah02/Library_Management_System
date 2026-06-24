import "server-only";
import { and, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  activityLogs,
  books,
  borrowings,
  categories,
  fines,
  members,
} from "@/server/db/schema";

/** Headline KPI cards for the dashboard home. */
export async function getDashboardStats() {
  const now = new Date();

  const [
    [bookAgg],
    [memberAgg],
    [activeLoans],
    [overdue],
    [finesAgg],
  ] = await Promise.all([
    db
      .select({
        titles: count(),
        copies: sql<number>`coalesce(sum(${books.totalCopies}), 0)`,
        available: sql<number>`coalesce(sum(${books.availableCopies}), 0)`,
      })
      .from(books),
    db
      .select({ total: count() })
      .from(members)
      .where(eq(members.status, "active")),
    db
      .select({ total: count() })
      .from(borrowings)
      .where(eq(borrowings.status, "active")),
    db
      .select({ total: count() })
      .from(borrowings)
      .where(
        and(eq(borrowings.status, "active"), lt(borrowings.dueAt, now)),
      ),
    db
      .select({
        outstanding: sql<number>`coalesce(sum(${fines.amount} - ${fines.paidAmount}), 0)`,
        collected: sql<number>`coalesce(sum(${fines.paidAmount}), 0)`,
      })
      .from(fines),
  ]);

  return {
    titles: Number(bookAgg?.titles ?? 0),
    copies: Number(bookAgg?.copies ?? 0),
    available: Number(bookAgg?.available ?? 0),
    activeMembers: Number(memberAgg?.total ?? 0),
    activeLoans: Number(activeLoans?.total ?? 0),
    overdue: Number(overdue?.total ?? 0),
    finesOutstanding: Number(finesAgg?.outstanding ?? 0),
    finesCollected: Number(finesAgg?.collected ?? 0),
  };
}

/** Borrowing volume by month for the last `months` months. */
export async function getBorrowingTrends(months = 8) {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${borrowings.borrowedAt}), 'Mon')`,
      bucket: sql<string>`date_trunc('month', ${borrowings.borrowedAt})`,
      borrowed: count(),
      returned: sql<number>`count(*) filter (where ${borrowings.status} = 'returned')`,
    })
    .from(borrowings)
    .where(
      gte(
        borrowings.borrowedAt,
        sql`now() - (${months} || ' months')::interval`,
      ),
    )
    .groupBy(sql`date_trunc('month', ${borrowings.borrowedAt})`)
    .orderBy(sql`date_trunc('month', ${borrowings.borrowedAt})`);

  return rows.map((r) => ({
    month: r.month,
    borrowed: Number(r.borrowed),
    returned: Number(r.returned),
  }));
}

/** Top borrowed books. */
export async function getPopularBooks(limit = 5) {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      coverUrl: books.coverUrl,
      borrows: count(borrowings.id),
    })
    .from(books)
    .leftJoin(borrowings, eq(borrowings.bookId, books.id))
    .groupBy(books.id)
    .orderBy(desc(count(borrowings.id)))
    .limit(limit);

  return rows.map((r) => ({ ...r, borrows: Number(r.borrows) }));
}

/** Books per category for the distribution donut. */
export async function getCategoryDistribution() {
  const rows = await db
    .select({
      name: categories.name,
      color: categories.color,
      total: count(books.id),
    })
    .from(categories)
    .leftJoin(books, eq(books.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(desc(count(books.id)));

  return rows.map((r) => ({
    name: r.name,
    color: r.color ?? "#caa24a",
    total: Number(r.total),
  }));
}

/** New members per month — user-growth area chart. */
export async function getMemberGrowth(months = 8) {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${members.joinedAt}), 'Mon')`,
      total: count(),
    })
    .from(members)
    .where(
      gte(members.joinedAt, sql`now() - (${months} || ' months')::interval`),
    )
    .groupBy(sql`date_trunc('month', ${members.joinedAt})`)
    .orderBy(sql`date_trunc('month', ${members.joinedAt})`);

  let running = 0;
  return rows.map((r) => {
    running += Number(r.total);
    return { month: r.month, members: running, new: Number(r.total) };
  });
}

/** Latest activity-timeline entries for the live feed. */
export async function getRecentActivity(limit = 8) {
  return db.query.activityLogs.findMany({
    orderBy: desc(activityLogs.createdAt),
    limit,
    with: { user: { columns: { name: true, image: true } } },
  });
}

/** Active loans that are past due, for the overdue widget. */
export async function getOverdueLoans(limit = 5) {
  return db.query.borrowings.findMany({
    where: and(
      eq(borrowings.status, "active"),
      lt(borrowings.dueAt, new Date()),
      isNull(borrowings.returnedAt),
    ),
    orderBy: borrowings.dueAt,
    limit,
    with: {
      book: { columns: { title: true, coverUrl: true } },
      member: { with: { user: { columns: { name: true } } } },
    },
  });
}
