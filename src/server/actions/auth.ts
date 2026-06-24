"use server";

import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/server/db";
import { users, members, verificationTokens } from "@/server/db/schema";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/password";
import { generateMembershipNumber } from "@/lib/codes";
import { notifications_ } from "@/server/services/notifications";
import { sendEmail } from "@/server/services/brevo";
import { emailTemplates } from "@/server/services/email-templates";
import { recordActivity } from "@/server/services/audit";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/utils";

const fail = (error: string): ActionResult => ({ success: false, error });

/** Public self-registration → creates a member account. */
export async function registerUser(raw: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { name, email, password } = parsed.data;

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existing) return fail("An account with that email already exists.");

    const passwordHash = await hashPassword(password);
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: "member",
        })
        .returning({ id: users.id });
      await tx.insert(members).values({
        userId: user!.id,
        membershipNumber: generateMembershipNumber(),
        membershipType: "public",
      });
      return user!.id;
    });

    await notifications_.welcome(result, name);
    await recordActivity({
      userId: result,
      type: "auth",
      description: `${name} created an account`,
    });

    return {
      success: true,
      data: null,
      message: "Account created! You can now sign in.",
    };
  } catch (err) {
    console.error("[registerUser]", err);
    return fail("Could not create your account. Please try again.");
  }
}

/** Issue a password-reset token and email it (always returns success to avoid user enumeration). */
export async function requestPasswordReset(raw: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return fail("Enter a valid email.");
  const { email } = parsed.data;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (user) {
      const token = nanoid(40);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await db
        .insert(verificationTokens)
        .values({ identifier: email.toLowerCase(), token, expires });

      const url = `${env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      const tpl = emailTemplates.passwordReset({ name: user.name ?? "there", url });
      await sendEmail({
        to: [{ email: user.email, name: user.name ?? undefined }],
        subject: tpl.subject,
        htmlContent: tpl.html,
        textContent: tpl.text,
        tags: ["password_reset"],
      });
    }
    return {
      success: true,
      data: null,
      message: "If that email exists, a reset link is on its way.",
    };
  } catch (err) {
    console.error("[requestPasswordReset]", err);
    return fail("Something went wrong. Please try again.");
  }
}

export async function resetPassword(raw: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { token, password } = parsed.data;

  try {
    const record = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, token),
    });
    if (!record || record.expires < new Date()) {
      return fail("This reset link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, record.identifier));

    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, record.identifier),
          eq(verificationTokens.token, token),
        ),
      );

    return { success: true, data: null, message: "Password updated. Please sign in." };
  } catch (err) {
    console.error("[resetPassword]", err);
    return fail("Could not reset your password.");
  }
}
