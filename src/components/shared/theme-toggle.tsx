"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative overflow-hidden"
    >
      {mounted ? (
        <>
          <Sun
            className={`size-[1.15rem] transition-all duration-500 ${isDark ? "scale-0 -rotate-90" : "scale-100 rotate-0"}`}
          />
          <Moon
            className={`absolute size-[1.15rem] transition-all duration-500 ${isDark ? "scale-100 rotate-0" : "scale-0 rotate-90"}`}
          />
        </>
      ) : (
        <Sun className="size-[1.15rem]" />
      )}
    </Button>
  );
}
