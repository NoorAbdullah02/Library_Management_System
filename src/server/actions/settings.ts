"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { savePolicy } from "@/server/services/policy";
import { assertPermission, AuthorizationError } from "@/server/auth/guards";
import { recordAudit } from "@/server/services/audit";
import { actionError as fail } from "@/lib/utils";
import type { ActionResult } from "@/lib/utils";

const policySchema = z.object({
  loanDays: z.coerce.number().int().min(1).max(180),
  finePerDay: z.coerce.number().min(0).max(1000),
  maxBorrowLimit: z.coerce.number().int().min(1).max(100),
  maxRenewals: z.coerce.number().int().min(0).max(20),
  reservationHoldDays: z.coerce.number().int().min(1).max(60),
});

export async function updatePolicy(raw: unknown): Promise<ActionResult> {
  let actor;
  try {
    actor = await assertPermission("settings:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = policySchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Please check the policy values.", parsed.error.flatten()
      .fieldErrors as Record<string, string[]>);
  }

  try {
    await savePolicy(parsed.data, actor.id);
    await recordAudit({
      userId: actor.id,
      action: "settings.policy_updated",
      entity: "settings",
      after: parsed.data,
    });
    revalidatePath("/settings");
    return { success: true, data: null, message: "Policy saved." };
  } catch {
    return fail("Could not save settings.");
  }
}
