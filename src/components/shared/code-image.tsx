"use client";

import * as React from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

/** Renders a QR code from any text payload as an inline data-URL image. */
export function QRImage({
  value,
  size = 128,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#1b1b22", light: "#ffffff" },
    })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(""));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={cn("bg-muted animate-pulse rounded-lg", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="QR code"
      width={size}
      height={size}
      className={cn("rounded-lg", className)}
    />
  );
}

/** Renders a Code-128 barcode SVG from a value using bwip-js (browser build). */
export function BarcodeImage({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [svg, setSvg] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    import("bwip-js")
      .then(async (mod) => {
        type SvgFn = (opts: Record<string, unknown>) => string;
        const m = mod as unknown as {
          toSVG?: SvgFn;
          default?: { toSVG?: SvgFn };
        };
        const toSVG = m.toSVG ?? m.default?.toSVG;
        if (!toSVG) return;
        const out = toSVG({
          bcid: "code128",
          text: value,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: "center",
        });
        if (active) setSvg(out);
      })
      .catch(() => active && setSvg(""));
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div
      className={cn("[&_svg]:h-16 [&_svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
