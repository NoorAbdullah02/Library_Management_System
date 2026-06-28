"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { NAV_ITEMS } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema";

/**
 * macOS-style magnifying dock. Hidden on large screens (sidebar takes over),
 * floats at the bottom on tablet/mobile. Icons scale based on cursor proximity.
 */
export function FloatingDock({ role }: { role: UserRole }) {
  const mouseX = useMotionValue(Infinity);
  const pathname = usePathname();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission),
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center lg:hidden">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="glass-strong pointer-events-auto flex items-end gap-2 rounded-2xl px-3 py-2.5 shadow-2xl"
      >
        {items.map((item) => (
          <DockIcon
            key={item.href}
            mouseX={mouseX}
            href={item.href}
            label={item.title}
            active={
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            }
          >
            <item.icon className="size-full p-1" />
          </DockIcon>
        ))}
      </motion.div>
    </div>
  );
}

function DockIcon({
  mouseX,
  href,
  label,
  active,
  children,
}: {
  mouseX: MotionValue<number>;
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLAnchorElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeT = useTransform(distance, [-120, 0, 120], [40, 64, 40]);
  const size = useSpring(sizeT, { stiffness: 320, damping: 18 });

  return (
    <Link ref={ref} href={href} aria-label={label} className="group relative">
      <motion.div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted/70 text-foreground/80",
        )}
      >
        {children}
      </motion.div>
      <span className="bg-popover pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}
