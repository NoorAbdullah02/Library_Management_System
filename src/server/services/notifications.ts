import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { notifications, users } from "@/server/db/schema";
import type { NotificationType } from "@/server/db/schema";
import { sendEmail } from "./brevo";
import { emailTemplates } from "./email-templates";

/**
 * Unified notification dispatcher. Persists an in-app notification and,
 * when an email template is provided, also sends a transactional email.
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  email?: { subject: string; html: string; text?: string };
}) {
  const channel = params.email ? "email" : "in_app";

  const [row] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      channel,
      title: params.title,
      body: params.body,
      metadata: params.metadata,
      sentAt: params.email ? new Date() : null,
    })
    .returning();

  if (params.email) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, params.userId),
      columns: { email: true, name: true },
    });
    if (user?.email) {
      await sendEmail({
        to: [{ email: user.email, name: user.name ?? undefined }],
        subject: params.email.subject,
        htmlContent: params.email.html,
        textContent: params.email.text,
        tags: [params.type],
      });
    }
  }

  return row;
}

/** Convenience wrappers for the common library lifecycle events. */
export const notifications_ = {
  welcome: (userId: string, name: string) => {
    const t = emailTemplates.welcome({ name });
    return notify({
      userId,
      type: "welcome",
      title: "Welcome to Lumina",
      body: "Your library account is ready.",
      email: { subject: t.subject, html: t.html, text: t.text },
    });
  },
  reservationReady: (
    userId: string,
    name: string,
    title: string,
    expiresAt: string,
  ) => {
    const t = emailTemplates.reservationReady({ name, title, expiresAt });
    return notify({
      userId,
      type: "reservation_ready",
      title: "Reservation ready for pickup",
      body: `"${title}" is ready to collect.`,
      email: { subject: t.subject, html: t.html, text: t.text },
    });
  },
};

export async function markNotificationRead(id: string) {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}
