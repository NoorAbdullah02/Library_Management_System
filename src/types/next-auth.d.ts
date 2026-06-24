import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/server/db/schema";

/**
 * Module augmentation so `session.user.role` / `.id` are strongly typed
 * everywhere Auth.js is consumed.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      mfaEnabled?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    mfaEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    mfaEnabled?: boolean;
  }
}
