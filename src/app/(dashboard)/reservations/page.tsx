import type { Metadata } from "next";

import { requirePermission, getCurrentUser } from "@/server/auth/guards";
import { listReservations } from "@/server/queries/circulation";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { ReservationsTable } from "@/features/reservations/reservations-table";

export const metadata: Metadata = { title: "Reservations" };
export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  await requirePermission("reservations:read");
  const user = await getCurrentUser();

  const items = await listReservations();
  const canManage = can(user?.role, "reservations:delete");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reservations"
        description={`${items.length} holds in the queue`}
      />
      <ReservationsTable reservations={items} canManage={canManage} />
    </div>
  );
}
