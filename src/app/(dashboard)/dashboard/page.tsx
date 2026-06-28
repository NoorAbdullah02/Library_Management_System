import {
  BookOpen,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  Clock,
  TrendingUp,
  Library,
} from "lucide-react";

import { requireAuth } from "@/server/auth/guards";
import {
  getDashboardStats,
  getBorrowingTrends,
  getPopularBooks,
  getCategoryDistribution,
  getRecentActivity,
  getOverdueLoans,
} from "@/server/queries/dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  TrendAreaChart,
  PopularBarChart,
  CategoryDonut,
} from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import {
  formatCurrency,
  formatRelative,
  getInitials,
  daysOverdue,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();
  const [stats, trends, popular, categories, activity, overdue] =
    await Promise.all([
      getDashboardStats(),
      getBorrowingTrends(),
      getPopularBooks(5),
      getCategoryDistribution(),
      getRecentActivity(7),
      getOverdueLoans(5),
    ]);

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="font-serif text-3xl tracking-tight">
          Good to see you, {firstName}.
        </h1>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Titles in catalog"
          value={stats.titles}
          icon={BookOpen}
          hint={`${stats.copies} total copies`}
          accent="gold"
        />
        <StatCard
          label="Active members"
          value={stats.activeMembers}
          icon={Users}
          accent="teal"
        />
        <StatCard
          label="Active loans"
          value={stats.activeLoans}
          icon={ArrowLeftRight}
          hint={`${stats.available} copies available`}
          accent="violet"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          hint={`${formatCurrency(stats.finesOutstanding)} outstanding`}
          accent="rose"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary size-4" /> Borrowing trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length ? (
              <TrendAreaChart
                data={trends}
                keys={[
                  { key: "borrowed", label: "Borrowed", color: "var(--chart-1)" },
                  { key: "returned", label: "Returned", color: "var(--chart-2)" },
                ]}
              />
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.some((c) => c.total > 0) ? (
              <CategoryDonut data={categories} />
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Most borrowed</CardTitle>
          </CardHeader>
          <CardContent>
            {popular.some((p) => p.borrows > 0) ? (
              <PopularBarChart data={popular} />
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader>
            <CardTitle>Live activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.length ? (
              activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-1.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-[10px]">
                      {getInitials(a.user?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{a.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelative(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No activity yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-destructive size-4" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.length ? (
              overdue.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {b.book?.title}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {b.member?.user?.name}
                    </p>
                  </div>
                  <StatusBadge status={`${daysOverdue(b.dueAt)}d overdue`} />
                </div>
              ))
            ) : (
              <EmptyState
                icon={Library}
                title="All clear"
                description="Nothing overdue right now."
                className="border-0 py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
      Not enough data yet — seed the database to see charts.
    </div>
  );
}
