/**
 * Email delivery (research R3): nodemailer over Mailtrap SMTP in development and
 * Amazon SES in production (ENV_EMAIL_TRANSPORT), with a transport injection
 * point so tests can capture messages instead of sending them. Four message
 * types: login link, create-account invitation, email-change verification,
 * old-address change notice (FR-002/013a/013d), and a poll invitation.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { AppConfig } from "../config.js";
import {
  createAccountMessage,
  emailChangeNoticeMessage,
  accountDeletedMessage,
  emailChangeVerificationMessage,
  loginLinkMessage,
  type EmailMessage
} from "./templates.js";

export class MailError extends Error {}

export type MessageType = "login-link" | "create-account" | "email-change-verification" | "email-change-notice" | "account-deleted" | "invitation";

let transporter: Transporter | null = null;
let fromAddress = "CrowdPoll <no-reply@mail.crowdpoll.vote>";
let sendTimeoutMs = 10_000;
let logoOrigin: string | undefined;

export function createTransportFor(config: AppConfig, sesClient?: unknown): Transporter {
  if (config.emailTransport === "ses" && config.ses) {
    const { region, accessKeyId, secretAccessKey } = config.ses;
    const client = sesClient ?? new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
    console.log(`[mailer] SES transport ready (${region})`);
    return nodemailer.createTransport({ SES: { sesClient: client, SendEmailCommand } } as Parameters<
      typeof nodemailer.createTransport
    >[0]);
  }
  if (config.smtp.user && config.smtp.pass) {
    console.log(`[mailer] SMTP transport ready (${config.smtp.host}:${config.smtp.port})`);
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: { user: config.smtp.user, pass: config.smtp.pass }
    });
  }
  // No SMTP credentials: log messages as JSON instead of sending.
  console.warn("[mailer] ENV_SMTP_USER/ENV_SMTP_PASS not set — emails are logged to the console, not delivered.");
  return nodemailer.createTransport({ jsonTransport: true });
}

export function initMailer(config: AppConfig): void {
  fromAddress = config.emailFrom;
  sendTimeoutMs = config.emailSendTimeoutMs;
  logoOrigin = config.emailAssetOrigin;
  transporter = createTransportFor(config);
}

/** Test injection point (research R9): replace the transport entirely. */
export function setTransport(t: Transporter): void {
  transporter = t;
}

export function maskAddress(address: string): string {
  const at = address.lastIndexOf("@");
  if (at <= 0) return "•••";
  return `${address[0]}•••${address.slice(at)}`;
}

async function send(type: MessageType, to: string, subject: string, text: string, html: string): Promise<void> {
  if (!transporter) {
    throw new MailError("Mailer not initialized — call initMailer() first.");
  }
  const recipient = maskAddress(to);
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      console.log(`[mailer] Timed out sending ${type} to ${recipient}`);
      reject(new MailError("Could not send email"));
    }, sendTimeoutMs);
  });
  try {
    const info = await Promise.race([transporter.sendMail({ from: fromAddress, to, subject, text, html }), timeout]);
    console.log(`[mailer] Sent ${type} to ${recipient} (message id ${(info as { messageId?: string }).messageId})`);
    if ((info as { message?: unknown }).message) {
      // jsonTransport fallback: surface the message so dev flows are observable.
      console.log(`[mailer] ${String((info as { message: unknown }).message)}`);
    }
  } catch (err) {
    if (err instanceof MailError) throw err;
    console.error(`[mailer] Failed to send ${type} to ${recipient}:`, err);
    throw new MailError("Could not send email");
  } finally {
    clearTimeout(timer);
  }
}

export async function sendLoginLink(to: string, url: string): Promise<void> {
  const { subject, text, html } = loginLinkMessage(url, logoOrigin);
  await send("login-link", to, subject, text, html);
}

export async function sendCreateAccountInvitation(to: string, createAccountUrl: string): Promise<void> {
  const { subject, text, html } = createAccountMessage(createAccountUrl, logoOrigin);
  await send("create-account", to, subject, text, html);
}

export async function sendEmailChangeVerification(to: string, url: string): Promise<void> {
  const { subject, text, html } = emailChangeVerificationMessage(url, logoOrigin);
  await send("email-change-verification", to, subject, text, html);
}

/** Informational only — must contain no action links (FR-013d). */
export async function sendAccountDeleted(origin: string, to: string): Promise<void> {
  const { subject, text, html } = accountDeletedMessage(logoOrigin ?? origin);
  await send("account-deleted", to, subject, text, html);
}

export async function sendEmailChangeNotice(origin: string, to: string, newEmail: string): Promise<void> {
  const { subject, text, html } = emailChangeNoticeMessage(logoOrigin ?? origin, newEmail);
  await send("email-change-notice", to, subject, text, html);
}

export async function sendInvitation(to: string, message: EmailMessage): Promise<void> {
  await send("invitation", to, message.subject, message.text, message.html);
}

export function emailLogoOrigin(): string | undefined {
  return logoOrigin;
}
