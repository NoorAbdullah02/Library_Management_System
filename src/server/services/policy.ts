import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { env } from "@/lib/env";

export type LibraryPolicy = {
  loanDays: number;
  finePerDay: number;
  maxBorrowLimit: number;
  maxRenewals: number;
  reservationHoldDays: number;
};

const DEFAULTS: LibraryPolicy = {
  loanDays: env.DEFAULT_LOAN_DAYS,
  finePerDay: env.DEFAULT_FINE_PER_DAY,
  maxBorrowLimit: env.DEFAULT_MAX_BORROW_LIMIT,
  maxRenewals: 2,
  reservationHoldDays: 3,
};

const POLICY_KEY = "library_policy";

/** Reads the policy row, falling back to env-derived defaults. */
export async function getPolicy(): Promise<LibraryPolicy> {
  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, POLICY_KEY),
    });
    if (row?.value && typeof row.value === "object") {
      return { ...DEFAULTS, ...(row.value as Partial<LibraryPolicy>) };
    }
  } catch {
    // settings table may not exist yet (pre-migration) — use defaults.
  }
  return DEFAULTS;
}

export async function savePolicy(
  patch: Partial<LibraryPolicy>,
  updatedById?: string,
) {
  const current = await getPolicy();
  const next = { ...current, ...patch };
  await db
    .insert(settings)
    .values({ key: POLICY_KEY, value: next, updatedById, description: "Library circulation policy" })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedById, updatedAt: new Date() },
    });
  return next;
}
