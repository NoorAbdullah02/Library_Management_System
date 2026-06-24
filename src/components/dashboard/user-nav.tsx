"use client";

import { LogOut, User as UserIcon, Settings, Shield } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { logout } from "@/server/actions/session";
import type { UserRole } from "@/server/db/schema";

export type SessionUserLite = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
};

export function UserNav({ user }: { user: SessionUserLite }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-[3px]">
        <Avatar className="ring-border size-9 ring-1">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate font-medium">{user.name ?? "User"}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {user.email}
          </span>
          <Badge variant="secondary" className="mt-1 w-fit gap-1 text-[10px]">
            <Shield className="size-3" />
            {ROLE_LABELS[user.role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings">
            <UserIcon className="size-4" /> Profile
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">
            <Settings className="size-4" /> Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logout}>
          <button type="submit" className="w-full">
            <DropdownMenuItem variant="destructive" asChild>
              <span className="w-full cursor-pointer">
                <LogOut className="size-4" /> Sign out
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
