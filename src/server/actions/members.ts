"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";

import { db } from "@/server/db";
import { members, users } from "@/server/db/schema";
import { memberSchema, updateMemberSchema } from "@/lib/validations/member";
import { generateMembershipNumber } from "@/lib/codes";
import { hashPassword } from "@/lib/password";
import { assertPermission, AuthorizationError } from "@/server/auth/guards";
import { recordAudit, recordActivity } from "@/server/services/audit";
import { notifications_ } from "@/server/services/notifications";
import type { ActionResult } from "@/lib/utils";

const fail = (error: string): ActionResult => ({ success: false, error });
const tempPassword = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789",
  12,
);

export async function createMember(
  raw: unknown,
): Promise<ActionResult<{ id: string; membershipNumber: string }>> {
  let actor;
  try {
    actor = await assertPermission("members:create");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const input = parsed.data;

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });
    if (existing) return fail("A user with that email already exists.");

    const passwordHash = await hashPassword(input.password || tempPassword());
    const membershipNumber = generateMembershipNumber();

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || null,
          passwordHash,
          role: "member",
        })
        .returning({ id: users.id });

      const [member] = await tx
        .insert(members)
        .values({
          userId: user!.id,
          membershipNumber,
          membershipType: input.membershipType,
          address: input.address || null,
          maxBorrowLimit: input.maxBorrowLimit,
          expiresAt: input.expiresAt ?? null,
        })
        .returning({ id: members.id });

      return { userId: user!.id, memberId: member!.id };
    });

    await notifications_.welcome(result.userId, input.name);
    await recordActivity({
      userId: actor.id,
      type: "member",
      description: `Registered new member ${input.name}`,
    });
    await recordAudit({
      userId: actor.id,
      action: "member.created",
      entity: "member",
      entityId: result.memberId,
      after: { name: input.name, email: input.email },
    });

    revalidatePath("/members");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: { id: result.memberId, membershipNumber },
      message: "Member created and welcomed.",
    };
  } catch (err) {
    console.error("[createMember]", err);
    return fail("Could not create the member.");
  }
}

export async function updateMember(raw: unknown): Promise<ActionResult> {
  try {
    await assertPermission("members:update");
  } catch (e) {
    return fail(e instanceof AuthorizationError ? e.message : "Unauthorized");
  }

  const parsed = updateMemberSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid member details.");
  const { id, name, email, phone, ...memberFields } = parsed.data;

  try {
    const member = await db.query.members.findFirst({
      where: eq(members.id, id),
    });
    if (!member) return fail("Member not found.");

    if (name || email || phone) {
      await db
        .update(users)
        .set({
          ...(name ? { name } : {}),
          ...(email ? { email: email.toLowerCase() } : {}),
          ...(phone !== undefined ? { phone: phone || null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));
    }

    await db
      .update(members)
      .set({
        membershipType: memberFields.membershipType,
        status: memberFields.status,
        address: memberFields.address,
        maxBorrowLimit: memberFields.maxBorrowLimit,
        expiresAt: memberFields.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id));

    await recordAudit({
      action: "member.updated",
      entity: "member",
      entityId: id,
    });
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { success: true, data: null, message: "Member updated." };
  } catch (err) {
    console.error("[updateMember]", err);
    return fail("Could not update the member.");
  }
}
