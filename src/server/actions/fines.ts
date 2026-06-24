"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { fines } from "@/server/db/schema";
import {
  fineSchema,
  payFineSchema,
  waiveFineSchema,
} from "@/lib/validations/circulation";
import { assertPermission, AuthorizationError } from "@/server/auth/guards";
import { recordAudit } from "@/server/services/audit";
import { actionError as fail } from "@/lib/utils";
import type { ActionResult } from "@/lib/utils";

export async function createFine(raw: unknown): Promise<ActionResult> {
  try {
    await assertPermission("fines:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }
  const parsed = fineSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid fine details.");
  const { memberId, borrowingId, amount, reason, description } = parsed.data;

  try {
    const [fine] = await db
      .insert(fines)
      .values({
        memberId,
        borrowingId: borrowingId || null,
        amount: amount.toFixed(2),
        reason,
        description: description || null,
      })
      .returning({ id: fines.id });
    await recordAudit({
      action: "fine.created",
      entity: "fine",
      entityId: fine!.id,
      after: { amount, reason },
    });
    revalidatePath("/fines");
    return { success: true, data: null, message: "Fine issued." };
  } catch {
    return fail("Could not create fine.");
  }
}

export async function payFine(raw: unknown): Promise<ActionResult> {
  try {
    await assertPermission("fines:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }
  const parsed = payFineSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid payment.");
  const { fineId, amount } = parsed.data;

  try {
    const fine = await db.query.fines.findFirst({
      where: eq(fines.id, fineId),
    });
    if (!fine) return fail("Fine not found.");

    const previouslyPaid = Number(fine.paidAmount ?? 0);
    const total = Number(fine.amount);
    const newPaid = Math.min(total, previouslyPaid + amount);
    const status = newPaid >= total ? "paid" : "partial";

    await db
      .update(fines)
      .set({
        paidAmount: newPaid.toFixed(2),
        status,
        paidAt: status === "paid" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(fines.id, fineId));

    await recordAudit({
      action: "fine.payment",
      entity: "fine",
      entityId: fineId,
      after: { paid: newPaid, status },
    });
    revalidatePath("/fines");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: null,
      message:
        status === "paid"
          ? "Fine paid in full."
          : `Partial payment recorded ($${newPaid.toFixed(2)} / $${total.toFixed(2)}).`,
    };
  } catch {
    return fail("Could not record payment.");
  }
}

export async function waiveFine(raw: unknown): Promise<ActionResult> {
  let actor;
  try {
    actor = await assertPermission("fines:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }
  const parsed = waiveFineSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid request.");
  const { fineId, reason } = parsed.data;

  try {
    await db
      .update(fines)
      .set({
        status: "waived",
        waivedById: actor.id,
        description: reason || "Waived by staff",
        updatedAt: new Date(),
      })
      .where(eq(fines.id, fineId));
    await recordAudit({
      userId: actor.id,
      action: "fine.waived",
      entity: "fine",
      entityId: fineId,
    });
    revalidatePath("/fines");
    return { success: true, data: null, message: "Fine waived." };
  } catch {
    return fail("Could not waive fine.");
  }
}
