"use client";

import { useEffect, useState } from "react";

/** True after first client render — guards against SSR/theme hydration flashes. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
