import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration.
 *
 * This file must NOT import the database, bcrypt, or any Node-only module,
 * because it is loaded by `middleware.ts` which runs on the Edge runtime.
 * The Credentials provider (which needs the DB) lives in `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  trustHost: true,
  providers: [], // augmented in auth.ts
  callbacks: {
    /**
     * Route protection used by the middleware. Returning `false` for a
     * protected route triggers a redirect to the sign-in page.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/books") ||
        nextUrl.pathname.startsWith("/members") ||
        nextUrl.pathname.startsWith("/borrowings") ||
        nextUrl.pathname.startsWith("/reservations") ||
        nextUrl.pathname.startsWith("/fines") ||
        nextUrl.pathname.startsWith("/analytics") ||
        nextUrl.pathname.startsWith("/settings");

      if (isOnDashboard) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.mfaEnabled = user.mfaEnabled;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.mfaEnabled = token.mfaEnabled;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
