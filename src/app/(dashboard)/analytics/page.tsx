import type { Metadata } from "next";
import { BookOpen, Users, ArrowLeftRight, AlertTriangle } from "lucide-react";

import { requirePermission } from "@/server/auth/guards";
import {
  getDashboardStats,
  getBorrowingTrends,
  getMemberGrowth,
  getPopularBooks,
  getCategoryDistribution,
} from "@/server/queries/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendAreaChart,
  PopularBarChart,
  CategoryDonut,
} from "@/components/charts/charts";
import { ExportButtons } from "@/features/analytics/export-buttons";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requirePermission("reports:read");

  const [stats, trends, growth, popular, categories] = await Promise.all([
    getDashboardStats(),
    getBorrowingTrends(8),
    getMemberGrowth(8),
    getPopularBooks(6),
    getCategoryDistribution(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" description="Trends, popularity & reports">
        <ExportButtons />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Titles" value={stats.titles} icon={BookOpen} accent="gold" />
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
          accent="violet"
        />
        <StatCard
          label="Fines collected"
          value={stats.finesCollected}
          icon={AlertTriangle}
          format={(n) => formatCurrency(n)}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Borrowing trends</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={trends}
              keys={[
                { key: "borrowed", label: "Borrowed", color: "var(--chart-1)" },
                { key: "returned", label: "Returned", color: "var(--chart-2)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member growth</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={growth}
              keys={[
                { key: "members", label: "Total members", color: "var(--chart-2)" },
                { key: "new", label: "New", color: "var(--chart-3)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most borrowed</CardTitle>
          </CardHeader>
          <CardContent>
            <PopularBarChart data={popular} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
