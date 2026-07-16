import 'server-only';
import { Resend } from 'resend';

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendAuthEmail({ to, url, kind }: { to: string; url: string; kind: 'magic-link' | 'password-reset' }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Email delivery is not configured: RESEND_API_KEY and AUTH_EMAIL_FROM are required');

  const isMagic = kind === 'magic-link';
  const subject = isMagic ? 'Your sign-in link for WAI Design' : 'Reset your WAI Design password';
  const eyebrow = isMagic ? 'PASSWORDLESS SIGN IN' : 'ACCOUNT RECOVERY';
  const heading = isMagic ? 'Your studio is one click away.' : 'Choose a new password.';
  const copy = isMagic
    ? 'Use this private, single-use link to sign in. It expires in five minutes.'
    : 'Use this private link to create a new password. All other sessions will be signed out.';
  const action = isMagic ? 'Open WAI Design' : 'Reset password';
  const safeUrl = escapeHtml(url);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `<!doctype html><html><body style="margin:0;background:#edf2f4;color:#152229;font-family:Inter,Arial,sans-serif"><div style="padding:48px 18px"><div style="max-width:560px;margin:auto;padding:34px;border:1px solid rgba(255,255,255,.8);border-radius:28px;background:rgba(255,255,255,.88);box-shadow:0 24px 70px -42px rgba(21,34,41,.45)"><div style="display:inline-grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#152229;color:white;font-family:Georgia,serif;font-size:21px">W</div><p style="margin:28px 0 8px;color:#6d5dfc;font-size:11px;font-weight:800;letter-spacing:.16em">${eyebrow}</p><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:38px;line-height:1.05;font-weight:400;letter-spacing:-.035em">${heading}</h1><p style="margin:0 0 26px;color:#617078;font-size:15px;line-height:1.6">${copy}</p><a href="${safeUrl}" style="display:inline-block;padding:14px 20px;border-radius:14px;background:#152229;color:#fff;text-decoration:none;font-size:14px;font-weight:700">${action} &nbsp;↗</a><p style="margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(102,121,130,.16);color:#8d9aa0;font-size:12px;line-height:1.55">If you did not request this email, you can safely ignore it. Never forward this link.</p></div></div></body></html>`,
    text: `${heading}\n\n${copy}\n\n${url}\n\nIf you did not request this email, ignore it.`,
  });
  if (error) throw new Error(`Resend rejected the email: ${error.message}`);
}

