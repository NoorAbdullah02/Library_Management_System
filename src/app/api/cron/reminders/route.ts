import { markOverdue } from "@/server/queries/circulation";

export const dynamic = "force-dynamic";

/**
 * Reminder / overdue sweep.
 *
 * A Vercel Cron job hits this endpoint daily to flip any loans whose due date
 * has passed from `active` to `overdue`, keeping circulation status accurate.
 */
export async function GET() {
  const n = await markOverdue();
  return Response.json({ ok: true, markedOverdue: n });
}
