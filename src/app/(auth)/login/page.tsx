import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your Lumina account to continue.
        </p>
      </div>

      <LoginForm />

      <p className="text-muted-foreground text-center text-sm">
        New to Lumina?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
