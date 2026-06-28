"use client";

import * as React from "react";
import { QrCode } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { QRImage, BarcodeImage } from "@/components/shared/code-image";

type Copy = {
  id: string;
  barcode: string;
  status: string;
  location: string | null;
  qrCode: string | null;
};

export function BookCopiesPanel({ copies }: { copies: Copy[] }) {
  if (!copies.length) {
    return (
      <p className="text-muted-foreground text-sm">No physical copies yet.</p>
    );
  }
  return (
    <div className="divide-border divide-y">
      {copies.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-mono text-sm">{c.barcode}</p>
            <p className="text-muted-foreground truncate text-xs">
              {c.location ?? "Unshelved"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <QrCode className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-mono text-base">
                    {c.barcode}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-5 py-2">
                  <QRImage
                    value={c.qrCode ?? c.barcode}
                    size={176}
                  />
                  <div className="w-full">
                    <BarcodeImage value={c.barcode} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}
    </div>
  );
}
