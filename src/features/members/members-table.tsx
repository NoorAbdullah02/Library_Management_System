"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Pencil, Users } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { MemberFormDialog } from "./member-form-dialog";
import { getInitials } from "@/lib/utils";
import type { MemberInput } from "@/lib/validations/member";

// Loosely typed to accept the relational shape returned by listMembers().
type MemberRow = {
  id: string;
  membershipNumber: string;
  membershipType: string;
  status: string;
  maxBorrowLimit: number;
  joinedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string | null;
  address: string | null;
  notes: string | null;
  userId: string;
  user: {
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
  };
};

export function MembersTable({
  members,
  canManage,
}: {
  members: MemberRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<MemberRow | null>(null);

  const columns = React.useMemo<ColumnDef<MemberRow>[]>(() => {
    const base: ColumnDef<MemberRow>[] = [
      {
        id: "member",
        header: "Member",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage src={m.user.image ?? undefined} alt="" />
                <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{m.user.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {m.user.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "membershipNumber",
        header: "Membership #",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original.membershipNumber}
          </span>
        ),
      },
      {
        accessorKey: "membershipType",
        header: "Type",
        cell: ({ row }) => (
          <span className="capitalize">{row.original.membershipType}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "maxBorrowLimit",
        header: "Limit",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.maxBorrowLimit}
          </span>
        ),
      },
    ];

    base.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const m = row.original;
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
                  onClick={() => router.push(`/members/${m.id}`)}
                >
                  <Eye className="size-4" /> View
                </DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem onClick={() => setEditing(m)}>
                    <Pencil className="size-4" /> Edit
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return base;
  }, [router, canManage]);

  return (
    <>
      <DataTable
        columns={columns}
        data={members}
        searchKey="membershipNumber"
        searchPlaceholder="Search by membership #…"
        onRowClick={(m) => router.push(`/members/${m.id}`)}
        toolbar={canManage ? <MemberFormDialog /> : undefined}
        emptyState={
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Register your first member to start lending."
            className="border-0"
          />
        }
      />

      {/* Edit */}
      {editing && (
        <MemberFormDialog
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          memberId={editing.id}
          initial={mapToInput(editing)}
        />
      )}
    </>
  );
}

function mapToInput(m: MemberRow): Partial<MemberInput> {
  return {
    name: m.user.name ?? "",
    email: m.user.email,
    phone: m.user.phone ?? "",
    membershipType: m.membershipType as MemberInput["membershipType"],
    address: m.address ?? "",
    maxBorrowLimit: m.maxBorrowLimit,
  };
}
