import "server-only";
import { and, count, desc, eq, lt } from "drizzle-orm";

import { db } from "@/server/db";
import { borrowings, reservations, fines } from "@/server/db/schema";
import type { BorrowingStatus } from "@/server/db/schema";

export async function listBorrowings(opts: {
  status?: BorrowingStatus | "all";
  page?: number;
  pageSize?: number;
} = {}) {
  const { status = "all", page = 1, pageSize = 10 } = opts;
  const where =
    status !== "all" ? eq(borrowings.status, status) : undefined;

  const [items, [total]] = await Promise.all([
    db.query.borrowings.findMany({
      where,
      orderBy: desc(borrowings.borrowedAt),
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: {
        book: { columns: { title: true, coverUrl: true } },
        copy: { columns: { barcode: true } },
        member: { with: { user: { columns: { name: true, email: true } } } },
      },
    }),
    db.select({ value: count() }).from(borrowings).where(where),
  ]);

  return {
    items,
    total: Number(total?.value ?? 0),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total?.value ?? 0) / pageSize)),
  };
}

export type BorrowingListItem = Awaited<
  ReturnType<typeof listBorrowings>
>["items"][number];

export async function listReservations(status: string = "all") {
  return db.query.reservations.findMany({
    where:
      status !== "all"
        ? eq(reservations.status, status as never)
        : undefined,
    orderBy: [reservations.queuePosition, desc(reservations.reservedAt)],
    with: {
      book: { columns: { title: true, coverUrl: true } },
      member: { with: { user: { columns: { name: true, email: true } } } },
    },
  });
}

export async function listFines(status: string = "all") {
  return db.query.fines.findMany({
    where:
      status !== "all" ? eq(fines.status, status as never) : undefined,
    orderBy: desc(fines.createdAt),
    with: {
      member: { with: { user: { columns: { name: true, email: true } } } },
      borrowing: { with: { book: { columns: { title: true } } } },
    },
  });
}

/** Refresh overdue flags — used by the cron/reminder route. */
export async function markOverdue() {
  const updated = await db
    .update(borrowings)
    .set({ status: "overdue" })
    .where(and(eq(borrowings.status, "active"), lt(borrowings.dueAt, new Date())))
    .returning({ id: borrowings.id });
  return updated.length;
}
