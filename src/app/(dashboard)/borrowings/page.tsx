import type { Metadata } from "next";

import { requirePermission, getCurrentUser } from "@/server/auth/guards";
import { listBorrowings } from "@/server/queries/circulation";
import { searchMemberOptions } from "@/server/queries/members";
import { searchBookOptions } from "@/server/queries/books";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { BorrowingsTable } from "@/features/circulation/borrowings-table";

export const metadata: Metadata = { title: "Circulation" };
export const dynamic = "force-dynamic";

export default async function BorrowingsPage() {
  await requirePermission("borrowings:read");
  const user = await getCurrentUser();

  const [{ items }, members, books] = await Promise.all([
    listBorrowings({ pageSize: 100 }),
    searchMemberOptions("", 300),
    searchBookOptions("", 300),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Circulation"
        description={`${items.length} loans on record`}
      />
      <BorrowingsTable
        borrowings={items}
        members={members}
        books={books}
        canManage={can(user?.role, "borrowings:create")}
      />
    </div>
  );
}
