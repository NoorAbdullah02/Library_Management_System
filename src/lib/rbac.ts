/**
 * Role-Based Access Control (RBAC).
 *
 * This module is the single source of truth for what each role may do. The
 * `roles`, `permissions`, and `role_permissions` tables in the database are
 * seeded from this catalog, and runtime authorization checks resolve against
 * the same constants — so policy never drifts between code and data.
 */

import type { UserRole } from "@/server/db/schema";

export const RESOURCES = [
  "books",
  "copies",
  "members",
  "borrowings",
  "reservations",
  "fines",
  "categories",
  "authors",
  "publishers",
  "users",
  "roles",
  "reports",
  "settings",
  "audit",
] as const;

export const ACTIONS = ["create", "read", "update", "delete", "manage"] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Resource}:${Action}`;

/** Build a fully-qualified permission string. */
export function perm(resource: Resource, action: Action): Permission {
  return `${resource}:${action}`;
}

/** Every permission in the system (cartesian product), used to seed the table. */
export const ALL_PERMISSIONS: Permission[] = RESOURCES.flatMap((r) =>
  ACTIONS.map((a) => perm(r, a)),
);

/**
 * Role → permission grants.
 *  - admin     → everything (`*`)
 *  - librarian → full circulation + catalog, read-only on users/reports
 *  - member    → read catalog, manage their own reservations
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[] | "*"> = {
  admin: "*",
  librarian: [
    "books:create",
    "books:read",
    "books:update",
    "books:delete",
    "copies:create",
    "copies:read",
    "copies:update",
    "copies:delete",
    "categories:create",
    "categories:read",
    "categories:update",
    "authors:create",
    "authors:read",
    "authors:update",
    "publishers:create",
    "publishers:read",
    "publishers:update",
    "members:create",
    "members:read",
    "members:update",
    "borrowings:create",
    "borrowings:read",
    "borrowings:update",
    "reservations:create",
    "reservations:read",
    "reservations:update",
    "reservations:delete",
    "fines:create",
    "fines:read",
    "fines:update",
    "reports:read",
    "settings:read",
  ],
  member: [
    "books:read",
    "categories:read",
    "authors:read",
    "publishers:read",
    "reservations:create",
    "reservations:read",
    "borrowings:read",
    "fines:read",
  ],
};

/** Does a role grant the given permission? */
export function can(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const grants = ROLE_PERMISSIONS[role];
  if (grants === "*") return true;
  return grants.includes(permission);
}

/** Convenience: does the role have ANY of the given permissions? */
export function canAny(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Convenience: does the role have ALL of the given permissions? */
export function canAll(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  librarian: "Librarian",
  member: "Member",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full access to every part of the system, including settings and users.",
  librarian: "Manages the catalog, circulation, members, and fines.",
  member: "Browses the catalog and manages their own reservations.",
};
