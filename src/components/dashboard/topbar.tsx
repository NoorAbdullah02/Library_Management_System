"use client";

import { Bell, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CommandTrigger } from "@/components/dashboard/command-menu";
import { UserNav, type SessionUserLite } from "@/components/dashboard/user-nav";
import { useUIStore } from "@/stores/ui-store";

export function Topbar({ user }: { user: SessionUserLite }) {
  const setMobileNav = useUIStore((s) => s.setMobileNavOpen);

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileNav(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex flex-1 items-center">
        <CommandTrigger />
      </div>

      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
            >
              <Bell className="size-[1.15rem]" />
              <span className="bg-primary absolute top-2 right-2 size-2 rounded-full ring-2 ring-[var(--card)]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-3">
              <p className="font-medium">Notifications</p>
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto p-2">
              {[
                { t: "Reservation ready", d: '"Dune" is ready for pickup.' },
                { t: "Due soon", d: '"Sapiens" is due in 2 days.' },
                { t: "Welcome to Lumina", d: "Your account is ready." },
              ].map((n, i) => (
                <div
                  key={i}
                  className="hover:bg-muted/60 flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors"
                >
                  <span className="text-sm font-medium">{n.t}</span>
                  <span className="text-muted-foreground text-xs">{n.d}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ThemeToggle />
        <div className="bg-border mx-1 h-6 w-px" />
        <UserNav user={user} />
      </div>
    </header>
  );
}
