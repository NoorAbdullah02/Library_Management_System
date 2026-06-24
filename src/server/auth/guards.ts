import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { can, type Permission } from "@/lib/rbac";
import type { UserRole } from "@/server/db/schema";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
  mfaEnabled?: boolean;
};

/** Returns the current user or `null` (does not redirect). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

/** Requires an authenticated user; redirects to /login otherwise. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Requires one of the given roles; redirects to /dashboard if not allowed. */
export async function requireRole(
  ...roles: UserRole[]
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/** Requires a specific RBAC permission; redirects to /dashboard if denied. */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!can(user.role, permission)) redirect("/dashboard");
  return user;
}

/** Non-redirecting authorization check for use inside server actions. */
export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("You must be signed in.");
  if (!can(user.role, permission)) throw new AuthorizationError();
  return user;
}
