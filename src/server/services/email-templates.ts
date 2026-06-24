import { env } from "@/lib/env";

/**
 * Branded transactional email templates. Each returns `{ subject, html, text }`.
 * Inline styles only (email clients ignore <style> + external CSS).
 */

const BRAND = "#caa24a"; // luminous gold
const INK = "#1b1b22";
const MUTED = "#6b6b76";

function shell(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <div style="text-align:center;margin-bottom:28px;">
        <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;">✦ Lumina</span>
        <div style="font-size:12px;color:${MUTED};letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Library Management</div>
      </div>
      <div style="background:#ffffff;border:1px solid #e7e3d9;border-radius:16px;padding:32px;">
        <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#33333b;">${bodyHtml}</div>
        ${
          cta
            ? `<div style="margin-top:28px;">
                 <a href="${cta.href}" style="display:inline-block;background:${BRAND};color:#1b1b22;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">${cta.label}</a>
               </div>`
            : ""
        }
      </div>
      <p style="font-size:12px;color:${MUTED};text-align:center;margin-top:24px;line-height:1.5;">
        You're receiving this because you have a Lumina account.<br/>
        © ${new Date().getFullYear()} Lumina Library.
      </p>
    </div>
  </body>
</html>`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const emailTemplates = {
  welcome: (p: { name: string }) => {
    const body = `Hi ${p.name},<br/><br/>Welcome to Lumina! Your library account is ready. You can now browse the catalog, reserve titles, and track your loans from your dashboard.`;
    const html = shell("Welcome to Lumina 📚", body, {
      label: "Open your dashboard",
      href: `${env.APP_URL}/dashboard`,
    });
    return { subject: "Welcome to Lumina", html, text: stripHtml(body) };
  },

  emailVerification: (p: { name: string; url: string }) => {
    const body = `Hi ${p.name},<br/><br/>Please confirm your email address to activate your Lumina account. This link expires in 24 hours.`;
    const html = shell("Verify your email", body, {
      label: "Verify email",
      href: p.url,
    });
    return { subject: "Verify your Lumina email", html, text: `${stripHtml(body)} ${p.url}` };
  },

  passwordReset: (p: { name: string; url: string }) => {
    const body = `Hi ${p.name},<br/><br/>We received a request to reset your password. Click below to choose a new one. If you didn't request this, you can safely ignore this email. The link expires in 1 hour.`;
    const html = shell("Reset your password", body, {
      label: "Reset password",
      href: p.url,
    });
    return { subject: "Reset your Lumina password", html, text: `${stripHtml(body)} ${p.url}` };
  },

  dueReminder: (p: { name: string; title: string; dueAt: string }) => {
    const body = `Hi ${p.name},<br/><br/>A friendly reminder that <strong>"${p.title}"</strong> is due on <strong>${p.dueAt}</strong>. Renew it from your dashboard if you need more time.`;
    const html = shell("Your book is due soon", body, {
      label: "Manage loans",
      href: `${env.APP_URL}/borrowings`,
    });
    return { subject: `Reminder: "${p.title}" is due soon`, html, text: stripHtml(body) };
  },

  overdue: (p: { name: string; title: string; days: number; fine: string }) => {
    const body = `Hi ${p.name},<br/><br/><strong>"${p.title}"</strong> is now <strong>${p.days} day(s) overdue</strong>. An accruing fine of <strong>${p.fine}</strong> applies. Please return or renew it as soon as possible.`;
    const html = shell("Overdue book", body, {
      label: "View fines",
      href: `${env.APP_URL}/fines`,
    });
    return { subject: `Overdue: "${p.title}"`, html, text: stripHtml(body) };
  },

  reservationReady: (p: { name: string; title: string; expiresAt: string }) => {
    const body = `Hi ${p.name},<br/><br/>Good news — <strong>"${p.title}"</strong> is now available for pickup! Please collect it before <strong>${p.expiresAt}</strong>, after which it returns to the queue.`;
    const html = shell("Your reservation is ready 🎉", body, {
      label: "View reservation",
      href: `${env.APP_URL}/reservations`,
    });
    return { subject: `Ready for pickup: "${p.title}"`, html, text: stripHtml(body) };
  },

  membershipExpiry: (p: { name: string; expiresAt: string }) => {
    const body = `Hi ${p.name},<br/><br/>Your Lumina membership expires on <strong>${p.expiresAt}</strong>. Renew now to keep borrowing without interruption.`;
    const html = shell("Membership expiring soon", body, {
      label: "Renew membership",
      href: `${env.APP_URL}/dashboard`,
    });
    return { subject: "Your Lumina membership is expiring", html, text: stripHtml(body) };
  },
};

export type EmailTemplateKey = keyof typeof emailTemplates;
