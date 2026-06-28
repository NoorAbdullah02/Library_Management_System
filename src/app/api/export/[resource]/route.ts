import { getCurrentUser } from "@/server/auth/guards";
import { can } from "@/lib/rbac";
import { listBooks } from "@/server/queries/books";
import { listMembers } from "@/server/queries/members";
import { listBorrowings, listFines } from "@/server/queries/circulation";
import {
  toCSV,
  toXLSX,
  exportContentTypes,
  type Column,
} from "@/server/services/export";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ resource: string }> },
) {
  const { resource } = await ctx.params;

  const user = await getCurrentUser();
  if (!user || !can(user.role, "reports:read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const format =
    new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  switch (resource) {
    case "books": {
      const rows = (await listBooks({ pageSize: 1000 })).items;
      const cols: Column<(typeof rows)[number]>[] = [
        { key: "title", header: "Title" },
        { key: "isbn", header: "ISBN" },
        { key: "copies", header: "Copies", accessor: (row) => row.totalCopies },
        {
          key: "available",
          header: "Available",
          accessor: (row) => row.availableCopies,
        },
      ];
      const body = format === "xlsx" ? toXLSX(rows, cols) : toCSV(rows, cols);
      return new Response(body, {
        headers: {
          "content-type": exportContentTypes[format],
          "content-disposition": `attachment; filename=${resource}.${format}`,
        },
      });
    }
    case "members": {
      const rows = (await listMembers({ pageSize: 1000 })).items;
      const cols: Column<(typeof rows)[number]>[] = [
        { key: "membershipNumber", header: "Membership #" },
        { key: "name", header: "Name", accessor: (row) => row.user?.name },
        { key: "email", header: "Email", accessor: (row) => row.user?.email },
        { key: "status", header: "Status" },
      ];
      const body = format === "xlsx" ? toXLSX(rows, cols) : toCSV(rows, cols);
      return new Response(body, {
        headers: {
          "content-type": exportContentTypes[format],
          "content-disposition": `attachment; filename=${resource}.${format}`,
        },
      });
    }
    case "borrowings": {
      const rows = (await listBorrowings({ pageSize: 1000 })).items;
      const cols: Column<(typeof rows)[number]>[] = [
        { key: "book", header: "Book", accessor: (row) => row.book?.title },
        {
          key: "member",
          header: "Member",
          accessor: (row) => row.member?.user?.name,
        },
        { key: "status", header: "Status" },
        {
          key: "due",
          header: "Due",
          accessor: (row) => row.dueAt?.toISOString?.() ?? String(row.dueAt),
        },
      ];
      const body = format === "xlsx" ? toXLSX(rows, cols) : toCSV(rows, cols);
      return new Response(body, {
        headers: {
          "content-type": exportContentTypes[format],
          "content-disposition": `attachment; filename=${resource}.${format}`,
        },
      });
    }
    case "fines": {
      const rows = await listFines();
      const cols: Column<(typeof rows)[number]>[] = [
        {
          key: "member",
          header: "Member",
          accessor: (row) => row.member?.user?.name,
        },
        { key: "amount", header: "Amount" },
        { key: "status", header: "Status" },
        { key: "reason", header: "Reason" },
      ];
      const body = format === "xlsx" ? toXLSX(rows, cols) : toCSV(rows, cols);
      return new Response(body, {
        headers: {
          "content-type": exportContentTypes[format],
          "content-disposition": `attachment; filename=${resource}.${format}`,
        },
      });
    }
    default:
      return new Response("Not found", { status: 404 });
  }
}
