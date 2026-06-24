import "server-only";
import { and, asc, count, desc, eq, gt, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import { authors, books, categories, publishers } from "@/server/db/schema";
import type { BookFilters } from "@/lib/validations/book";

export async function listBooks(filters: Partial<BookFilters> = {}) {
  const {
    q,
    categoryId,
    availability = "all",
    sort = "newest",
    page = 1,
    pageSize = 12,
  } = filters;

  const where = and(
    q
      ? or(
          ilike(books.title, `%${q}%`),
          ilike(books.subtitle, `%${q}%`),
          ilike(books.isbn, `%${q}%`),
        )
      : undefined,
    categoryId ? eq(books.categoryId, categoryId) : undefined,
    availability === "available" ? gt(books.availableCopies, 0) : undefined,
    availability === "unavailable" ? eq(books.availableCopies, 0) : undefined,
  );

  const orderBy =
    sort === "title"
      ? asc(books.title)
      : sort === "rating"
        ? desc(books.rating)
        : desc(books.createdAt);

  const [rows, [total]] = await Promise.all([
    db.query.books.findMany({
      where,
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: {
        category: { columns: { name: true, color: true } },
        publisher: { columns: { name: true } },
        bookAuthors: { with: { author: { columns: { name: true } } } },
      },
    }),
    db.select({ value: count() }).from(books).where(where),
  ]);

  return {
    items: rows,
    total: Number(total?.value ?? 0),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total?.value ?? 0) / pageSize)),
  };
}

export type BookListItem = Awaited<
  ReturnType<typeof listBooks>
>["items"][number];

export async function getBookById(id: string) {
  return db.query.books.findFirst({
    where: eq(books.id, id),
    with: {
      category: true,
      publisher: true,
      bookAuthors: { with: { author: true } },
      copies: true,
      reservations: {
        with: { member: { with: { user: { columns: { name: true } } } } },
      },
    },
  });
}

export async function listCategories() {
  return db.query.categories.findMany({ orderBy: asc(categories.name) });
}

export async function listAuthors() {
  return db.query.authors.findMany({ orderBy: asc(authors.name) });
}

export async function listPublishers() {
  return db.query.publishers.findMany({ orderBy: asc(publishers.name) });
}

/** Lightweight options for combobox selectors (issue/reserve dialogs). */
export async function searchBookOptions(q: string, limit = 10) {
  return db
    .select({
      id: books.id,
      title: books.title,
      available: books.availableCopies,
    })
    .from(books)
    .where(q ? ilike(books.title, `%${q}%`) : undefined)
    .orderBy(asc(books.title))
    .limit(limit);
}
