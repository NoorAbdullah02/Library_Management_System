"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// three.js must stay client-only — ssr:false requires a client component.
const LibraryScene = dynamic(() => import("./library-scene"), {
  ssr: false,
  loading: () => null,
});

export function HeroCanvas() {
  return (
    <div className="absolute inset-0 -z-0">
      <React.Suspense fallback={null}>
        <LibraryScene />
      </React.Suspense>
    </div>
  );
}
