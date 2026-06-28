import type { Metadata } from "next";
import { Wallet, CircleDollarSign } from "lucide-react";

import { requirePermission, getCurrentUser } from "@/server/auth/guards";
import { listFines } from "@/server/queries/circulation";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FinesTable } from "@/features/fines/fines-table";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Fines" };
export const dynamic = "force-dynamic";

export default async function FinesPage() {
  await requirePermission("fines:read");
  const user = await getCurrentUser();

  const items = await listFines();
  const canManage = can(user?.role, "fines:update");

  const outstanding = items.reduce((sum, f) => {
    if (f.status === "pending" || f.status === "partial") {
      return sum + (Number(f.amount) - Number(f.paidAmount));
    }
    return sum;
  }, 0);
  const collected = items.reduce((sum, f) => sum + Number(f.paidAmount), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fines"
        description={`${items.length} fines on record`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Outstanding"
          value={outstanding}
          icon={Wallet}
          format={(n) => formatCurrency(n)}
          accent="rose"
        />
        <StatCard
          label="Collected"
          value={collected}
          icon={CircleDollarSign}
          format={(n) => formatCurrency(n)}
          accent="gold"
        />
      </div>

      <FinesTable fines={items} canManage={canManage} />
    </div>
  );
}
