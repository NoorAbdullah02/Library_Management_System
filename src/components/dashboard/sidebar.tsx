"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, PanelLeftClose, PanelLeft } from "lucide-react";

import { NAV_ITEMS } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { APP_NAME } from "@/lib/navigation";
import type { UserRole } from "@/server/db/schema";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission),
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="bg-sidebar border-sidebar-border sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r lg:flex"
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <span className="bg-primary text-primary-foreground ring-primary/30 flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1">
            <Sparkles className="size-5" />
          </span>
          {!collapsed && (
            <span className="font-serif text-xl tracking-tight">{APP_NAME}</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="bg-sidebar-accent absolute inset-0 -z-10 rounded-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {active && (
                <span className="bg-primary absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full" />
              )}
              <item.icon className="size-[1.15rem] shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggle}
        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
      >
        {collapsed ? (
          <PanelLeft className="size-[1.15rem]" />
        ) : (
          <>
            <PanelLeftClose className="size-[1.15rem]" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </motion.aside>
  );
}
