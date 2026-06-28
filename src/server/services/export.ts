import "server-only";
import * as XLSX from "xlsx";

/**
 * Tabular export helpers. Used by the `/api/export/[resource]` route handlers
 * to stream CSV / XLSX downloads. PDF reports are generated separately via the
 * print-optimized report routes.
 */

export type Column<T> = {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => string | number | null | undefined;
};

function cellValue<T>(row: T, col: Column<T>) {
  const raw = col.accessor
    ? col.accessor(row)
    : (row as Record<string, unknown>)[col.key as string];
  return raw ?? "";
}

export function toCSV<T>(rows: T[], columns: Column<T>[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(cellValue(row, c))).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function toXLSX<T>(
  rows: T[],
  columns: Column<T>[],
  sheetName = "Export",
): ArrayBuffer {
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) obj[col.header] = cellValue(row, col);
    return obj;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  // Return an ArrayBuffer (a valid `BodyInit` via `BufferSource`) rather than a
  // Node Buffer, whose generic `Buffer<ArrayBufferLike>` type is not assignable
  // to `BodyInit`.
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
}

export const exportContentTypes = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;
