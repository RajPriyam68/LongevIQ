import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;
const SMTP_RETRY_DELAY_MS = 500;
const SMTP_MAX_ATTEMPTS = 2;

const DEFAULT_EMAIL_FROM = 'LongevIQ <no-reply@longeviq.dev>';

const SMTP_TRANSIENT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private readonly transporter: Transporter | null;
  private readonly smtpConfigured: boolean;

  constructor() {
    const host = env.SMTP_HOST?.trim() || undefined;
    this.smtpConfigured = Boolean(host);
    if (!host) {
      this.transporter = null;
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      // SMTP_PORT is optional; when omitted, fall back to the conventional port
      // implied by SMTP_SECURE (465 for implicit TLS, 587 for STARTTLS) so real
      // relays work with the minimum set of variables.
      port: env.SMTP_PORT ?? (env.SMTP_SECURE ? 465 : 587),
      secure: env.SMTP_SECURE,
      // A wedged or restarting SMTP server must fail fast instead of
      // holding the awaited send open for nodemailer's multi-minute
      // defaults, which otherwise surfaces as delayed/missing emails.
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      if (env.NODE_ENV === 'production') {
        // Never report success for an email that cannot be delivered. Callers
        // map this into a clear API error so a broken SMTP setup cannot
        // silently swallow registration/verification emails.
        logger.error(
          { to: input.to },
          'SMTP is not configured; email not delivered. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
        );
        throw new Error('SMTP is not configured.');
      }
      this.logInDevelopment(input);
      return;
    }

    for (let attempt = 1; attempt <= SMTP_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.transporter.sendMail({
          from: env.SMTP_FROM?.trim() || env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM,
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
        });
        logger.info({ to: input.to, subject: input.subject }, 'Email sent');
        return;
      } catch (error) {
        const retrying = this.isTransient(error) && attempt < SMTP_MAX_ATTEMPTS;
        if (retrying) {
          logger.warn(
            { err: error, to: input.to, subject: input.subject, attempt },
            'SMTP send failed transiently; retrying',
          );
          await new Promise((resolve) => setTimeout(resolve, SMTP_RETRY_DELAY_MS));
        } else {
          logger.error(
            { err: error, to: input.to, subject: input.subject, attempt },
            'Failed to send email',
          );
          break;
        }
      }
    }
    throw new Error('Failed to send email. Please try again.');
  }

  private isTransient(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === 'string' && SMTP_TRANSIENT_ERROR_CODES.has(code)) {
        return true;
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return /greeting never received|unexpected socket close|socket hang up|connection (closed|reset|refused)|mail server not ready|socket closed/i.test(
      message,
    );
  }

  private logInDevelopment(input: SendEmailInput): void {
    logger.info(
      {
        to: input.to,
        subject: input.subject,
        preview: this.extractLink(input.text) ?? input.text.slice(0, 200),
      },
      '[dev] Email generated (SMTP not configured)',
    );
  }

  private extractLink(text: string): string | null {
    const match = /https?:\/\/[^\s]+/.exec(text);
    return match ? match[0] : null;
  }

  sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    return this.send({
      to,
      subject: 'Verify your LongevIQ account',
      text: [
        'Welcome to LongevIQ!',
        '',
        'Please verify your email address to activate your account:',
        verificationUrl,
        '',
        'This link expires in 24 hours.',
      ].join('\n'),
      html: [
        '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">',
        '<h2>Welcome to LongevIQ</h2>',
        '<p>Please verify your email address to activate your account.</p>',
        `<p><a href="${verificationUrl}" style="background:#6366f1;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Verify email</a></p>`,
        `<p style="font-size:12px;color:#666">This link expires in 24 hours. If the button does not work, copy this URL: <br/><a href="${verificationUrl}">${verificationUrl}</a></p>`,
        '</div>',
      ].join(''),
    });
  }
}
