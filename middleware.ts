import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses only the base config (no DB / bcrypt imports).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except static assets, image optimizer, and api/auth.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
