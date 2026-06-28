"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NAV_ITEMS, APP_NAME } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { UserRole } from "@/server/db/schema";

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-16 flex-row items-center gap-2 border-b px-4">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </span>
          <SheetTitle className="font-serif text-xl">{APP_NAME}</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <item.icon className="size-[1.15rem]" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
