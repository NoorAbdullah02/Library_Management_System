import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <div className="bg-muted/60 text-muted-foreground ring-border relative mb-4 flex size-14 items-center justify-center rounded-2xl ring-1">
        <Icon className="size-6" />
        <span className="bg-primary/15 absolute inset-0 -z-10 rounded-2xl blur-xl" />
      </div>
      <h3 className="font-serif text-lg">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
