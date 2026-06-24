"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { books, bookAuthors, bookCopies, authors } from "@/server/db/schema";
import { bookSchema, updateBookSchema } from "@/lib/validations/book";
import { generateBarcode, copyQrPayload, normalizeISBN } from "@/lib/codes";
import { assertPermission, AuthorizationError } from "@/server/auth/guards";
import { recordAudit, recordActivity } from "@/server/services/audit";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/utils";

function fail(error: string): ActionResult {
  return { success: false, error };
}

export async function createBook(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await assertPermission("books:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const input = parsed.data;
  const copies = Math.max(0, input.totalCopies);

  try {
    const bookId = await db.transaction(async (tx) => {
      const [book] = await tx
        .insert(books)
        .values({
          title: input.title,
          subtitle: input.subtitle || null,
          isbn: input.isbn ? normalizeISBN(input.isbn) : null,
          description: input.description || null,
          categoryId: input.categoryId || null,
          publisherId: input.publisherId || null,
          coverUrl: input.coverUrl || null,
          language: input.language,
          pageCount: input.pageCount ?? null,
          publishedYear: input.publishedYear ?? null,
          edition: input.edition || null,
          tags: input.tags,
          totalCopies: copies,
          availableCopies: copies,
          createdById: user.id,
        })
        .returning({ id: books.id });

      const newId = book!.id;

      if (input.authorIds.length) {
        await tx
          .insert(bookAuthors)
          .values(input.authorIds.map((authorId) => ({ bookId: newId, authorId })));
      }

      if (copies > 0) {
        await tx.insert(bookCopies).values(
          Array.from({ length: copies }, () => {
            const barcode = generateBarcode();
            return {
              bookId: newId,
              barcode,
              qrCode: copyQrPayload(env.APP_URL, newId),
              status: "available" as const,
            };
          }),
        );
      }

      return newId;
    });

    await recordAudit({
      userId: user.id,
      action: "book.created",
      entity: "book",
      entityId: bookId,
      after: { title: input.title },
    });
    await recordActivity({
      userId: user.id,
      type: "catalog",
      description: `Added "${input.title}" to the catalog`,
    });

    revalidatePath("/books");
    revalidatePath("/dashboard");
    return { success: true, data: { id: bookId }, message: "Book created." };
  } catch (err) {
    console.error("[createBook]", err);
    return fail("Could not create the book. The ISBN may already exist.");
  }
}

export async function updateBook(raw: unknown): Promise<ActionResult> {
  try {
    await assertPermission("books:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = updateBookSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { id, authorIds, totalCopies: _ignore, ...rest } = parsed.data;

  try {
    await db
      .update(books)
      .set({
        ...rest,
        isbn: rest.isbn ? normalizeISBN(rest.isbn) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id));

    if (authorIds) {
      await db.delete(bookAuthors).where(eq(bookAuthors.bookId, id));
      if (authorIds.length) {
        await db
          .insert(bookAuthors)
          .values(authorIds.map((authorId) => ({ bookId: id, authorId })));
      }
    }

    await recordAudit({ action: "book.updated", entity: "book", entityId: id });
    revalidatePath("/books");
    revalidatePath(`/books/${id}`);
    return { success: true, data: null, message: "Book updated." };
  } catch (err) {
    console.error("[updateBook]", err);
    return fail("Could not update the book.");
  }
}

export async function deleteBook(id: string): Promise<ActionResult> {
  try {
    await assertPermission("books:delete");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }
  try {
    await db.delete(books).where(eq(books.id, id));
    await recordAudit({ action: "book.deleted", entity: "book", entityId: id });
    revalidatePath("/books");
    return { success: true, data: null, message: "Book deleted." };
  } catch (err) {
    console.error("[deleteBook]", err);
    return fail("Could not delete — the book has active loans.");
  }
}

/** Add N more physical copies to an existing title. */
export async function addCopies(
  bookId: string,
  quantity: number,
): Promise<ActionResult> {
  try {
    await assertPermission("copies:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }
  const qty = Math.max(1, Math.min(1000, Math.floor(quantity)));
  try {
    await db.transaction(async (tx) => {
      await tx.insert(bookCopies).values(
        Array.from({ length: qty }, () => ({
          bookId,
          barcode: generateBarcode(),
          qrCode: copyQrPayload(env.APP_URL, bookId),
          status: "available" as const,
        })),
      );
      const book = await tx.query.books.findFirst({
        where: eq(books.id, bookId),
        columns: { totalCopies: true, availableCopies: true },
      });
      await tx
        .update(books)
        .set({
          totalCopies: (book?.totalCopies ?? 0) + qty,
          availableCopies: (book?.availableCopies ?? 0) + qty,
        })
        .where(eq(books.id, bookId));
    });
    revalidatePath(`/books/${bookId}`);
    return { success: true, data: null, message: `${qty} copies added.` };
  } catch (err) {
    console.error("[addCopies]", err);
    return fail("Could not add copies.");
  }
}

/**
 * Bulk import from parsed CSV rows. Each row: title, isbn?, author?, category?,
 * copies?. Categories/authors are resolved or created by name.
 */
export async function bulkImportBooks(
  rows: Array<Record<string, string>>,
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  let user;
  try {
    user = await assertPermission("books:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const title = (row.title ?? row.Title ?? "").trim();
    if (!title) {
      skipped++;
      continue;
    }
    const copies = Math.max(0, Number(row.copies ?? row.Copies ?? 1) || 1);
    try {
      await db.transaction(async (tx) => {
        const [book] = await tx
          .insert(books)
          .values({
            title,
            isbn: row.isbn ? normalizeISBN(row.isbn) : null,
            totalCopies: copies,
            availableCopies: copies,
            createdById: user.id,
          })
          .returning({ id: books.id });

        const authorName = (row.author ?? row.Author ?? "").trim();
        if (authorName) {
          const existing = await tx.query.authors.findFirst({
            where: eq(authors.name, authorName),
          });
          const authorId =
            existing?.id ??
            (
              await tx
                .insert(authors)
                .values({ name: authorName })
                .returning({ id: authors.id })
            )[0]!.id;
          await tx
            .insert(bookAuthors)
            .values({ bookId: book!.id, authorId });
        }

        if (copies > 0) {
          await tx.insert(bookCopies).values(
            Array.from({ length: copies }, () => ({
              bookId: book!.id,
              barcode: generateBarcode(),
              qrCode: copyQrPayload(env.APP_URL, book!.id),
              status: "available" as const,
            })),
          );
        }
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  await recordAudit({
    userId: user.id,
    action: "book.bulk_import",
    entity: "book",
    after: { imported, skipped },
  });
  revalidatePath("/books");
  return {
    success: true,
    data: { imported, skipped },
    message: `Imported ${imported} books (${skipped} skipped).`,
  };
}
