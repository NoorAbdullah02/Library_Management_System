"use client";

import { Download, Printer, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RESOURCES = ["books", "members", "borrowings", "fines"] as const;

export function ExportButtons() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Print
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Download className="size-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {RESOURCES.map((resource) => (
            <div key={resource}>
              <DropdownMenuLabel className="capitalize">
                {resource}
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={`/api/export/${resource}?format=csv`}>
                  <FileText className="size-4" /> CSV
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/export/${resource}?format=xlsx`}>
                  <FileSpreadsheet className="size-4" /> Excel
                </a>
              </DropdownMenuItem>
              {resource !== "fines" && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
