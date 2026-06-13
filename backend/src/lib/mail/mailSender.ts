import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getOrCreateSystemSettings } from '../systemSettings.js';

export interface MailSendInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  fromAddress: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const row = await getOrCreateSystemSettings();
  const host = row.smtpHost?.trim() ?? '';
  const fromAddress = row.smtpFromAddress?.trim() ?? '';
  if (!host || !fromAddress) return null;
  return {
    host,
    port: row.smtpPort ?? 587,
    user: row.smtpUser?.trim() ?? '',
    password: row.smtpPassword ?? '',
    secure: row.smtpSecure,
    fromAddress,
  };
}

export async function isSmtpConfigured(): Promise<boolean> {
  return (await getSmtpConfig()) !== null;
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey = '';

function buildConfigKey(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.user}:${config.secure}:${config.fromAddress}`;
}

async function getTransporter(): Promise<Transporter | null> {
  const config = await getSmtpConfig();
  if (!config) return null;
  const key = buildConfigKey(config);
  if (cachedTransporter && cachedConfigKey === key) {
    return cachedTransporter;
  }
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user
      ? {
          user: config.user,
          pass: config.password,
        }
      : undefined,
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

export function buildNotificationEmailHtml(input: {
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  appTitle?: string;
}): string {
  const appTitle = input.appTitle ?? 'Esiana';
  const body = input.body?.trim() ?? '';
  const link = input.linkUrl?.trim() ?? '';
  const cta = link
    ? `<p style="margin-top:24px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Open in ${escapeHtml(appTitle)}</a></p>`
    : '';
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 12px">${escapeHtml(input.title)}</h2>
${body ? `<p style="margin:0 0 16px">${escapeHtml(body)}</p>` : ''}
${cta}
<p style="margin-top:32px;font-size:12px;color:#666">Sent by ${escapeHtml(appTitle)}</p>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendMail(input: MailSendInput): Promise<boolean> {
  const config = await getSmtpConfig();
  const transporter = await getTransporter();
  if (!config || !transporter) return false;

  try {
    await transporter.sendMail({
      from: config.fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? undefined,
    });
    return true;
  } catch (error) {
    console.error('[mailSender] Failed to send email', {
      to: input.to,
      subject: input.subject,
      error,
    });
    return false;
  }
}

export function invalidateMailTransporterCache(): void {
  cachedTransporter = null;
  cachedConfigKey = '';
}
