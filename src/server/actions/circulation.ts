"use server";

import { revalidatePath } from "next/cache";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  books,
  bookCopies,
  borrowings,
  fines,
  members,
  reservations,
  returns,
} from "@/server/db/schema";
import {
  issueBookSchema,
  returnBookSchema,
  renewBookSchema,
  reservationSchema,
} from "@/lib/validations/circulation";
import { assertPermission, AuthorizationError } from "@/server/auth/guards";
import { getPolicy } from "@/server/services/policy";
import { recordActivity, recordAudit } from "@/server/services/audit";
import { notifications_ } from "@/server/services/notifications";
import { daysOverdue } from "@/lib/utils";
import type { ActionResult } from "@/lib/utils";

const fail = (error: string): ActionResult => ({ success: false, error });

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Issue a book to a member (picks an available copy if none specified). */
export async function issueBook(raw: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await assertPermission("borrowings:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = issueBookSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid issue details.");
  const { memberId, bookId, copyId, dueAt } = parsed.data;
  const policy = await getPolicy();

  try {
    const result = await db.transaction(async (tx) => {
      const member = await tx.query.members.findFirst({
        where: eq(members.id, memberId),
      });
      if (!member) throw new Error("Member not found.");
      if (member.status !== "active")
        throw new Error("Member is not active.");

      const [{ value: activeCount }] = await tx
        .select({ value: count() })
        .from(borrowings)
        .where(
          and(
            eq(borrowings.memberId, memberId),
            eq(borrowings.status, "active"),
          ),
        );
      if (Number(activeCount) >= member.maxBorrowLimit)
        throw new Error(
          `Borrow limit reached (${member.maxBorrowLimit} books).`,
        );

      // Resolve an available copy.
      const copy = copyId
        ? await tx.query.bookCopies.findFirst({
            where: and(
              eq(bookCopies.id, copyId),
              eq(bookCopies.status, "available"),
            ),
          })
        : await tx.query.bookCopies.findFirst({
            where: and(
              eq(bookCopies.bookId, bookId),
              eq(bookCopies.status, "available"),
            ),
          });
      if (!copy) throw new Error("No available copy for this title.");

      const due = dueAt ?? addDays(new Date(), policy.loanDays);

      const [borrow] = await tx
        .insert(borrowings)
        .values({
          copyId: copy.id,
          bookId,
          memberId,
          issuedById: user.id,
          dueAt: due,
          status: "active",
        })
        .returning({ id: borrowings.id });

      await tx
        .update(bookCopies)
        .set({ status: "borrowed", updatedAt: new Date() })
        .where(eq(bookCopies.id, copy.id));

      await tx
        .update(books)
        .set({ availableCopies: sqlDecrement() })
        .where(eq(books.id, bookId));

      return { borrowId: borrow!.id, due };
    });

    await recordActivity({
      userId: user.id,
      type: "borrow",
      description: `Issued a book to member`,
      metadata: { memberId, bookId },
    });
    await recordAudit({
      userId: user.id,
      action: "borrowing.issued",
      entity: "borrowing",
      entityId: result.borrowId,
    });

    revalidatePath("/borrowings");
    revalidatePath("/dashboard");
    revalidatePath(`/books/${bookId}`);
    return { success: true, data: null, message: "Book issued." };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not issue book.");
  }
}

/** Return a book; computes late fees and promotes the reservation queue. */
export async function returnBook(raw: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await assertPermission("borrowings:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = returnBookSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid return details.");
  const { borrowingId, condition, notes } = parsed.data;
  const policy = await getPolicy();

  try {
    const outcome = await db.transaction(async (tx) => {
      const borrow = await tx.query.borrowings.findFirst({
        where: eq(borrowings.id, borrowingId),
      });
      if (!borrow) throw new Error("Borrowing not found.");
      if (borrow.returnedAt) throw new Error("Already returned.");

      const now = new Date();
      const late = daysOverdue(borrow.dueAt, now);
      let fineId: string | null = null;
      let fineAmount = 0;

      // Late / damage / loss fines.
      if (late > 0 || condition !== "good") {
        fineAmount =
          condition === "lost"
            ? 50 + late * policy.finePerDay
            : late * policy.finePerDay + (condition === "damaged" ? 10 : 0);
        if (fineAmount > 0) {
          const [fine] = await tx
            .insert(fines)
            .values({
              memberId: borrow.memberId,
              borrowingId: borrow.id,
              amount: fineAmount.toFixed(2),
              reason: condition === "good" ? "overdue" : (condition as never),
              description:
                late > 0 ? `${late} day(s) overdue` : `Returned ${condition}`,
            })
            .returning({ id: fines.id });
          fineId = fine!.id;
        }
      }

      await tx
        .update(borrowings)
        .set({ status: "returned", returnedAt: now, updatedAt: now })
        .where(eq(borrowings.id, borrowingId));

      await tx.insert(returns).values({
        borrowingId,
        receivedById: user.id,
        condition,
        lateDays: late,
        fineId,
        notes: notes || null,
      });

      // Copy goes back to shelf (or quarantine if lost/damaged).
      const copyStatus =
        condition === "lost"
          ? "lost"
          : condition === "damaged"
            ? "maintenance"
            : "available";
      await tx
        .update(bookCopies)
        .set({ status: copyStatus, condition, updatedAt: now })
        .where(eq(bookCopies.id, borrow.copyId));

      if (copyStatus === "available") {
        await tx
          .update(books)
          .set({ availableCopies: sqlIncrement() })
          .where(eq(books.id, borrow.bookId));
      }

      // Promote next reservation in the queue.
      const nextReservation = await tx.query.reservations.findFirst({
        where: and(
          eq(reservations.bookId, borrow.bookId),
          eq(reservations.status, "pending"),
        ),
        orderBy: asc(reservations.queuePosition),
        with: { member: { with: { user: true } } },
      });

      return { fineAmount, late, bookId: borrow.bookId, nextReservation, copyStatus };
    });

    // Notify next-in-queue (outside the tx).
    if (outcome.nextReservation && outcome.copyStatus === "available") {
      const r = outcome.nextReservation;
      const holdUntil = addDays(new Date(), policy.reservationHoldDays);
      await db
        .update(reservations)
        .set({ status: "ready", readyAt: new Date(), expiresAt: holdUntil })
        .where(eq(reservations.id, r.id));
      const book = await db.query.books.findFirst({
        where: eq(books.id, outcome.bookId),
        columns: { title: true },
      });
      if (r.member?.user) {
        await notifications_.reservationReady(
          r.member.user.id,
          r.member.user.name ?? "there",
          book?.title ?? "your reserved book",
          holdUntil.toLocaleDateString(),
        );
      }
    }

    await recordActivity({
      userId: user.id,
      type: "return",
      description: outcome.late
        ? `Returned a book (${outcome.late} days late)`
        : "Returned a book",
    });
    await recordAudit({
      userId: user.id,
      action: "borrowing.returned",
      entity: "borrowing",
      entityId: borrowingId,
    });

    revalidatePath("/borrowings");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: null,
      message:
        outcome.fineAmount > 0
          ? `Returned. A fine of $${outcome.fineAmount.toFixed(2)} was applied.`
          : "Returned. Thank you!",
    };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not return book.");
  }
}

/** Renew an active loan (blocked if others are waiting). */
export async function renewBook(raw: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await assertPermission("borrowings:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = renewBookSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid renewal.");
  const { borrowingId, days } = parsed.data;
  const policy = await getPolicy();

  try {
    const message = await db.transaction(async (tx) => {
      const borrow = await tx.query.borrowings.findFirst({
        where: eq(borrowings.id, borrowingId),
      });
      if (!borrow || borrow.status !== "active")
        throw new Error("Loan is not active.");
      if (borrow.renewalCount >= policy.maxRenewals)
        throw new Error(`Maximum ${policy.maxRenewals} renewals reached.`);

      const [{ value: waiting }] = await tx
        .select({ value: count() })
        .from(reservations)
        .where(
          and(
            eq(reservations.bookId, borrow.bookId),
            eq(reservations.status, "pending"),
          ),
        );
      if (Number(waiting) > 0)
        throw new Error("Cannot renew — other members are waiting.");

      const newDue = addDays(borrow.dueAt, days ?? policy.loanDays);
      await tx
        .update(borrowings)
        .set({
          dueAt: newDue,
          renewalCount: borrow.renewalCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(borrowings.id, borrowingId));
      return `Renewed until ${newDue.toLocaleDateString()}.`;
    });

    await recordAudit({
      userId: user.id,
      action: "borrowing.renewed",
      entity: "borrowing",
      entityId: borrowingId,
    });
    revalidatePath("/borrowings");
    return { success: true, data: null, message };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not renew.");
  }
}

/** Place a reservation; computes queue position. */
export async function createReservation(raw: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await assertPermission("reservations:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = reservationSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid reservation.");
  const { bookId, memberId } = parsed.data;

  try {
    const position = await db.transaction(async (tx) => {
      const existing = await tx.query.reservations.findFirst({
        where: and(
          eq(reservations.bookId, bookId),
          eq(reservations.memberId, memberId),
          eq(reservations.status, "pending"),
        ),
      });
      if (existing) throw new Error("Already reserved by this member.");

      const [{ value: queued }] = await tx
        .select({ value: count() })
        .from(reservations)
        .where(
          and(
            eq(reservations.bookId, bookId),
            eq(reservations.status, "pending"),
          ),
        );
      const pos = Number(queued) + 1;
      await tx.insert(reservations).values({
        bookId,
        memberId,
        queuePosition: pos,
        status: "pending",
      });
      return pos;
    });

    await recordActivity({
      userId: user.id,
      type: "reservation",
      description: `Reserved a book (queue #${position})`,
    });
    revalidatePath("/reservations");
    revalidatePath(`/books/${bookId}`);
    return {
      success: true,
      data: null,
      message: `Reserved — position #${position} in the queue.`,
    };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not reserve.");
  }
}

export async function cancelReservation(id: string): Promise<ActionResult> {
  try {
    await assertPermission("reservations:delete");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }
  try {
    await db
      .update(reservations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(reservations.id, id));
    revalidatePath("/reservations");
    return { success: true, data: null, message: "Reservation cancelled." };
  } catch {
    return fail("Could not cancel reservation.");
  }
}

// Small SQL helpers for atomic counter updates.
function sqlDecrement() {
  return sql`greatest(${books.availableCopies} - 1, 0)`;
}
function sqlIncrement() {
  return sql`least(${books.availableCopies} + 1, ${books.totalCopies})`;
}
