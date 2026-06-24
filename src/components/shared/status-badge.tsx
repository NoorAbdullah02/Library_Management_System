import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  // Generic states reused across borrowings, reservations, fines, members, copies
  active: "bg-success/15 text-success border-success/20",
  available: "bg-success/15 text-success border-success/20",
  paid: "bg-success/15 text-success border-success/20",
  returned: "bg-muted text-muted-foreground border-transparent",
  fulfilled: "bg-muted text-muted-foreground border-transparent",
  cancelled: "bg-muted text-muted-foreground border-transparent",
  expired: "bg-muted text-muted-foreground border-transparent",
  pending: "bg-warning/15 text-warning border-warning/25",
  partial: "bg-warning/15 text-warning border-warning/25",
  reserved: "bg-accent/15 text-accent border-accent/25",
  ready: "bg-accent/15 text-accent border-accent/25",
  borrowed: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  overdue: "bg-destructive/15 text-destructive border-destructive/25",
  suspended: "bg-destructive/15 text-destructive border-destructive/25",
  lost: "bg-destructive/15 text-destructive border-destructive/25",
  damaged: "bg-warning/15 text-warning border-warning/25",
  maintenance: "bg-warning/15 text-warning border-warning/25",
  waived: "bg-chart-3/15 text-chart-3 border-chart-3/25",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", STYLES[status] ?? "", className)}
    >
      {status}
    </Badge>
  );
}
