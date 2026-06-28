import type { Metadata } from "next";
import { Shield } from "lucide-react";

import { requirePermission, getCurrentUser } from "@/server/auth/guards";
import { getPolicy } from "@/server/services/policy";
import { can, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PolicyForm } from "@/features/settings/policy-form";
import { getInitials } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const ROLES: UserRole[] = ["admin", "librarian", "member"];

export default async function SettingsPage() {
  await requirePermission("settings:read");
  const [policy, user] = await Promise.all([getPolicy(), getCurrentUser()]);
  const canEdit = can(user?.role, "settings:update");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Library policy, your profile, and access control"
      />

      <Tabs defaultValue="policy">
        <TabsList>
          <TabsTrigger value="policy">Circulation policy</TabsTrigger>
          <TabsTrigger value="profile">Your profile</TabsTrigger>
          <TabsTrigger value="roles">Roles & access</TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Circulation policy</CardTitle>
            </CardHeader>
            <CardContent>
              <PolicyForm policy={policy} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarImage src={user?.image ?? undefined} />
                  <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-serif text-xl">{user?.name}</p>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                  {user?.role && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="size-3" />
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLES.map((role) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="text-primary size-4" />
                    {ROLE_LABELS[role]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
