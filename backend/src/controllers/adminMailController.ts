import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { sendMail, isSmtpConfigured } from '../lib/mail/mailSender.js';
import { getOrCreateSystemSettings, DEFAULT_GLOBAL_TITLE } from '../lib/systemSettings.js';
import { buildNotificationEmailHtml } from '../lib/mail/mailSender.js';

export async function sendAdminTestEmail(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const to = req.user?.email;
  if (!to) {
    res.status(400).json({ error: 'Your account has no email address' });
    return;
  }

  if (!(await isSmtpConfigured())) {
    res.status(400).json({ error: 'SMTP is not fully configured' });
    return;
  }

  const settings = await getOrCreateSystemSettings();
  const appTitle = settings.globalTitle ?? DEFAULT_GLOBAL_TITLE;
  const subject = `${appTitle} SMTP test`;
  const text = 'If you received this message, SMTP delivery is working.';
  const html = buildNotificationEmailHtml({
    title: 'SMTP test successful',
    body: text,
    appTitle,
  });

  const sent = await sendMail({ to, subject, text, html });
  if (!sent) {
    res.status(500).json({ error: 'Failed to send test email' });
    return;
  }

  res.json({ ok: true, to });
}
