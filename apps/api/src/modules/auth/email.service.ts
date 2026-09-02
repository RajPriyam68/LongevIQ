import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

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
    this.smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_PORT);
    this.transporter = this.smtpConfigured
      ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth:
            env.SMTP_USER && env.SMTP_PASS
              ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
              : undefined,
        })
      : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logInDevelopment(input);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      logger.info({ to: input.to, subject: input.subject }, 'Email sent');
    } catch (error) {
      logger.error({ error, to: input.to }, 'Failed to send email');
      throw new Error('Failed to send email. Please try again.');
    }
  }

  private logInDevelopment(input: SendEmailInput): void {
    if (env.NODE_ENV !== 'production') {
      logger.info(
        {
          to: input.to,
          subject: input.subject,
          preview: this.extractLink(input.text) ?? input.text.slice(0, 200),
        },
        '[dev] Email generated (SMTP not configured)',
      );
    } else {
      logger.warn({ to: input.to }, 'SMTP not configured; email not delivered');
    }
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
