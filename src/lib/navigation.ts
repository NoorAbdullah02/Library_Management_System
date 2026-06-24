import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  BookMarked,
  Receipt,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/server/db/schema";
import type { Permission } from "@/lib/rbac";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: UserRole[];
  description?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & live activity",
  },
  {
    title: "Catalog",
    href: "/books",
    icon: BookOpen,
    permission: "books:read",
    description: "Browse & manage books",
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
    permission: "members:read",
    description: "Member profiles & history",
  },
  {
    title: "Circulation",
    href: "/borrowings",
    icon: ArrowLeftRight,
    permission: "borrowings:read",
    description: "Issue, return & renew",
  },
  {
    title: "Reservations",
    href: "/reservations",
    icon: BookMarked,
    permission: "reservations:read",
    description: "Holds & waitlist queue",
  },
  {
    title: "Fines",
    href: "/fines",
    icon: Receipt,
    permission: "fines:read",
    description: "Payments & waivers",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permission: "reports:read",
    description: "Trends & reports",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings:read",
    description: "Policies & system",
  },
];

export const APP_NAME = "Lumina";
export const APP_TAGLINE = "The library OS for the modern age.";
