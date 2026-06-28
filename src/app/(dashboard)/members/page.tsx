import type { Metadata } from "next";

import { requirePermission, getCurrentUser } from "@/server/auth/guards";
import { listMembers } from "@/server/queries/members";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { MembersTable } from "@/features/members/members-table";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  await requirePermission("members:read");
  const user = await getCurrentUser();

  const { items } = await listMembers({ pageSize: 100 });
  const canManage = can(user?.role, "members:create");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members"
        description={`${items.length} ${items.length === 1 ? "member" : "members"} on the roll`}
      />
      <MembersTable members={items} canManage={canManage} />
    </div>
  );
}
