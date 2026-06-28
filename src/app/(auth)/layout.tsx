import Link from "next/link";
import { Sparkles, BookOpen, Quote } from "lucide-react";

import { APP_NAME } from "@/lib/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-grain grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="aurora absolute inset-0 -z-10 opacity-80" />
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </span>
          <span className="font-serif text-2xl">{APP_NAME}</span>
        </Link>

        <div className="glass-strong max-w-md rounded-3xl p-8">
          <Quote className="text-primary size-8" />
          <p className="mt-4 font-serif text-2xl leading-snug">
            “A library is not a luxury but one of the necessities of life.”
          </p>
          <p className="text-muted-foreground mt-3 text-sm">— Henry Ward Beecher</p>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <BookOpen className="size-4" />
          The library OS for the modern age.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
