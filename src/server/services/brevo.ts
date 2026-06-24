import "server-only";
import { env, features } from "@/lib/env";

/**
 * Brevo (Sendinblue) transactional email via REST.
 *
 * No SDK dependency — we call the documented v3 endpoint directly. When
 * `BREVO_API_KEY` is not configured, sends are logged to the console instead
 * of failing, so local development and CI work without credentials.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type SendEmailParams = {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
};

export type SendEmailResult =
  | { sent: true; messageId?: string }
  | { sent: false; skipped: true }
  | { sent: false; error: string };

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!features.email) {
    console.info(
      `[brevo] (dry-run) email "${params.subject}" → ${params.to
        .map((t) => t.email)
        .join(", ")}`,
    );
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
        tags: params.tags,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`[brevo] send failed (${res.status}): ${detail}`);
      return { sent: false, error: `Brevo responded ${res.status}` };
    }

    const data = (await res.json()) as { messageId?: string };
    return { sent: true, messageId: data.messageId };
  } catch (err) {
    console.error("[brevo] network error", err);
    return { sent: false, error: "Failed to reach Brevo" };
  }
}
