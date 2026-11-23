import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { EnvironmentVariables } from '../config/env.validation.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends email through the clinic's Gmail (MAIL_USER + a Gmail app password).
 * If those aren't set, nothing is sent: the message is written to the server log instead,
 * which is enough for local development and early testing on staging.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const user = config.get('MAIL_USER', { infer: true });
    const pass = config.get('MAIL_APP_PASSWORD', { infer: true });
    this.from =
      config.get('MAIL_FROM', { infer: true }) ||
      user ||
      'OCULA <no-reply@ocula.local>';
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.transporter);
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not configured (MAIL_USER / MAIL_APP_PASSWORD). Would send to ${message.to}: ` +
          `"${message.subject}"\n${message.text}`,
      );
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
