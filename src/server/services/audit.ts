import "server-only";
import { headers } from "next/headers";

import { db } from "@/server/db";
import { auditLogs, activityLogs } from "@/server/db/schema";

type AuditInput = {
  userId?: string | null;
  action: string; // e.g. "book.created"
  entity: string; // e.g. "book"
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/** Write an immutable audit record (best-effort; never throws to caller). */
export async function recordAudit(input: AuditInput) {
  try {
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null;
      ua = h.get("user-agent");
    } catch {
      // headers() unavailable outside a request scope (e.g. seed/cron) — ignore.
    }

    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ipAddress: ip,
      userAgent: ua,
    });
  } catch (err) {
    console.error("[audit] failed to record", err);
  }
}

/** Append a user-facing activity-timeline entry. */
export async function recordActivity(input: {
  userId?: string | null;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(activityLogs).values({
      userId: input.userId ?? null,
      type: input.type,
      description: input.description,
      metadata: input.metadata,
    });
  } catch (err) {
    console.error("[activity] failed to record", err);
  }
}
