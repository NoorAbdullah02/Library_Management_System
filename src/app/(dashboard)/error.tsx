"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <span className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-xl">
            <AlertTriangle className="size-6" />
          </span>
          <CardTitle className="font-serif text-2xl tracking-tight">
            Something went wrong
          </CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
