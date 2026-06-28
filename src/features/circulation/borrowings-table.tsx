"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal, RotateCw, Undo2, BookOpen } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { IssueBookDialog } from "./issue-book-dialog";
import { ReturnDialog } from "./return-dialog";
import { renewBook } from "@/server/actions/circulation";
import { formatDate, daysOverdue, cn } from "@/lib/utils";

type MemberOption = {
  id: string;
  membershipNumber: string;
  status: string;
  name: string | null;
  email: string;
};
type BookOption = { id: string; title: string; available: number };

type BorrowingRow = {
  id: string;
  borrowedAt: Date | string;
  dueAt: Date | string;
  returnedAt: Date | string | null;
  renewalCount: number;
  status: "active" | "returned" | "overdue" | "lost";
  book: { title: string; coverUrl: string | null };
  copy: { barcode: string };
  member: { user: { name: string | null; email: string } };
};

export function BorrowingsTable({
  borrowings,
  members,
  books,
  canManage,
}: {
  borrowings: BorrowingRow[];
  members: MemberOption[];
  books: BookOption[];
  canManage: boolean;
}) {
  const [returning, setReturning] = React.useState<BorrowingRow | null>(null);
  const [renewingId, setRenewingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function onRenew(b: BorrowingRow) {
    setRenewingId(b.id);
    startTransition(async () => {
      const res = await renewBook({ borrowingId: b.id });
      if (!res.success) toast.error(res.error);
      else toast.success(res.message ?? "Renewed.");
      setRenewingId(null);
    });
  }

  const columns = React.useMemo<ColumnDef<BorrowingRow>[]>(() => {
    const base: ColumnDef<BorrowingRow>[] = [
      {
        accessorKey: "book",
        accessorFn: (row) => row.book.title,
        header: "Book",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  b.book.coverUrl ??
                  "https://avatar.vercel.sh/" + b.id + ".png"
                }
                alt=""
                className="bg-muted h-12 w-9 shrink-0 rounded-md object-cover shadow-sm"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{b.book.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {b.member.user.name ?? b.member.user.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "borrowedAt",
        header: "Borrowed",
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.borrowedAt)}</span>
        ),
      },
      {
        accessorKey: "dueAt",
        header: "Due",
        cell: ({ row }) => {
          const b = row.original;
          const late =
            (b.status === "active" || b.status === "overdue")
              ? daysOverdue(b.dueAt)
              : 0;
          return (
            <div className="text-sm">
              <span>{formatDate(b.dueAt)}</span>
              {late > 0 && (
                <span className="text-destructive block text-xs font-medium">
                  {late}d overdue
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "renewalCount",
        header: "Renewals",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.renewalCount}
          </span>
        ),
      },
    ];

    base.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const b = row.original;
        const isOpen = b.status === "active" || b.status === "overdue";
        if (!canManage || !isOpen) {
          return <div className="flex justify-end" />;
        }
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setReturning(b)}>
                  <Undo2 className="size-4" /> Return
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={renewingId === b.id}
                  onClick={() => onRenew(b)}
                >
                  <RotateCw
                    className={cn(
                      "size-4",
                      renewingId === b.id && "animate-spin",
                    )}
                  />{" "}
                  Renew
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return base;
  }, [canManage, renewingId]);

  return (
    <>
      <DataTable
        columns={columns}
        data={borrowings}
        searchKey="book"
        searchPlaceholder="Search by title…"
        toolbar={
          canManage ? (
            <IssueBookDialog members={members} books={books} />
          ) : undefined
        }
        emptyState={
          <EmptyState
            icon={BookOpen}
            title="No loans yet"
            description="Issue a book to a member to start tracking circulation."
            className="border-0"
          />
        }
      />

      {returning && (
        <ReturnDialog
          borrowingId={returning.id}
          bookTitle={returning.book.title}
          open={Boolean(returning)}
          onOpenChange={(o) => !o && setReturning(null)}
        />
      )}
    </>
  );
}
