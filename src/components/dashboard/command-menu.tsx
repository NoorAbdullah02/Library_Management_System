"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Plus, Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUIStore } from "@/stores/ui-store";
import { NAV_ITEMS } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/server/db/schema";

export function CommandMenu({ role }: { role: UserRole }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const toggle = useUIStore((s) => s.toggleCommand);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          e.key === "/" &&
          (e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA/)
        )
          return;
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  const navItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission),
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Menu"
      description="Search and jump anywhere"
    >
      <CommandInput placeholder="Search pages, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.title} ${item.description ?? ""}`}
              onSelect={() => go(item.href)}
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
              {item.description ? (
                <span className="text-muted-foreground ml-auto text-xs">
                  {item.description}
                </span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>

        {can(role, "books:create") && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go("/books?new=1")}>
                <Plus className="size-4" /> Add a book
              </CommandItem>
              <CommandItem onSelect={() => go("/borrowings?issue=1")}>
                <Plus className="size-4" /> Issue a book
              </CommandItem>
              <CommandItem onSelect={() => go("/members?new=1")}>
                <Plus className="size-4" /> Register member
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => setTheme("light")}>
            <Sun className="size-4" /> Light
          </CommandItem>
          <CommandItem onSelect={() => setTheme("dark")}>
            <Moon className="size-4" /> Dark
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** The pill-shaped search trigger shown in the topbar. */
export function CommandTrigger() {
  const setOpen = useUIStore((s) => s.setCommandOpen);
  return (
    <button
      onClick={() => setOpen(true)}
      className="glass text-muted-foreground hover:text-foreground flex h-9 w-full items-center gap-2 rounded-full px-3 text-sm transition-colors sm:w-64"
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="bg-muted pointer-events-none hidden items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] sm:inline-flex">
        ⌘K
      </kbd>
    </button>
  );
}
