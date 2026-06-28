"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal, Loader2, DollarSign, Ban, Wallet } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { payFine, waiveFine } from "@/server/actions/fines";
import {
  payFineSchema,
  type PayFineInput,
} from "@/lib/validations/circulation";
import { formatCurrency, formatDate } from "@/lib/utils";

type FineRow = {
  id: string;
  amount: string;
  paidAmount: string | null;
  reason: "overdue" | "damaged" | "lost" | "other";
  status: "pending" | "paid" | "waived" | "partial";
  description: string | null;
  createdAt: string | Date;
  paidAt: string | Date | null;
  member: { user: { name: string | null; email: string } };
  borrowing: { book: { title: string } } | null;
};

export function FinesTable({
  fines,
  canManage,
}: {
  fines: FineRow[];
  canManage: boolean;
}) {
  const [paying, setPaying] = React.useState<FineRow | null>(null);
  const [waiving, setWaiving] = React.useState<FineRow | null>(null);

  const columns = React.useMemo<ColumnDef<FineRow>[]>(() => {
    const base: ColumnDef<FineRow>[] = [
      {
        id: "member",
        accessorFn: (f) => f.member.user.name ?? f.member.user.email,
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
        id: "reason",
        header: "Reason",
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="min-w-0">
              <p className="font-medium capitalize">{f.reason}</p>
              {f.borrowing ? (
                <p className="text-muted-foreground truncate text-xs">
                  {f.borrowing.book.title}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatCurrency(Number(row.original.amount))}
          </span>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatCurrency(Number(row.original.paidAmount))}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ];

    if (canManage) {
      base.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const f = row.original;
          const open = f.status === "pending" || f.status === "partial";
          if (!open) return null;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPaying(f)}>
                    <DollarSign className="size-4" /> Pay
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setWaiving(f)}
                  >
                    <Ban className="size-4" /> Waive
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
        data={fines}
        searchKey="member"
        searchPlaceholder="Search by member…"
        emptyState={
          <EmptyState
            icon={Wallet}
            title="No fines"
            description="Outstanding charges will appear here as they are issued."
            className="border-0"
          />
        }
      />

      {/* Pay */}
      {paying && (
        <PayFineDialog
          fine={paying}
          open={Boolean(paying)}
          onOpenChange={(o) => !o && setPaying(null)}
        />
      )}

      {/* Waive */}
      <ConfirmDialog
        open={Boolean(waiving)}
        onOpenChange={(o) => !o && setWaiving(null)}
        title="Waive this fine?"
        description={
          waiving
            ? `This clears the ${formatCurrency(Number(waiving.amount))} charge for ${waiving.member.user.name ?? "this member"}.`
            : undefined
        }
        confirmLabel="Waive fine"
        onConfirm={async () => {
          if (!waiving) return;
          const res = await waiveFine({ fineId: waiving.id });
          if (res.success) toast.success(res.message);
          else toast.error(res.error);
          setWaiving(null);
        }}
      />
    </>
  );
}

function PayFineDialog({
  fine,
  open,
  onOpenChange,
}: {
  fine: FineRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const remaining = Number(fine.amount) - Number(fine.paidAmount);

  const form = useForm<PayFineInput>({
    resolver: zodResolver(payFineSchema),
    defaultValues: {
      fineId: fine.id,
      amount: remaining,
    },
  });

  function onSubmit(values: PayFineInput) {
    startTransition(async () => {
      const res = await payFine({ fineId: values.fineId, amount: values.amount });
      if (!res.success) {
        if (res.fieldErrors) {
          for (const [k, msgs] of Object.entries(res.fieldErrors)) {
            form.setError(k as keyof PayFineInput, { message: msgs?.[0] });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Payment recorded.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Record payment</DialogTitle>
          <DialogDescription>
            {formatCurrency(remaining)} outstanding for{" "}
            {fine.member.user.name ?? "this member"}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="pay-fine-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="pay-fine-form" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
