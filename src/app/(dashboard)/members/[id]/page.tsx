import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarClock,
  BookCopy,
  Receipt,
  Clock,
} from "lucide-react";

import { requirePermission } from "@/server/auth/guards";
import { getMemberById } from "@/server/queries/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  formatCurrency,
  formatDate,
  getInitials,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("members:read");
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  const activeLoans = member.borrowings.filter(
    (b) => b.status === "active" || b.status === "overdue",
  ).length;
  const outstanding = member.fines
    .filter((f) => f.status === "pending" || f.status === "partial")
    .reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/members">
          <ArrowLeft className="size-4" /> Back to members
        </Link>
      </Button>

      {/* Header */}
      <div className="glass flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="ring-border size-16 ring-1">
            <AvatarImage src={member.user.image ?? undefined} />
            <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
              {getInitials(member.user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-serif text-2xl tracking-tight">
              {member.user.name}
            </h1>
            <p className="text-muted-foreground font-mono text-xs">
              {member.membershipNumber}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={member.status} />
              <span className="text-muted-foreground text-xs capitalize">
                {member.membershipType}
              </span>
            </div>
          </div>
        </div>
        <div className="text-muted-foreground space-y-1.5 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="size-4" /> {member.user.email}
          </p>
          {member.user.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-4" /> {member.user.phone}
            </p>
          )}
          <p className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Joined{" "}
            {formatDate(member.joinedAt)}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={BookCopy} label="Total borrowings" value={member.borrowings.length} />
        <StatTile icon={Clock} label="Active loans" value={activeLoans} />
        <StatTile
          icon={Receipt}
          label="Outstanding fines"
          value={formatCurrency(outstanding)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Borrowing history */}
        <Card>
          <CardHeader>
            <CardTitle>Borrowing history</CardTitle>
          </CardHeader>
          <CardContent>
            {member.borrowings.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.borrowings.slice(0, 12).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[180px] truncate font-medium">
                        {b.book?.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(b.borrowedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(b.dueAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={BookCopy}
                title="No loans yet"
                className="border-0 py-8"
              />
            )}
          </CardContent>
        </Card>

        {/* Fines */}
        <Card>
          <CardHeader>
            <CardTitle>Fines</CardTitle>
          </CardHeader>
          <CardContent>
            {member.fines.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.fines.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="capitalize">{f.reason}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(Number(f.amount))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={f.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(f.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Receipt}
                title="No fines"
                description="This member has a clean record."
                className="border-0 py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="bg-muted text-foreground/80 flex size-10 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="font-serif text-xl tracking-tight tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}
