import { env } from './env';
import { AppError } from '../middleware/errorHandler.middleware';

export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith('re_');
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new AppError('EMAIL_NOT_CONFIGURED', 'Email sending is not configured.', 503);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject: `${code} is your BuildMart login code`,
      text: `Your BuildMart verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
      html: `<p>Your BuildMart verification code is:</p>
<p style="font-size:28px;letter-spacing:4px;font-weight:700">${code}</p>
<p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
    }),
  });

  if (res.ok) return;

  const text = await res.text();
  let message = 'Could not send the email code. Try again in a minute.';
  try {
    const json = JSON.parse(text) as { message?: string; name?: string };
    const raw = (json.message ?? '').toLowerCase();
    if (raw.includes('own email') || raw.includes('testing emails') || raw.includes('verify a domain')) {
      message =
        'Free Resend can only email the inbox you signed up with. Use that Gmail, or add a domain in Resend to send to any address.';
    } else if (json.message) {
      message = json.message;
    }
  } catch {
    /* keep default */
  }
  throw new AppError('EMAIL_SEND_FAILED', message, 400);
}
