import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNow,
  differenceInCalendarDays,
  isAfter,
} from "date-fns";

/** Tailwind-aware className merge — the shadcn/ui convention. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Currency formatter (USD by default). */
export function formatCurrency(amount: number | string, currency = "USD") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Compact number formatter — 1.2K, 3.4M. */
export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined, pattern = "MMM d, yyyy") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, pattern);
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Days a loan is overdue (0 if not yet due). */
export function daysOverdue(dueAt: Date | string, asOf: Date = new Date()) {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  if (!isAfter(asOf, due)) return 0;
  return Math.max(0, differenceInCalendarDays(asOf, due));
}

/** Deterministic gradient avatar fallback seed. */
export function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Format an ISBN-13 with hyphens for display. */
export function formatISBN(isbn?: string | null) {
  if (!isbn) return "—";
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length === 13) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  return isbn;
}

export function truncate(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Pause helper (used by skeleton/demo loaders). */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ActionFailure = {
  success: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | ActionFailure;

/** Narrowly-typed failure helper — assignable to any ActionResult<T>. */
export function actionError(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionFailure {
  return { success: false, error, fieldErrors };
}
