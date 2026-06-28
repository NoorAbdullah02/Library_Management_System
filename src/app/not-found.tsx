import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <p className="text-chart-1 font-serif text-7xl tracking-tight sm:text-8xl">
          404
        </p>
        <h1 className="font-serif text-2xl tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          The page you are looking for has been moved, removed, or never existed
          in this collection.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Return home</Link>
      </Button>
    </div>
  );
}
