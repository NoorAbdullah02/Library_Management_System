import type { Metadata } from "next";

import { requirePermission, getCurrentUser } from "@/server/auth/guards";
import {
  listBooks,
  listCategories,
  listAuthors,
  listPublishers,
} from "@/server/queries/books";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { BooksTable } from "@/features/books/books-table";

export const metadata: Metadata = { title: "Catalog" };
export const dynamic = "force-dynamic";

export default async function BooksPage() {
  await requirePermission("books:read");
  const user = await getCurrentUser();

  const [{ items }, categories, authors, publishers] = await Promise.all([
    listBooks({ pageSize: 100 }),
    listCategories(),
    listAuthors(),
    listPublishers(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catalog"
        description={`${items.length} titles in the collection`}
      />
      <BooksTable
        books={items}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        publishers={publishers.map((p) => ({ id: p.id, name: p.name }))}
        authors={authors.map((a) => ({ id: a.id, name: a.name }))}
        canManage={can(user?.role, "books:create")}
      />
    </div>
  );
}
