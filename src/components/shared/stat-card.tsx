"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: (n: number) => string;
  hint?: string;
  trend?: { value: number; positive?: boolean };
  accent?: "gold" | "teal" | "violet" | "rose";
  className?: string;
};

const accents: Record<NonNullable<StatCardProps["accent"]>, string> = {
  gold: "from-chart-1/25",
  teal: "from-chart-2/25",
  violet: "from-chart-3/25",
  rose: "from-chart-4/25",
};

/** Count-up + cursor-reactive 3D tilt KPI card. */
export function StatCard({
  label,
  value,
  icon: Icon,
  format = (n) => Math.round(n).toLocaleString(),
  hint,
  trend,
  accent = "gold",
  className,
}: StatCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  // Count-up
  const count = useSpring(0, { stiffness: 60, damping: 18 });
  const display = useTransform(count, (v) => format(v));
  React.useEffect(() => {
    if (inView) count.set(value);
  }, [inView, value, count]);

  // 3D tilt
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), {
    stiffness: 150,
    damping: 15,
  });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-6, 6]), {
    stiffness: 150,
    damping: 15,
  });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("[transform-style:preserve-3d]", className)}
    >
      <Card className="relative overflow-hidden p-5">
        <div
          className={cn(
            "pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-gradient-to-br to-transparent blur-2xl",
            accents[accent],
          )}
        />
        <div className="flex items-start justify-between">
          <span className="text-muted-foreground text-sm font-medium">
            {label}
          </span>
          <span className="bg-muted text-foreground/80 flex size-9 items-center justify-center rounded-lg">
            <Icon className="size-[1.1rem]" />
          </span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <motion.span className="font-serif text-3xl tracking-tight tabular-nums">
            {display}
          </motion.span>
          {trend ? (
            <span
              className={cn(
                "mb-1 text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive",
              )}
            >
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        ) : null}
      </Card>
    </motion.div>
  );
}
