import { requireAuth } from "@/server/auth/guards";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { FloatingDock } from "@/components/dashboard/floating-dock";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { CommandMenu } from "@/components/dashboard/command-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const lite = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };

  return (
    <div className="bg-grain flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={lite} />
        <main className="flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <MobileNav role={user.role} />
      <FloatingDock role={user.role} />
      <CommandMenu role={user.role} />
    </div>
  );
}
