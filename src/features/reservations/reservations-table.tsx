"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal, X, BookMarked } from "lucide-react";

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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cancelReservation } from "@/server/actions/circulation";
import { formatRelative } from "@/lib/utils";

type ReservationRow = {
  id: string;
  status: "pending" | "ready" | "fulfilled" | "cancelled" | "expired";
  queuePosition: number;
  reservedAt: string | Date;
  readyAt: string | Date | null;
  expiresAt: string | Date | null;
  book: { title: string; coverUrl: string | null };
  member: { user: { name: string | null; email: string } };
};

export function ReservationsTable({
  reservations,
  canManage,
}: {
  reservations: ReservationRow[];
  canManage: boolean;
}) {
  const [cancelling, setCancelling] = React.useState<ReservationRow | null>(
    null,
  );

  const columns = React.useMemo<ColumnDef<ReservationRow>[]>(() => {
    const base: ColumnDef<ReservationRow>[] = [
      {
        id: "book",
        accessorFn: (r) => r.book.title,
        header: "Book",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  r.book.coverUrl ?? "https://avatar.vercel.sh/" + r.id + ".png"
                }
                alt=""
                className="bg-muted h-12 w-9 shrink-0 rounded-md object-cover shadow-sm"
                loading="lazy"
              />
              <p className="min-w-0 truncate font-medium">{r.book.title}</p>
            </div>
          );
        },
      },
      {
        id: "member",
        header: "Member",
        cell: ({ row }) => {
          const u = row.original.member.user;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium">{u.name ?? "—"}</p>
              <p className="text-muted-foreground truncate text-xs">
                {u.email}
              </p>
            </div>
          );
        },
      },
      {
        id: "queue",
        header: "Queue",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            #{row.original.queuePosition}
          </span>
        ),
      },
      {
        id: "reserved",
        header: "Reserved",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatRelative(row.original.reservedAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ];

    if (canManage) {
      base.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          const cancellable = r.status === "pending" || r.status === "ready";
          if (!cancellable) return null;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setCancelling(r)}
                  >
                    <X className="size-4" /> Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      });
    }

    return base;
  }, [canManage]);

  return (
    <>
      <DataTable
        columns={columns}
        data={reservations}
        searchKey="book"
        searchPlaceholder="Search by book…"
        emptyState={
          <EmptyState
            icon={BookMarked}
            title="No reservations"
            description="Holds placed by members will appear here."
            className="border-0"
          />
        }
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this reservation?"
        description={
          cancelling
            ? `This removes the hold on "${cancelling.book.title}" for ${cancelling.member.user.name ?? "this member"}.`
            : undefined
        }
        confirmLabel="Cancel reservation"
        onConfirm={async () => {
          if (!cancelling) return;
          const res = await cancelReservation(cancelling.id);
          if (res.success) toast.success(res.message);
          else toast.error(res.error);
          setCancelling(null);
        }}
      />
    </>
  );
}
